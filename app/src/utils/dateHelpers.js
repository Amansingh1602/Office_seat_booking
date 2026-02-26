import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns';

export const formatDate = (date, formatStr = 'yyyy-MM-dd') => {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
};

export const formatDisplayDate = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'EEEE, MMMM do, yyyy');
};

export const getWeekRange = (date = new Date()) => {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return { start, end };
};

export const getNext14Days = (startDate = new Date()) => {
  const days = [];
  for (let i = 0; i < 14; i++) {
    days.push(addDays(startDate, i));
  }
  return days;
};

export const getWeekNumber = (date) => {
  const d = new Date(date);
  const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  const diff = d - startOfMonth;
  const weekNum = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
  return weekNum % 2 === 0 ? 2 : 1;
};

export const isWorkingDayForBatch = (date, batch) => {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const weekNum = getWeekNumber(d);
  
  const mondayBasedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
  
  if (weekNum === 1) {
    return batch === 1 && mondayBasedDay >= 1 && mondayBasedDay <= 3;
  } else {
    return batch === 2 && mondayBasedDay >= 4 && mondayBasedDay <= 5;
  }
};

export const canBookFloatingSeat = (targetDate) => {
  const now = new Date();
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Cannot book for past dates
  if (target < today) {
    return false;
  }
  
  // Same-day floating booking is always allowed
  if (target.getTime() === today.getTime()) {
    return true;
  }
  
  // Future day: after 3 PM the previous day
  const yesterday = new Date(target);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(15, 0, 0, 0);
  
  return now >= yesterday;
};

export const getBookingWindowMessage = (targetDate) => {
  const target = new Date(targetDate);
  const yesterday = new Date(target);
  yesterday.setDate(yesterday.getDate() - 1);
  
  return `Floating seats can be booked after 3:00 PM on ${format(yesterday, 'MMM dd')}`;
};

export const isWithinBookingWindow = (date) => {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 14);
  return target >= today && target <= maxDate;
};

export const getDayName = (date) => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'EEE');
};

export const getDayNumber = (date) => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'd');
};
