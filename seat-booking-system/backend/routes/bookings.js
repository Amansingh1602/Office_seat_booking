const express = require('express');
const router = express.Router();
const {
  getAvailableSeats,
  bookSeat,
  cancelBooking,
  releaseDesignatedSeat,
  getMyBookings,
  getWeekSchedule
} = require('../controllers/bookingController');
const { auth } = require('../middleware/auth');

router.get('/available/:date', auth, getAvailableSeats);
router.get('/my-bookings', auth, getMyBookings);
router.get('/schedule', auth, getWeekSchedule);
router.post('/book', auth, bookSeat);
router.post('/release', auth, releaseDesignatedSeat);
router.delete('/:bookingId', auth, cancelBooking);

module.exports = router;
