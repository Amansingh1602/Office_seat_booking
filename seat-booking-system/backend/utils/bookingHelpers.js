const moment = require('moment');

// Check if a date is in Week 1 or Week 2
function getWeekNumber(date) {
  const startOfMonth = moment(date).startOf('month');
  const weekNumber = moment(date).diff(startOfMonth, 'weeks') + 1;
  return weekNumber % 2 === 0 ? 2 : 1;
}

// Check if a day is working day for a batch
// Week 1: Mon-Wed (1-3) -> Batch 1
// Week 2: Thu-Fri (4-5) -> Batch 2
function isWorkingDayForBatch(date, batch) {
  const dayOfWeek = moment(date).isoWeekday(); // 1=Monday, 7=Sunday
  const weekNum = getWeekNumber(date);
  
  if (weekNum === 1) {
    // Week 1: Mon-Wed for Batch 1
    return batch === 1 && dayOfWeek >= 1 && dayOfWeek <= 3;
  } else {
    // Week 2: Thu-Fri for Batch 2
    return batch === 2 && dayOfWeek >= 4 && dayOfWeek <= 5;
  }
}

// Check if floating seat can be booked
// Same-day: allowed anytime (for non-working day employees who want a buffer seat)
// Future day: allowed after 3 PM the previous day
function canBookFloatingSeat(targetDate) {
  const now = moment();
  const target = moment(targetDate).startOf('day');
  const today = moment().startOf('day');
  
  // Cannot book for past dates
  if (target.isBefore(today)) {
    return false;
  }
  
  // Same-day floating booking is always allowed
  if (target.isSame(today, 'day')) {
    return true;
  }
  
  // Future day: after 3 PM the previous day
  const yesterday = moment(target).subtract(1, 'day');
  const cutoffTime = moment(yesterday).set({ hour: 15, minute: 0, second: 0 });
  
  return now.isSameOrAfter(cutoffTime);
}

// Get available booking window message
function getBookingWindowMessage(targetDate) {
  const target = moment(targetDate).startOf('day');
  const yesterday = moment(target).subtract(1, 'day').format('MMM DD');
  return `Floating seats can be booked after 3:00 PM on ${yesterday}`;
}

// Get week schedule for a date range
function getWeekSchedule(startDate, endDate) {
  const schedule = [];
  let current = moment(startDate);
  const end = moment(endDate);
  
  while (current.isSameOrBefore(end)) {
    const weekNum = getWeekNumber(current);
    const dayOfWeek = current.isoWeekday();
    
    let batchInOffice = null;
    if (weekNum === 1 && dayOfWeek >= 1 && dayOfWeek <= 3) {
      batchInOffice = 1;
    } else if (weekNum === 2 && dayOfWeek >= 4 && dayOfWeek <= 5) {
      batchInOffice = 2;
    }
    
    schedule.push({
      date: current.format('YYYY-MM-DD'),
      dayName: current.format('dddd'),
      weekNumber: weekNum,
      batchInOffice: batchInOffice,
      isWorkingDay: batchInOffice !== null
    });
    
    current.add(1, 'day');
  }
  
  return schedule;
}

// Get current buffer seat count (base + released)
async function getAvailableFloatingSeats(Seat, date) {
  const baseFloatingSeats = await Seat.countDocuments({ 
    type: 'floating', 
    status: 'available'
  });
  
  const releasedSeats = await Seat.countDocuments({
    type: 'designated',
    status: 'released',
    releaseDate: { $lte: new Date(date) }
  });
  
  return baseFloatingSeats + releasedSeats;
}

// Check if a date falls within the allowed 2-week booking window
function isWithinBookingWindow(targetDate) {
  const now = moment().startOf('day');
  const target = moment(targetDate).startOf('day');
  const maxDate = moment().startOf('day').add(14, 'days');

  // Cannot book in the past
  if (target.isBefore(now)) {
    return { allowed: false, message: 'Cannot book for past dates' };
  }

  // Cannot book beyond 2 weeks
  if (target.isAfter(maxDate)) {
    return { allowed: false, message: 'Bookings are only allowed for the next 2 weeks (14 days)' };
  }

  return { allowed: true };
}

module.exports = {
  getWeekNumber,
  isWorkingDayForBatch,
  canBookFloatingSeat,
  isWithinBookingWindow,
  getBookingWindowMessage,
  getWeekSchedule,
  getAvailableFloatingSeats
};
