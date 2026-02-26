const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Seat = require('../models/Seat');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/seat-booking';

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Connected');

    // Clear existing data
    await User.deleteMany({});
    await Seat.deleteMany({});
    console.log('Cleared existing data');

    // Create demo users
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password', salt);

    const users = [];
    
    // Create admin user
    users.push({
      name: 'Admin User',
      email: 'admin@wissen.com',
      password: hashedPassword,
      employeeId: 'WISADM001',
      batch: 1,
      squad: 1,
      role: 'admin'
    });

    // Create batch 1 users (5 squads × 8 members = 40 users)
    let userNum = 1;
    for (let squad = 1; squad <= 5; squad++) {
      for (let i = 1; i <= 8; i++) {
        users.push({
          name: `Batch1 Squad${squad} User${i}`,
          email: `b1s${squad}u${i}@wissen.com`,
          password: hashedPassword,
          employeeId: `WISB1S${squad}U${i.toString().padStart(2, '0')}`,
          batch: 1,
          squad: squad,
          role: 'employee'
        });
        userNum++;
      }
    }

    // Create batch 2 users (5 squads × 8 members = 40 users)
    for (let squad = 1; squad <= 5; squad++) {
      for (let i = 1; i <= 8; i++) {
        users.push({
          name: `Batch2 Squad${squad} User${i}`,
          email: `b2s${squad}u${i}@wissen.com`,
          password: hashedPassword,
          employeeId: `WISB2S${squad}U${i.toString().padStart(2, '0')}`,
          batch: 2,
          squad: squad,
          role: 'employee'
        });
        userNum++;
      }
    }

    // Create special demo users for easy login
    users.push({
      name: 'Batch 1 Demo',
      email: 'batch1@wissen.com',
      password: hashedPassword,
      employeeId: 'WISB1DEMO',
      batch: 1,
      squad: 1,
      role: 'employee'
    });

    users.push({
      name: 'Batch 2 Demo',
      email: 'batch2@wissen.com',
      password: hashedPassword,
      employeeId: 'WISB2DEMO',
      batch: 2,
      squad: 1,
      role: 'employee'
    });

    const createdUsers = await User.insertMany(users);
    console.log(`Created ${createdUsers.length} users`);

    // Create seats
    const seats = [];
    
    // Create 40 designated seats (20 for each batch, 4 per squad)
    let seatNum = 1;
    for (let batch = 1; batch <= 2; batch++) {
      for (let squad = 1; squad <= 5; squad++) {
        for (let i = 1; i <= 4; i++) {
          // Find a user from this batch and squad
          const userForSeat = createdUsers.find(u => 
            u.batch === batch && 
            u.squad === squad && 
            !u.designatedSeat &&
            u.role === 'employee'
          );

          seats.push({
            seatNumber: `D${seatNum.toString().padStart(3, '0')}`,
            type: 'designated',
            squad: squad,
            batch: batch,
            status: 'available',
            designatedFor: userForSeat ? userForSeat._id : null
          });

          if (userForSeat) {
            userForSeat.designatedSeat = seats[seats.length - 1]._id;
          }

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

    const createdSeats = await Seat.insertMany(seats);
    console.log(`Created ${createdSeats.length} seats`);

    // Update users with their designated seats
    for (const seat of createdSeats) {
      if (seat.designatedFor) {
        await User.findByIdAndUpdate(seat.designatedFor, {
          designatedSeat: seat._id
        });
      }
    }
    console.log('Updated users with designated seats');

    console.log('\n=== Demo Accounts ===');
    console.log('Admin: admin@wissen.com / password');
    console.log('Batch 1: batch1@wissen.com / password');
    console.log('Batch 2: batch2@wissen.com / password');
    console.log('=====================\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
