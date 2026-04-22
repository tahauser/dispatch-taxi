import { format, parseISO, isToday, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr + 'T12:00:00'), 'EEEE d MMMM yyyy', { locale: fr });
  } catch {
    return dateStr;
  }
}

export function formatTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  try {
    return format(parseISO(isoStr), 'HH:mm', { locale: fr });
  } catch {
    return '—';
  }
}

export function formatDateTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  try {
    return format(parseISO(isoStr), 'd MMM HH:mm', { locale: fr });
  } catch {
    return '—';
  }
}

export function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function isTodayDate(dateStr: string): boolean {
  try {
    return isToday(parseISO(dateStr + 'T12:00:00'));
  } catch {
    return false;
  }
}

export function timeAgo(isoStr: string): string {
  try {
    return formatDistanceToNow(parseISO(isoStr), { locale: fr, addSuffix: true });
  } catch {
    return '—';
  }
}
