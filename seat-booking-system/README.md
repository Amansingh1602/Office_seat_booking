# Seat Booking System

A comprehensive MERN stack seat booking system for hybrid office environments. This application manages seat allocation based on batch schedules, with support for designated and floating seats, time-based booking restrictions, and week-wise calendar views.

## Features

### Core Features
- **Batch-based Scheduling**: Week 1 (Mon-Wed) for Batch 1, Week 2 (Thu-Fri) for Batch 2
- **Two Seat Types**:
  - **Designated Seats**: Fixed seats for employees, bookable anytime on working days
  - **Floating/Buffer Seats**: 10 base seats + released designated seats, bookable after 3 PM previous day
- **Time-based Booking Rules**: Floating seats open at 3 PM the day before
- **Week-wise Calendar View**: Visual schedule showing working days and bookings
- **Seat Release**: Employees can release their designated seats, making them temporarily available
- **Real-time Availability**: Dynamic seat pool that adjusts based on releases

### User Features
- User authentication with JWT
- Dashboard with booking status and statistics
- Book seats with eligibility checks
- View and manage bookings
- Week-wise schedule view
- Cancel upcoming bookings

### Admin Features
- Initialize seat inventory
- Assign designated seats to employees
- View all seats and bookings

## Tech Stack

### Backend
- **Node.js** with **Express.js**
- **MongoDB** with **Mongoose**
- **JWT** for authentication
- **bcryptjs** for password hashing

### Frontend
- **React** (JavaScript)
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **date-fns** for date manipulation
- **lucide-react** for icons

## Project Structure

```
seat-booking-system/
├── backend/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── bookingController.js
│   │   └── seatController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── Booking.js
│   │   ├── Seat.js
│   │   └── User.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── bookings.js
│   │   └── seats.js
│   ├── utils/
│   │   ├── bookingHelpers.js
│   │   └── seed.js
│   ├── .env
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Loading.jsx
│   │   │   └── Navbar.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── BookSeat.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── MyBookings.jsx
│   │   │   ├── Register.jsx
│   │   │   └── WeekView.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── utils/
│   │   │   └── dateHelpers.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables in `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/seat-booking
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
```

4. Seed the database with demo data:
```bash
node utils/seed.js
```

5. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Demo Accounts

After running the seed script, you can use these accounts:

| Email | Password | Role | Batch | Squad |
|-------|----------|------|-------|-------|
| admin@wissen.com | password | Admin | 1 | 1 |
| batch1@wissen.com | password | Employee | 1 | 1 |
| batch2@wissen.com | password | Employee | 2 | 1 |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Seats
- `GET /api/seats` - Get all seats
- `GET /api/seats/stats` - Get seat statistics
- `GET /api/seats/date/:date` - Get seats by date
- `POST /api/seats/initialize` - Initialize seats (admin)
- `POST /api/seats/assign` - Assign designated seats (admin)

### Bookings
- `GET /api/bookings/available/:date` - Get available seats for date
- `GET /api/bookings/my-bookings` - Get user's bookings
- `GET /api/bookings/schedule` - Get week schedule
- `POST /api/bookings/book` - Book a seat
- `POST /api/bookings/release` - Release designated seat
- `DELETE /api/bookings/:bookingId` - Cancel booking

## Business Logic

### Batch Schedule
- **Week 1**: Batch 1 works Monday-Wednesday
- **Week 2**: Batch 2 works Thursday-Friday

### Seat Types
1. **Designated Seats (40)**
   - 4 seats per squad (5 squads × 2 batches × 4 seats = 40)
   - Assigned to specific employees
   - Can be booked anytime on working days
   - Can be released to become temporary floating

2. **Floating Seats (10 base + dynamic)**
   - 10 permanent buffer seats
   - Plus released designated seats
   - Can only be booked after 3 PM the previous day

### Booking Rules
1. One employee can book only one seat per day
2. Designated seats: Book anytime on working days
3. Floating seats: Book after 3 PM previous day
4. Released seats become available as floating
5. Cannot book for past dates

## Key Scenarios Handled

### Scenario 1: Not My Working Day
- User is from Batch 1, today is Thursday (Batch 2's day)
- User can book a floating seat (if after 3 PM previous day)
- Buffer seats reduced by 1

### Scenario 2: My Working Day
- User can book designated seat anytime
- Can also book floating seat (with time restriction)
- Released team seats increase floating pool

### Scenario 3: Seat Release
- User releases their designated seat
- Seat becomes temporarily floating
- Available for others to book

## Screenshots

The application includes:
- Clean, modern UI with Tailwind CSS
- Responsive design for mobile and desktop
- Intuitive seat selection interface
- Week-wise calendar view
- Real-time booking status updates

## Development

### Running in Development Mode

Backend:
```bash
cd backend
npm run dev
```

Frontend:
```bash
cd frontend
npm run dev
```

### Building for Production

Frontend:
```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/`

## License

MIT License
