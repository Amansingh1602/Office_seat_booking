import React, { useState, useEffect } from 'react';
import { bookingAPI } from '../services/api';
import { formatDate, formatDisplayDate, isWorkingDayForBatch } from '../utils/dateHelpers';
import { Calendar, Armchair, X, AlertCircle, CheckCircle, Clock, ArrowLeft, DoorOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const MyBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [releasingDate, setReleasingDate] = useState(null);

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await bookingAPI.getMyBookings();
      setBookings(res.data);
    } catch { setError('Failed to load bookings'); }
    finally { setLoading(false); }
  };

  const handleCancel = async (bookingId) => {
    try {
      setCancellingId(bookingId);
      setError('');
      await bookingAPI.cancelBooking(bookingId);
      setSuccess('Booking cancelled successfully');
      await fetchBookings();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel booking');
    } finally { setCancellingId(null); }
  };

  const handleRelease = async (date) => {
    try {
      setReleasingDate(date);
      setError('');
      await bookingAPI.releaseDesignatedSeat(formatDate(date));
      setSuccess('Seat released — it is now available as a floating seat for others.');
      await fetchBookings();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to release seat');
    } finally { setReleasingDate(null); }
  };

  const isUpcoming = (date) => {
    const bd = new Date(date);
    const today = new Date();
    today.setHours(0,0,0,0);
    return bd >= today;
  };

  const upcomingBookings = bookings.filter(b => isUpcoming(b.date) && b.status === 'active');
  const pastBookings = bookings.filter(b => !isUpcoming(b.date) || b.status !== 'active');

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => window.history.back()} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft size={24} /></button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600">Manage your seat reservations</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle size={20} /><span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <CheckCircle size={20} /><span>{success}</span>
        </div>
      )}

      {/* Upcoming */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock size={20} />Upcoming Bookings
          <span className="text-sm font-normal text-gray-500">({upcomingBookings.length})</span>
        </h2>

        {upcomingBookings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm text-center py-12">
            <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-600">No upcoming bookings</p>
            <p className="text-gray-500 mt-2">Book a seat to get started</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingBookings.map((booking) => {
              const isWorkDay = isWorkingDayForBatch(booking.date, user?.batch);
              return (
                <div key={booking._id}
                  className={`bg-white rounded-xl shadow-sm p-6 border-l-4 ${booking.bookingType === 'designated' ? 'border-l-blue-500' : 'border-l-green-500'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-500">{formatDisplayDate(booking.date)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Armchair size={18} className="text-blue-600" />
                        <span className="text-2xl font-bold text-gray-900">{booking.seat.seatNumber}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${booking.bookingType === 'designated' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {booking.bookingType === 'designated' ? 'Designated' : 'Floating'}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${isWorkDay ? 'bg-green-500' : 'bg-amber-500'}`} />
                      <span className="text-gray-600">{isWorkDay ? 'Your working day' : 'Extra day (floating)'}</span>
                    </div>
                    {booking.startTime && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock size={14} />
                        <span>{booking.startTime} – {booking.endTime}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {booking.bookingType === 'designated' ? (
                      /* Designated seat: cancel + release as floating in one action */
                      <button onClick={() => handleCancel(booking._id)} disabled={cancellingId === booking._id}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50 text-sm">
                        {cancellingId === booking._id ? 'Releasing…' : <><DoorOpen size={16} />Cancel &amp; Release for Others</>}
                      </button>
                    ) : (
                      /* Floating seat: simple cancel */
                      <button onClick={() => handleCancel(booking._id)} disabled={cancellingId === booking._id}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 text-sm">
                        {cancellingId === booking._id ? 'Cancelling…' : <><X size={16} />Cancel Booking</>}
                      </button>
                    )}
                    {booking.bookingType === 'designated' && (
                      <p className="text-xs text-center text-gray-500">
                        Your seat will become a floating seat for others to book
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past */}
      {pastBookings.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle size={20} />Past Bookings
            <span className="text-sm font-normal text-gray-500">({pastBookings.length})</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70">
            {pastBookings.map((booking) => (
              <div key={booking._id} className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-l-gray-300">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-500">{formatDisplayDate(booking.date)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Armchair size={18} className="text-gray-400" />
                      <span className="text-2xl font-bold text-gray-700">{booking.seat.seatNumber}</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    {booking.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-500">
                  <span>{booking.bookingType === 'designated' ? 'Designated' : 'Floating'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;
