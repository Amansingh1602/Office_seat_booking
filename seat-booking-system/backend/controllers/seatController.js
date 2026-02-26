const Seat = require('../models/Seat');
const User = require('../models/User');

// Initialize seats (admin only)
const initializeSeats = async (req, res) => {
  try {
    // Clear existing seats
    await Seat.deleteMany({});
    
    const seats = [];
    
    // Create 40 designated seats (20 for each batch, 4 per squad)
    let seatNum = 1;
    for (let batch = 1; batch <= 2; batch++) {
      for (let squad = 1; squad <= 5; squad++) {
        for (let i = 1; i <= 4; i++) {
          seats.push({
            seatNumber: `D${seatNum.toString().padStart(3, '0')}`,
            type: 'designated',
            squad: squad,
            batch: batch,
            status: 'available'
          });
          seatNum++;
        }
      }
    }
    
    // Create 10 floating seats
    for (let i = 1; i <= 10; i++) {
      seats.push({
        seatNumber: `F${i.toString().padStart(3, '0')}`,
        type: 'floating',
        status: 'available'
      });
    }
    
    await Seat.insertMany(seats);
    
    res.json({ message: 'Seats initialized successfully', count: seats.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Assign designated seats to users (admin only)
const assignDesignatedSeats = async (req, res) => {
  try {
    const users = await User.find({ designatedSeat: null });
    
    for (const user of users) {
      const availableSeat = await Seat.findOne({
        type: 'designated',
        batch: user.batch,
        squad: user.squad,
        designatedFor: null
      });
      
      if (availableSeat) {
        availableSeat.designatedFor = user._id;
        await availableSeat.save();
        
        user.designatedSeat = availableSeat._id;
        await user.save();
      }
    }
    
    res.json({ message: 'Designated seats assigned successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all seats
const getAllSeats = async (req, res) => {
  try {
    const seats = await Seat.find()
      .populate('designatedFor', 'name email employeeId')
      .populate('releasedBy', 'name email');
    res.json(seats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get seats by date
const getSeatsByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const targetDate = new Date(date);
    
    // Get all seats
    const allSeats = await Seat.find()
      .populate('designatedFor', 'name email employeeId batch squad')
      .populate('releasedBy', 'name email');
    
    // Get active bookings for this date
    const Booking = require('../models/Booking');
    const activeBookings = await Booking.find({
      date: {
        $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
        $lt: new Date(targetDate.setHours(23, 59, 59, 999))
      },
      status: 'active'
    }).populate('user', 'name email employeeId batch squad');
    
    // Map seats with booking info
    const seatsWithStatus = allSeats.map(seat => {
      const booking = activeBookings.find(b => b.seat._id.toString() === seat._id.toString());
      return {
        ...seat.toObject(),
        isBooked: !!booking,
        bookedBy: booking ? booking.user : null,
        bookingType: booking ? booking.bookingType : null
      };
    });
    
    res.json(seatsWithStatus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get seat stats
const getSeatStats = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    
    const totalSeats = await Seat.countDocuments();
    const baseFloating = await Seat.countDocuments({ type: 'floating' });
    const designatedTotal = await Seat.countDocuments({ type: 'designated' });
    
    // Per-date release tracking: count seats released for this specific date
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const Booking = require('../models/Booking');

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
    const releasedSeatsGlobal = await Seat.find({
      type: 'designated',
      status: 'released',
      releaseDate: { $gte: dayStart, $lt: dayEnd }
    });
    releasedSeatsGlobal.forEach(s => {
      releasedSeatIds.add(s._id.toString());
    });
    const releasedSeats = releasedSeatIds.size;
    
    const bookedCount = await Booking.countDocuments({
      date: { $gte: dayStart, $lt: dayEnd },
      status: 'active'
    });
    
    res.json({
      totalSeats,
      baseFloating,
      designatedTotal,
      releasedSeats,
      totalFloating: baseFloating + releasedSeats,
      booked: bookedCount,
      available: totalSeats - bookedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  initializeSeats,
  assignDesignatedSeats,
  getAllSeats,
  getSeatsByDate,
  getSeatStats
};
