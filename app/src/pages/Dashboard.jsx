import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { seatAPI, bookingAPI } from '../services/api';
import { formatDate, formatDisplayDate, isWorkingDayForBatch, canBookFloatingSeat } from '../utils/dateHelpers';
import { Calendar, Users, Armchair, Clock, ArrowRight, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [todayBooking, setTodayBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const today = new Date();
  const isWorkingDay = isWorkingDayForBatch(today, user?.batch);
  const canBookFloat = canBookFloatingSeat(today);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, bookingsRes] = await Promise.all([
        seatAPI.getSeatStats(formatDate(today)),
        bookingAPI.getMyBookings(formatDate(today)),
      ]);
      
      setStats(statsRes.data);
      setTodayBooking(bookingsRes.data[0] || null);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">{formatDisplayDate(today)}</p>
      </div>

      <div className={`p-4 rounded-lg mb-6 ${isWorkingDay ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
        {isWorkingDay ? (
          <div className="flex items-center gap-3">
            <CheckCircle className="text-green-600" size={24} />
            <div>
              <p className="font-medium text-green-900">Today is your working day</p>
              <p className="text-sm text-green-700">You can book your designated seat anytime</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <AlertCircle className="text-amber-600" size={24} />
            <div>
              <p className="font-medium text-amber-900">Today is not your working day</p>
              <p className="text-sm text-amber-700">
                You can book a floating seat after 3 PM the previous day
              </p>
            </div>
          </div>
        )}
      </div>

      {todayBooking ? (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">You have a seat booked for today</p>
                <p className="text-xl font-semibold text-gray-900">
                  Seat {todayBooking.seat.seatNumber}
                </p>
                <p className="text-sm text-gray-500">
                  {todayBooking.bookingType === 'designated' ? 'Designated Seat' : 'Floating Seat'}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/my-bookings')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              View Details
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border-l-4 border-amber-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <XCircle className="text-amber-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">No seat booked for today</p>
                <p className="text-lg font-medium text-gray-900">
                  {isWorkingDay 
                    ? 'Book your designated seat now' 
                    : canBookFloat 
                      ? 'Book a floating seat'
                      : 'Floating booking opens at 3 PM yesterday'}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/book')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              disabled={!isWorkingDay && !canBookFloat}
            >
              Book Now
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <Armchair className="text-blue-600" size={24} />
              <span className="text-sm font-medium text-gray-600">Total Seats</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalSeats}</p>
            <p className="text-sm text-gray-500">Office capacity</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="text-green-600" size={24} />
              <span className="text-sm font-medium text-gray-600">Booked Today</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.booked}</p>
            <p className="text-sm text-gray-500">{stats.available} seats available</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <Armchair className="text-purple-600" size={24} />
              <span className="text-sm font-medium text-gray-600">Floating Seats</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalFloating}</p>
            <p className="text-sm text-gray-500">{stats.baseFloating} base + {stats.releasedSeats} released</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="text-amber-600" size={24} />
              <span className="text-sm font-medium text-gray-600">Your Batch</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">Batch {user?.batch}</p>
            <p className="text-sm text-gray-500">Squad {user?.squad}</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/book')}
              className="w-full flex items-center justify-between p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Armchair className="text-blue-600" size={20} />
                <div>
                  <p className="font-medium text-gray-900">Book a Seat</p>
                  <p className="text-sm text-gray-600">Reserve your seat for any day</p>
                </div>
              </div>
              <ArrowRight className="text-blue-600" size={20} />
            </button>

            <button
              onClick={() => navigate('/week-view')}
              className="w-full flex items-center justify-between p-4 rounded-lg bg-green-50 hover:bg-green-100 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Calendar className="text-green-600" size={20} />
                <div>
                  <p className="font-medium text-gray-900">Week View</p>
                  <p className="text-sm text-gray-600">See your schedule for the week</p>
                </div>
              </div>
              <ArrowRight className="text-green-600" size={20} />
            </button>

            <button
              onClick={() => navigate('/my-bookings')}
              className="w-full flex items-center justify-between p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="text-purple-600" size={20} />
                <div>
                  <p className="font-medium text-gray-900">My Bookings</p>
                  <p className="text-sm text-gray-600">Manage your reservations</p>
                </div>
              </div>
              <ArrowRight className="text-purple-600" size={20} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Schedule</h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="font-medium text-blue-900 mb-2">Batch {user?.batch} Schedule</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-gray-700">
                    <strong>Week 1:</strong> Monday - Wednesday
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                  <span className="text-gray-700">
                    <strong>Week 2:</strong> Thursday - Friday
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg">
              <p className="font-medium text-amber-900 mb-2">Booking Rules</p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">•</span>
                  Designated seats can be booked anytime
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">•</span>
                  Floating seats: Book after 3 PM previous day
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">•</span>
                  Release your seat if not coming
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
