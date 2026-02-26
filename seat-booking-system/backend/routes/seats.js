const express = require('express');
const router = express.Router();
const {
  initializeSeats,
  assignDesignatedSeats,
  getAllSeats,
  getSeatsByDate,
  getSeatStats
} = require('../controllers/seatController');
const { auth, adminOnly } = require('../middleware/auth');

router.post('/initialize', auth, adminOnly, initializeSeats);
router.post('/assign', auth, adminOnly, assignDesignatedSeats);
router.get('/', auth, getAllSeats);
router.get('/stats', auth, getSeatStats);
router.get('/date/:date', auth, getSeatsByDate);

module.exports = router;
