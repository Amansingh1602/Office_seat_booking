import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { bookingAPI } from '../services/api';
import { formatDate, isWorkingDayForBatch, canBookFloatingSeat, getWeekNumber } from '../utils/dateHelpers';
import {
  Calendar, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock,
  ArrowLeft, Armchair, Users, DoorOpen, Eye, EyeOff,
} from 'lucide-react';
import { addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, format, isToday as isTodayFn } from 'date-fns';

const WeekView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedDay, setExpandedDay] = useState(null);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [releaseSuccess, setReleaseSuccess] = useState('');

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => { fetchWeekSchedule(); }, [currentWeek]);

  const fetchWeekSchedule = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await bookingAPI.getWeekSchedule(formatDate(weekStart), formatDate(weekEnd));
      setSchedule(res.data);
    } catch { setError('Failed to load schedule'); }
    finally { setLoading(false); }
  };

  const getDaySchedule = (date) => {
    const ds = formatDate(date);
    return schedule.find(s => formatDate(new Date(s.date)) === ds);
  };

  const getBatchInOffice = (date) => {
    const wk = getWeekNumber(date);
    const dow = date.getDay();
    const md = dow === 0 ? 7 : dow;
    if (wk === 1 && md >= 1 && md <= 3) return 1;
    if (wk === 2 && md >= 4 && md <= 5) return 2;
    return null;
  };

  const handleRelease = async (date) => {
    try {
      setReleaseLoading(true);
      await bookingAPI.releaseDesignatedSeat(formatDate(date));
      setReleaseSuccess(`Seat released for ${format(date, 'EEE, MMM d')}`);
      await fetchWeekSchedule();
      setTimeout(() => setReleaseSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to release seat');
    } finally { setReleaseLoading(false); }
  };

  const toggleDay = (idx) => setExpandedDay(expandedDay === idx ? null : idx);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => window.history.back()} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft size={22} /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Week Allocation</h1>
          <p className="text-sm text-gray-500">Seat assignments for the week</p>
        </div>
      </div>

      {/* Week nav */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft size={22} /></button>
          <div className="text-center">
            <p className="text-base font-semibold text-gray-900">
              {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Week {getWeekNumber(weekStart)} · Batch {user?.batch} · Squad {user?.squad}
            </p>
          </div>
          <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight size={22} /></button>
        </div>
        <div className="flex justify-center mt-3">
          <button onClick={() => setCurrentWeek(new Date())} className="px-4 py-1.5 bg-gray-100 text-sm text-gray-700 rounded-lg hover:bg-gray-200">This Week</button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      {releaseSuccess && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2"><CheckCircle size={16} />{releaseSuccess}</div>}

      {/* Day cards */}
      <div className="space-y-3">
        {weekDays.map((day, idx) => {
          const daySchedule = getDaySchedule(day);
          const isWorkDay = isWorkingDayForBatch(day, user?.batch);
          const batchInOffice = getBatchInOffice(day);
          const today = isTodayFn(day);
          const canFloat = canBookFloatingSeat(day);
          const allocations = daySchedule?.allocations || [];
          const expanded = expandedDay === idx;
          const isPast = day < new Date(new Date().setHours(0,0,0,0));

          return (
            <div key={idx} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all
              ${isWorkDay ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-gray-300'}
              ${today ? 'ring-2 ring-blue-200' : ''}`}>
              
              {/* Day header row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-[48px]">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">{format(day, 'EEE')}</p>
                  <p className={`text-xl font-bold ${today ? 'text-blue-600' : 'text-gray-900'}`}>{format(day, 'd')}</p>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {today && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded-full">Today</span>}
                    {batchInOffice ? (
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${batchInOffice === user?.batch ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        Batch {batchInOffice}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gray-50 text-gray-400">No batch</span>
                    )}
                    <span className="text-[10px] text-gray-400">{allocations.length} booked</span>
                  </div>

                  {/* My booking summary */}
                  {daySchedule?.myBooking ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Armchair size={13} className="text-blue-600" />
                      <span className="text-sm font-semibold text-blue-900">{daySchedule.myBooking.seat?.seatNumber}</span>
                      <span className="text-xs text-blue-500">{daySchedule.myBooking.bookingType}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">
                      {isPast ? 'Past' : isWorkDay ? 'No booking yet' : canFloat ? 'Floating available' : 'Opens 3 PM prev day'}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Release seat button */}
                  {isWorkDay && !daySchedule?.myBooking && !isPast && (
                    <button onClick={() => handleRelease(day)} disabled={releaseLoading}
                      className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors" title="Release your designated seat">
                      <DoorOpen size={18} />
                    </button>
                  )}
                  {/* Book button */}
                  {!daySchedule?.myBooking && !isPast && (isWorkDay || canFloat) && (
                    <button onClick={() => navigate('/book')}
                      className="px-3 py-1.5 bg-blue-500 text-white text-xs font-semibold rounded-lg hover:bg-blue-600">
                      Book
                    </button>
                  )}
                  {/* Expand to see allocations */}
                  <button onClick={() => toggleDay(idx)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors" title="View allocations">
                    {expanded ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Expanded allocations */}
              {expanded && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  {allocations.length === 0 ? (
                    <p className="text-sm text-gray-400 py-3 text-center">No bookings for this day</p>
                  ) : (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Users size={14} className="text-gray-400" />
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Seat Allocations ({allocations.length})</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {allocations.map((a, i) => {
                          const isMe = a.userId?.toString() === user?.id;
                          return (
                            <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg text-sm ${isMe ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                a.seatType === 'floating' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {a.seatNumber}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium truncate ${isMe ? 'text-blue-800' : 'text-gray-800'}`}>
                                  {isMe ? 'You' : a.userName}
                                </p>
                                <p className="text-[10px] text-gray-400">
                                  {a.bookingType} · {a.startTime && `${a.startTime}–${a.endTime}`}
                                  {a.squad && ` · Sq ${a.squad}`}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info cards */}
      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Your Schedule (Batch {user?.batch})</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
              <CheckCircle className="text-emerald-600" size={18} />
              <div><p className="text-sm font-medium text-emerald-900">Week 1</p><p className="text-xs text-emerald-700">Monday – Wednesday</p></div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <XCircle className="text-gray-400" size={18} />
              <div><p className="text-sm font-medium text-gray-700">Week 2</p><p className="text-xs text-gray-500">Thursday – Friday</p></div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Booking Rules</h3>
          <ul className="space-y-2 text-xs text-gray-600">
            <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" /><span>Designated seats can be booked <strong>anytime</strong></span></li>
            <li className="flex items-start gap-2"><Clock size={14} className="text-amber-500 mt-0.5 flex-shrink-0" /><span>Floating seats → book after <strong>3 PM</strong> previous day</span></li>
            <li className="flex items-start gap-2"><DoorOpen size={14} className="text-blue-500 mt-0.5 flex-shrink-0" /><span>Release your seat if not coming so others can use it</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WeekView;
