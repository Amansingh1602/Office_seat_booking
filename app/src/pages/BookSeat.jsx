import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { bookingAPI } from '../services/api';
import {
  formatDate,
  isWorkingDayForBatch,
  canBookFloatingSeat,
  getBookingWindowMessage,
} from '../utils/dateHelpers';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  Armchair,
  MapPin,
  X,
  CalendarDays,
  Timer,
  Info,
  DoorOpen,
} from 'lucide-react';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  format,
  isSameDay,
  isToday,
  addDays,
  isBefore,
} from 'date-fns';

/* ── Time helpers ─────────────────────────────────────────── */
const TIME_SLOTS = [
  '08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','12:00','12:30','13:00','13:30',
  '14:00','14:30','15:00','15:30','16:00','16:30',
  '17:00','17:30','18:00','18:30','19:00','19:30','20:00',
];
const fmt12 = (t) => {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`;
};

/* ── Confirm Dialog ───────────────────────────────────────── */
const ConfirmDialog = ({ open, seat, date, startTime, endTime, zone, loading, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-base font-bold text-gray-900">Confirm Booking</h3>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>
        <div className="px-5 pb-4 space-y-3">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Desk</p>
                <p className="font-bold text-blue-900 text-lg">{seat?.seatNumber}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Zone</p>
                <p className="font-semibold text-blue-800">{zone}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Date</p>
                <p className="font-semibold text-blue-800">{date ? format(date, 'EEE, MMM d yyyy') : ''}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Time</p>
                <p className="font-semibold text-blue-800">{fmt12(startTime)} – {fmt12(endTime)}</p>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
            <Info size={14} className="mt-0.5 flex-shrink-0" />
            <span>One booking per day. You can cancel or release from My Bookings.</span>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-blue-200">
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <><CheckCircle size={16} />Confirm</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Release Confirm Dialog ───────────────────────────────── */
const ReleaseDialog = ({ open, date, loading, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h3 className="text-base font-bold text-gray-900">Release Your Seat</h3>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>
        <div className="px-5 pb-4">
          <p className="text-sm text-gray-600">
            Not coming on <span className="font-semibold">{date ? format(date, 'EEE, MMM d') : ''}</span>?
            Releasing your designated seat will make it available as a floating seat for others.
          </p>
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Keep Seat</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <><DoorOpen size={16} />Release</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Component ───────────────────────────────────────── */
const BookSeat = () => {
  const { user } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [allSeats, setAllSeats] = useState([]);
  const [availableSeats, setAvailableSeats] = useState([]);
  const [floatingInfo, setFloatingInfo] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isWorkingDay, setIsWorkingDay] = useState(false);
  const [canBook, setCanBook] = useState(false);
  const [canBookFloating, setCanBookFloating] = useState(false);
  const [userHasBooking, setUserHasBooking] = useState(false);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [hasReleasedOwnSeat, setHasReleasedOwnSeat] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRelease, setShowRelease] = useState(false);

  // Week navigation
  const weekStart = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const maxBookingDate = useMemo(() => addDays(today, 14), [today]);

  const goToPrevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const isDateDisabled = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return isBefore(x, today) || isBefore(maxBookingDate, x); };

  /* ── handlers ──────────────────────────────────────────── */
  const handleDateSelect = async (date) => {
    if (isDateDisabled(date)) return;
    setSelectedDate(date);
    setSelectedSeat(null);
    setError(''); setSuccess('');
    const wd = isWorkingDayForBatch(date, user?.batch);
    const fl = canBookFloatingSeat(date);
    setIsWorkingDay(wd);
    setCanBook(wd || fl);
    setCanBookFloating(fl);
    await fetchAvailableSeats(date);
  };

  const fetchAvailableSeats = async (date) => {
    try {
      setLoading(true);
      const res = await bookingAPI.getAvailableSeats(formatDate(date));
      setAvailableSeats(res.data.seats || []);
      setAllSeats(res.data.allSeats || res.data.seats || []);
      setUserHasBooking(res.data.userHasBooking);
      setCurrentBooking(res.data.currentBooking);
      setHasReleasedOwnSeat(res.data.hasReleasedOwnSeat ?? false);
      setCanBook(res.data.canBook);
      setCanBookFloating(res.data.canBookFloating ?? false);
      setFloatingInfo(res.data.floatingInfo ?? null);
    } catch (err) {
      if (err.response?.status === 403) {
        setCanBook(false);
        setError(err.response?.data?.message || 'Cannot book for this date');
      } else {
        setError(err.response?.data?.message || 'Failed to load available seats');
      }
      setAvailableSeats([]); setAllSeats([]);
    } finally { setLoading(false); }
  };

  const handleSeatClick = (seat) => {
    if (seat.isBooked || !seat.isAvailable || userHasBooking) return;
    setSelectedSeat(seat._id === selectedSeat?._id ? null : seat);
    setError(''); setSuccess('');
  };

  // Opens confirmation dialog
  const handleBookRequest = () => {
    if (!selectedSeat) return;
    if (startTime >= endTime) { setError('End time must be after start time'); return; }
    setError(''); setShowConfirm(true);
  };

  const handleBookConfirm = async () => {
    if (!selectedSeat) return;
    try {
      setBookingLoading(true); setError('');
      await bookingAPI.bookSeat(selectedSeat._id, formatDate(selectedDate), startTime, endTime);
      setSuccess('Seat booked successfully!');
      setSelectedSeat(null); setShowConfirm(false);
      await fetchAvailableSeats(selectedDate);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to book seat');
      setShowConfirm(false);
    } finally { setBookingLoading(false); }
  };

  // Release designated seat
  const handleReleaseSeat = async () => {
    try {
      setReleaseLoading(true); setError('');
      await bookingAPI.releaseDesignatedSeat(formatDate(selectedDate));
      setSuccess('Your designated seat has been released and is now available for others.');
      setShowRelease(false);
      await fetchAvailableSeats(selectedDate);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to release seat');
      setShowRelease(false);
    } finally { setReleaseLoading(false); }
  };

  // Cancel existing booking
  const handleCancelBooking = async () => {
    if (!currentBooking) return;
    try {
      setBookingLoading(true); setError('');
      await bookingAPI.cancelBooking(currentBooking._id);
      setSuccess('Booking cancelled successfully.');
      await fetchAvailableSeats(selectedDate);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel booking');
    } finally { setBookingLoading(false); }
  };

  /* ── helpers ───────────────────────────────────────────── */
  const designatedSeats = allSeats.filter(s => s.type === 'designated');
  const floatingSeats = allSeats.filter(s => s.type === 'floating');

  const getSeatColor = (seat) => {
    if (seat.bookedByCurrentUser) return 'bg-blue-500 text-white border-blue-600 ring-2 ring-blue-300';
    if (selectedSeat && selectedSeat._id === seat._id) return 'bg-blue-500 text-white border-blue-600 shadow-lg scale-105';
    if (seat.isBooked) return 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed';
    // Owner released their seat for this date – show as released (amber), not as "yours"
    if (seat.releasedByOwner) return 'bg-amber-50 text-amber-600 border-amber-300 cursor-not-allowed opacity-70';
    if (!seat.isAvailable) return 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60';
    if (seat.type === 'floating') return 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 hover:shadow-md cursor-pointer';
    if (seat.status === 'released') return 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 hover:border-amber-400 hover:shadow-md cursor-pointer';
    if (seat.designatedFor?._id === user?.id) return 'bg-blue-100 text-blue-700 border-blue-400 hover:bg-blue-200 hover:shadow-md cursor-pointer ring-1 ring-blue-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 hover:shadow-md cursor-pointer';
  };

  const getSeatZone = (seat) => {
    if (seat?.type === 'floating') return 'Flex Zone';
    if (seat?.squad) return `Squad ${seat.squad}`;
    return 'General';
  };

  const monthLabel = format(weekStart, 'MMMM yyyy');
  const endTimeOptions = TIME_SLOTS.filter(t => t > startTime);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-44">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => window.history.back()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold text-gray-900">Book a Desk</h1>
      </div>

      {/* Office Location */}
      <div className="mb-5">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Office Location</label>
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-blue-500" />
            <span className="text-sm font-medium text-gray-800">Wissen Office — Floor 1</span>
          </div>
          <ChevronRight size={16} className="text-gray-400" />
        </div>
      </div>

      {/* Calendar Week View */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={goToPrevWeek} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} className="text-gray-600" /></button>
          <span className="text-sm font-semibold text-gray-800">{monthLabel}</span>
          <button onClick={goToNextWeek} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronRight size={18} className="text-gray-600" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['MON','TUE','WED','THU','FRI','SAT','SUN'].map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-gray-400 tracking-wider">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((date) => {
            const sel = selectedDate && isSameDay(date, selectedDate);
            const dis = isDateDisabled(date);
            const tod = isToday(date);
            const wd = isWorkingDayForBatch(date, user?.batch);
            return (
              <button key={date.toISOString()} onClick={() => handleDateSelect(date)} disabled={dis}
                className={`relative flex flex-col items-center py-2.5 rounded-xl transition-all text-sm font-semibold
                  ${sel ? 'bg-blue-500 text-white shadow-md shadow-blue-200'
                    : tod ? 'bg-blue-50 text-blue-600'
                    : dis ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-50'}`}>
                <span>{format(date, 'd')}</span>
                {wd && !sel && <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-emerald-400" />}
                {wd && sel && <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-white" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Banner */}
      {selectedDate && (
        <div className="mb-5">
          {userHasBooking && currentBooking ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-800">Booked for {format(selectedDate, 'MMM d')}</p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Seat {currentBooking.seat?.seatNumber || currentBooking.seat} · {currentBooking.bookingType}
                    {currentBooking.startTime && ` · ${fmt12(currentBooking.startTime)} – ${fmt12(currentBooking.endTime)}`}
                  </p>
                </div>
              </div>
              <button onClick={handleCancelBooking} disabled={bookingLoading}
                className={`mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium disabled:opacity-50 ${
                  currentBooking.bookingType === 'designated'
                    ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                    : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                }`}>
                {currentBooking.bookingType === 'designated'
                  ? <><DoorOpen size={14} />{bookingLoading ? 'Releasing…' : 'Cancel & Release for Others'}</>
                  : <><X size={14} />{bookingLoading ? 'Cancelling…' : 'Cancel This Booking'}</>}
              </button>
              {currentBooking.bookingType === 'designated' && (
                <p className="text-xs text-center text-gray-500 mt-1">Your seat will become a floating seat for others</p>
              )}
            </div>
          ) : isWorkingDay && hasReleasedOwnSeat ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
              <div className="flex items-center gap-3">
                <DoorOpen size={20} className="text-amber-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">Seat Released for {format(selectedDate, 'MMM d')}</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Your designated seat is now available as a floating seat for others.
                    {canBookFloating ? ' You can still book a different floating seat.' : ''}
                    {floatingInfo && ` (${floatingInfo.available} of ${floatingInfo.total} floater seats free)`}
                  </p>
                </div>
              </div>
            </div>
          ) : isWorkingDay ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-800">Your Working Day</p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Designated seat bookable anytime{canBookFloating
                      ? ` · ${floatingInfo ? `${floatingInfo.available} of ${floatingInfo.total} floater seats free` : 'Floating seats available'}`
                      : ' · Floating opens after 3 PM previous day'}
                  </p>
                </div>
              </div>
              {/* Release seat button */}
              <button onClick={() => setShowRelease(true)}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100">
                <DoorOpen size={14} />Not coming? Release your seat
              </button>
            </div>
          ) : canBook ? (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3.5">
              <Clock size={20} className="text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Floating Seats Available</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Book a floating or released seat
                  {floatingInfo && ` (${floatingInfo.available} of ${floatingInfo.total} free)`}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
              <AlertCircle size={20} className="text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Not Available Yet</p>
                <p className="text-xs text-amber-600 mt-0.5">{getBookingWindowMessage(selectedDate)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error / Success */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-5 text-sm text-red-700">
          <AlertCircle size={16} /><span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-5 text-sm text-emerald-700">
          <CheckCircle size={16} /><span>{success}</span>
        </div>
      )}

      {/* Time Selection */}
      {selectedDate && canBook && !userHasBooking && !loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4"><Timer size={16} />Select Time Slot</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">From</label>
              <select value={startTime}
                onChange={(e) => { setStartTime(e.target.value); if (e.target.value >= endTime) { const i = TIME_SLOTS.indexOf(e.target.value); setEndTime(TIME_SLOTS[Math.min(i + 2, TIME_SLOTS.length - 1)]); }}}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
                {TIME_SLOTS.slice(0, -1).map(t => <option key={t} value={t}>{fmt12(t)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">To</label>
              <select value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
                {endTimeOptions.map(t => <option key={t} value={t}>{fmt12(t)}</option>)}
              </select>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Duration: {(() => { const [sh,sm]=startTime.split(':').map(Number); const [eh,em]=endTime.split(':').map(Number); const m=(eh*60+em)-(sh*60+sm); const h=Math.floor(m/60); const r=m%60; return `${h}h${r>0?` ${r}m`:''}`; })()}</p>
        </div>
      )}

      {/* Floor Plan */}
      {selectedDate && canBook && !loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800">Floor Plan</h3>
            <div className="flex items-center gap-1.5 text-gray-400"><Search size={14} /><span className="text-xs">Tap a seat to select</span></div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex justify-between mb-4">
              <div className="bg-gray-200 text-gray-500 text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg">Elevator</div>
              <div className="bg-gray-200 text-gray-500 text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg">Kitchen</div>
            </div>

            {/* Designated */}
            {designatedSeats.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Designated Desks <span className="text-emerald-500">(book anytime)</span></p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {designatedSeats.map(seat => (
                    <button key={seat._id} onClick={() => handleSeatClick(seat)} disabled={seat.isBooked || !seat.isAvailable || userHasBooking}
                      className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border-2 transition-all text-xs font-bold ${getSeatColor(seat)}`}>
                      <span>{seat.seatNumber}</span>
                      {seat.designatedFor?._id === user?.id && !seat.releasedByOwner && <span className="text-[9px] font-medium opacity-70 mt-0.5">Mine</span>}
                      {seat.releasedByOwner && <span className="text-[9px] font-medium opacity-70 mt-0.5">Released</span>}
                      {seat.isBooked && !seat.bookedByCurrentUser && <Armchair size={10} className="mt-0.5 opacity-50" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Floating */}
            {floatingSeats.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Floating Desks <span className="text-amber-500">(after 3 PM prev day)</span>
                  </p>
                  {floatingInfo && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                      {floatingInfo.available}/{floatingInfo.total} free
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {floatingSeats.map(seat => (
                    <button key={seat._id} onClick={() => handleSeatClick(seat)} disabled={seat.isBooked || !seat.isAvailable || userHasBooking}
                      className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border-2 transition-all text-xs font-bold ${getSeatColor(seat)}`}>
                      <span>{seat.seatNumber}</span>
                      {seat.isBooked && !seat.bookedByCurrentUser && <Armchair size={10} className="mt-0.5 opacity-50" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {allSeats.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Armchair size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No seats to display</p>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-emerald-100 border-2 border-emerald-300" />Available</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-gray-200 border-2 border-gray-300" />Occupied</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-blue-500 border-2 border-blue-600" />Selected</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-blue-100 border-2 border-blue-400" />My Desk</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-amber-100 border-2 border-amber-300" />Released</div>
          </div>
        </div>
      )}

      {/* Loading */}
      {selectedDate && loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 mb-5 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      )}

      {/* Placeholder */}
      {!selectedDate && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-14">
          <CalendarDays size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">Select a date to view the floor plan</p>
          <p className="text-xs text-gray-400 mt-1">Choose from the calendar above</p>
        </div>
      )}

      {/* Sticky Bottom Bar */}
      {selectedSeat && !userHasBooking && (
        <div className="fixed bottom-0 left-0 right-0 z-30">
          <div className="max-w-2xl mx-auto px-4 pb-4">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Selected Desk</p>
                  <p className="text-lg font-bold text-gray-900">
                    Desk {selectedSeat.seatNumber}
                    <span className="text-sm font-normal text-gray-500 ml-1">/ {format(selectedDate, 'd MMM')}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Time</p>
                  <p className="text-sm font-semibold text-gray-700">{fmt12(startTime)} – {fmt12(endTime)}</p>
                </div>
              </div>
              <button onClick={handleBookRequest} disabled={bookingLoading}
                className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 shadow-sm shadow-blue-200">
                <Armchair size={18} />Review & Book
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ConfirmDialog open={showConfirm} seat={selectedSeat} date={selectedDate} startTime={startTime} endTime={endTime}
        zone={getSeatZone(selectedSeat)} loading={bookingLoading} onConfirm={handleBookConfirm} onCancel={() => setShowConfirm(false)} />
      <ReleaseDialog open={showRelease} date={selectedDate} loading={releaseLoading}
        onConfirm={handleReleaseSeat} onCancel={() => setShowRelease(false)} />
    </div>
  );
};

export default BookSeat;
