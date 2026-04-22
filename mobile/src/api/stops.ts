import { api } from './client';
import { Stop } from '../types/api';

export async function skipStop(id: string): Promise<Stop> {
  return api.post<Stop>(`/stops/${id}/skip`);
}

export async function updateStop(
  id: string,
  patch: { rayon_geofence_m?: number; notes?: string; ordre?: number },
): Promise<Stop> {
  return api.patch<Stop>(`/stops/${id}`, patch);
}

// arriveStop exposé en Mobile M2 — GPS tracking
