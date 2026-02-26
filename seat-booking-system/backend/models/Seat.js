const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  seatNumber: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['designated', 'floating'],
    required: true
  },
  designatedFor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  squad: {
    type: Number,
    default: null,
    min: 1,
    max: 5
  },
  batch: {
    type: Number,
    default: null,
    enum: [1, 2, null]
  },
  status: {
    type: String,
    enum: ['available', 'booked', 'released'],
    default: 'available'
  },
  isTempFloating: {
    type: Boolean,
    default: false
  },
  releasedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  releaseDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Seat', seatSchema);
