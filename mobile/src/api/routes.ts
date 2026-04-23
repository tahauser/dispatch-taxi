import { api } from './client';
import { Route } from '../types/api';

// Path exact : /routes/me/route-du-jour (monté sous /api/routes)
export async function getRouteDuJour(): Promise<Route | null> {
  return api.get<Route | null>('/routes/me/route-du-jour');
}

export async function getRoute(id: string): Promise<Route> {
  return api.get<Route>(`/routes/${id}`);
}

export async function startRoute(id: string): Promise<Route> {
  return api.post<Route>(`/routes/${id}/start`);
}

export async function completeRoute(id: string): Promise<Route> {
  return api.post<Route>(`/routes/${id}/complete`);
}
