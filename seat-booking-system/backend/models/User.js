const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  batch: {
    type: Number,
    required: true,
    enum: [1, 2]
  },
  squad: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  designatedSeat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seat',
    default: null
  },
  role: {
    type: String,
    enum: ['employee', 'admin'],
    default: 'employee'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
