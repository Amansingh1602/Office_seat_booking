const Booking = require('../models/Booking');
const Seat = require('../models/Seat');
const User = require('../models/User');
const {
  isWorkingDayForBatch,
  canBookFloatingSeat,
  getBookingWindowMessage,
  isWithinBookingWindow
} = require('../utils/bookingHelpers');

// Helper: get start and end of day without mutating original date
function getDayRange(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Get available seats for a date
const getAvailableSeats = async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user.id;
    const targetDate = new Date(date);
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Enforce 2-week booking window
    const windowCheck = isWithinBookingWindow(targetDate);
    if (!windowCheck.allowed) {
      return res.status(403).json({ message: windowCheck.message, canBook: false });
    }
    
    const isWorkingDay = isWorkingDayForBatch(targetDate, user.batch);
    
    // Get all seats
    const allSeats = await Seat.find()
      .populate('designatedFor', 'name email employeeId');
    
    // Get active bookings for this date
    const { start: dayStart, end: dayEnd } = getDayRange(targetDate);
    const activeBookings = await Booking.find({
      date: { $gte: dayStart, $lt: dayEnd },
      status: 'active'
    }).populate('seat');
    
    const bookedSeatIds = activeBookings.map(b => b.seat._id ? b.seat._id.toString() : b.seat.toString());
    const userBooking = activeBookings.find(b => b.user.toString() === userId);
    
    // Check if user has cancelled/released their OWN designated seat for this date
    // This prevents the seat from auto-reappearing as available after cancel
    let hasReleasedOwnSeat = false;
    if (user.designatedSeat) {
      const ownSeatId = user.designatedSeat.toString();
      // Only flag as released if user does NOT currently have an active booking for their own seat
      const hasActiveOwnBooking = userBooking &&
        (userBooking.seat._id ? userBooking.seat._id.toString() : userBooking.seat.toString()) === ownSeatId;
      
      if (!hasActiveOwnBooking) {
        const cancelledOwnSeat = await Booking.findOne({
          user: userId,
          seat: user.designatedSeat,
          date: { $gte: dayStart, $lt: dayEnd },
          status: 'cancelled'
        });
        hasReleasedOwnSeat = !!cancelledOwnSeat;
      }
    }
    
    // Open booking: any seat not already booked is available (booking window enforced elsewhere)
    const availableSeats = allSeats.filter(seat => !bookedSeatIds.includes(seat._id.toString()));
    
    // Get all seats with booking status for floor plan
    const allSeatsWithStatus = allSeats.map(seat => {
      const isBooked = bookedSeatIds.includes(seat._id.toString());
      const isAvailable = availableSeats.some(s => s._id.toString() === seat._id.toString());
      const isOwnSeat = seat.type === 'designated' && seat.designatedFor?._id.toString() === userId;
      return {
        ...seat.toObject(),
        isBooked,
        isAvailable,
        bookedByCurrentUser: userBooking ? (userBooking.seat._id ? userBooking.seat._id.toString() : userBooking.seat.toString()) === seat._id.toString() : false,
        // Mark if this is the owner's seat and they released it for this date
        releasedByOwner: isOwnSeat && hasReleasedOwnSeat
      };
    });
    
    // Count floating seats info (including released designated seats acting as floaters)
    const baseFloatingSeats = allSeats.filter(s => s.type === 'floating');
    const baseFloatingCount = baseFloatingSeats.length;

    // Find designated seats effectively released for this specific date
    // Method 1: Cancelled designated bookings by owner for this date
    const cancelledOwnerBookings = await Booking.find({
      date: { $gte: dayStart, $lt: dayEnd },
      status: 'cancelled',
      bookingType: 'designated'
    });
    const releasedSeatIds = new Set();
    cancelledOwnerBookings.forEach(b => {
      releasedSeatIds.add(b.seat.toString());
    });
    // Method 2: Seats with global 'released' status whose releaseDate matches this date
    allSeats.forEach(s => {
      if (s.type === 'designated' && s.status === 'released' && s.releaseDate) {
        const rd = new Date(s.releaseDate);
        if (rd >= dayStart && rd < dayEnd) {
          releasedSeatIds.add(s._id.toString());
        }
      }
    });

    const releasedCount = releasedSeatIds.size;
    const effectiveTotalFloating = baseFloatingCount + releasedCount;

    // Count booked seats in the effective floating pool
    const bookedBaseFloating = activeBookings.filter(b => {
      const seatObj = b.seat;
      return seatObj && seatObj.type === 'floating';
    }).length;
    const bookedReleasedFloating = activeBookings.filter(b => {
      const seatId = b.seat._id ? b.seat._id.toString() : b.seat.toString();
      return releasedSeatIds.has(seatId);
    }).length;
    const totalBookedFloating = bookedBaseFloating + bookedReleasedFloating;
    const availableFloatingCount = effectiveTotalFloating - totalBookedFloating;

    res.json({
      seats: availableSeats,
      allSeats: allSeatsWithStatus,
      isWorkingDay,
      canBook: true,
      canBookFloating: true,
      floatingInfo: {
        total: effectiveTotalFloating,
        booked: totalBookedFloating,
        available: availableFloatingCount,
        baseFloating: baseFloatingCount,
        released: releasedCount
      },
      userHasBooking: !!userBooking,
      currentBooking: userBooking || null,
      hasReleasedOwnSeat
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Book a seat
const bookSeat = async (req, res) => {
  try {
    const { seatId, date, startTime, endTime } = req.body;
    const userId = req.user.id;
    const targetDate = new Date(date);
    // Normalize to midnight to avoid duplicate key issues
    targetDate.setHours(0, 0, 0, 0);
    
    // Validate time selection
    const bookingStartTime = startTime || '09:00';
    const bookingEndTime = endTime || '18:00';
    
    if (bookingStartTime >= bookingEndTime) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }
    
    const user = await User.findById(userId);
    const seat = await Seat.findById(seatId);
    
    if (!seat) {
      return res.status(404).json({ message: 'Seat not found' });
    }

    // Enforce 2-week booking window
    const windowCheck = isWithinBookingWindow(targetDate);
    if (!windowCheck.allowed) {
      return res.status(403).json({ message: windowCheck.message });
    }
    
    // Check if user already has a booking for this date
    const { start: dayStart, end: dayEnd } = getDayRange(targetDate);
    const existingBooking = await Booking.findOne({
      user: userId,
      date: { $gte: dayStart, $lt: dayEnd },
      status: 'active'
    });
    
    if (existingBooking) {
      return res.status(400).json({ message: 'You already have a booking for this date' });
    }
    
    // Check if seat is already booked
    const seatBooked = await Booking.findOne({
      seat: seatId,
      date: { $gte: dayStart, $lt: dayEnd },
      status: 'active'
    });
    
    if (seatBooked) {
      return res.status(400).json({ message: 'Seat is already booked' });
    }
    
    // Open booking: any unbooked seat can be booked (booking window already enforced)
    // Keep one-booking-per-day protection above.
    const isOwnSeat = seat.type === 'designated' && seat.designatedFor?.toString() === userId;
    let bookingType = 'floating';
    if (seat.type === 'designated' && isOwnSeat) {
      bookingType = 'designated';
    }
    
    // Create booking
    const booking = new Booking({
      user: userId,
      seat: seatId,
      date: targetDate,
      bookingType,
      startTime: bookingStartTime,
      endTime: bookingEndTime
    });
    
    await booking.save();
    
    // Update seat status if it was released
    if (seat.status === 'released') {
      seat.status = 'available';
      seat.isTempFloating = false;
      seat.releasedBy = null;
      seat.releaseDate = null;
      await seat.save();
    }
    
    await booking.populate('seat');
    await booking.populate('user', 'name email employeeId');
    
    res.status(201).json({
      message: 'Seat booked successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cancel/Release a booking
const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;
    
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Check if user owns this booking
    if (booking.user.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Update booking status
    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    await booking.save();
    
    // If this was a designated seat booking, release the seat as floating
    // so others can book it for that day
    const seat = await Seat.findById(booking.seat);
    if (seat && seat.type === 'designated') {
      const bookingDate = new Date(booking.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      // Only release for today or future dates
      if (bookingDate >= today) {
        seat.status = 'released';
        seat.isTempFloating = true;
        seat.releasedBy = booking.user;
        seat.releaseDate = bookingDate;
        await seat.save();
      }
    }
    
    res.json({
      message: booking.bookingType === 'designated'
        ? 'Booking cancelled — your seat is now available as a floating seat for others.'
        : 'Booking cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Release designated seat (make it temporarily available as floating)
const releaseDesignatedSeat = async (req, res) => {
  try {
    const { date } = req.body;
    const userId = req.user.id;
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const user = await User.findById(userId);
    
    if (!user.designatedSeat) {
      return res.status(400).json({ message: 'You do not have a designated seat' });
    }
    
    const seat = await Seat.findById(user.designatedSeat);
    
    if (!seat) {
      return res.status(404).json({ message: 'Seat not found' });
    }
    
    // If the user already has a booking for this seat on this date, cancel it first
    const { start: relDayStart, end: relDayEnd } = getDayRange(targetDate);
    const existingBooking = await Booking.findOne({
      seat: seat._id,
      date: { $gte: relDayStart, $lt: relDayEnd },
      status: 'active'
    });
    
    if (existingBooking) {
      // Only the seat owner (or admin) can release
      if (existingBooking.user.toString() !== userId) {
        return res.status(403).json({ message: 'Seat is booked by someone else for this date' });
      }
      // Cancel the existing booking
      existingBooking.status = 'cancelled';
      existingBooking.cancelledAt = new Date();
      await existingBooking.save();
    }
    
    // Mark seat as released → appears as a floating seat for others
    seat.status = 'released';
    seat.isTempFloating = true;
    seat.releasedBy = userId;
    seat.releaseDate = targetDate;
    await seat.save();
    
    res.json({
      message: existingBooking
        ? 'Booking cancelled and seat released — it is now available as a floating seat for others.'
        : 'Seat released successfully — it is now available as a floating seat.',
      seat
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get my bookings
const getMyBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;
    
    let query = { user: userId };
    
    if (date) {
      const { start: qDayStart, end: qDayEnd } = getDayRange(new Date(date));
      query.date = { $gte: qDayStart, $lt: qDayEnd };
    }
    
    const bookings = await Booking.find(query)
      .populate('seat')
      .sort({ date: -1 });
    
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get week schedule with full allocations
const getWeekSchedule = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const user = req.user;
    
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
    
    const schedule = [];
    let current = new Date(start);
    
    while (current <= end) {
      const isWorkingDay = isWorkingDayForBatch(current, user.batch);
      
      // Get bookings for this date
      const { start: schDayStart, end: schDayEnd } = getDayRange(current);
      const bookings = await Booking.find({
        date: { $gte: schDayStart, $lt: schDayEnd },
        status: 'active'
      }).populate('seat').populate('user', 'name email employeeId batch squad');
      
      const myBooking = bookings.find(b => b.user._id.toString() === user.id);
      
      // Build allocation list (seat → user mapping)
      const allocations = bookings.map(b => ({
        seatNumber: b.seat?.seatNumber,
        seatType: b.seat?.type,
        userName: b.user?.name,
        userId: b.user?._id,
        batch: b.user?.batch,
        squad: b.user?.squad,
        bookingType: b.bookingType,
        startTime: b.startTime,
        endTime: b.endTime,
        bookingId: b._id
      }));
      
      schedule.push({
        date: new Date(current),
        isWorkingDay,
        myBooking: myBooking || null,
        totalBookings: bookings.length,
        canBookFloating: canBookFloatingSeat(current),
        allocations
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAvailableSeats,
  bookSeat,
  cancelBooking,
  releaseDesignatedSeat,
  getMyBookings,
  getWeekSchedule
};
