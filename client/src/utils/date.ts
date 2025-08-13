import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const formatDate = (date: Date | string, formatString = 'PPP'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatString);
};

export const formatDateTime = (date: Date | string): string => {
  return formatDate(date, 'PPpp');
};

export const formatRelativeTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
};