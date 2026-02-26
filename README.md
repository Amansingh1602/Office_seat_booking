# Office Seat Booking

Mono workspace containing a Vite React frontend and a Node/Express + MongoDB backend for office seat booking.

## Structure
- `app/` – Vite React frontend
- `seat-booking-system/backend/` – Express API + MongoDB
- `seat-booking-system/frontend/` – Tailwind config (legacy scaffold)

## Requirements
- Node.js 20+
- MongoDB running locally or accessible via connection string

## Backend setup (API)
```bash
cd seat-booking-system/backend
npm install
# create .env
cat > .env <<'EOF'
MONGODB_URI=mongodb://localhost:27017/seat-booking
JWT_SECRET=replace-me
PORT=5000
EOF
npm run dev
```
API will listen on `http://localhost:5000`.

## Frontend setup (web)
```bash
cd app
npm install
# set API base
setx VITE_API_URL "http://localhost:5000"
# or create .env.local with VITE_API_URL=http://localhost:5000
npm run dev
```
Frontend runs at `http://localhost:3000` by default.

## Key scripts
- Frontend: `npm run dev`, `npm run build`, `npm run preview`
- Backend: `npm run dev`, `npm start` (production)

## Features
- Book any unbooked seat; own designated seat marked as designated booking type
- Floating seat window logic (3 PM previous day) retained for eligibility data
- Release designated seat to make it temporarily available to others
- One booking per user per day enforced

## Notes
- `.gitignore` excludes node modules, builds, env files, logs, and editor cruft.
- Update `VITE_API_URL` to point to the API host when deploying.
