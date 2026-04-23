import { api } from './client';
import { GpsLog, GpsLogInput } from '../types/api';

export async function postGpsLogs(logs: GpsLogInput[]): Promise<{ count: number }> {
  return api.post<{ count: number }>('/gps-logs', { logs });
}

export async function postGpsLog(log: GpsLogInput): Promise<GpsLog> {
  return api.post<GpsLog>('/gps-logs/single', log);
}
