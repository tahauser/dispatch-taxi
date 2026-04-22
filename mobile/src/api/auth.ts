import { api } from './client';
import { ChauffeurProfil, LoginPayload, LoginResponse } from '../types/api';

export async function login(email: string, mot_de_passe: string): Promise<LoginResponse> {
  const payload: LoginPayload = { email, mot_de_passe };
  return api.post<LoginResponse>('/auth/login', payload);
}

export async function me(): Promise<ChauffeurProfil> {
  return api.get<ChauffeurProfil>('/auth/me');
}

// Noms exacts du payload (divergence documentée dans API-REFERENCE-MOBILE.md §Annexe)
export async function changePassword(
  ancien_mdp: string,
  nouveau_mdp: string,
): Promise<{ message: string }> {
  return api.post<{ message: string }>('/auth/mot-de-passe', { ancien_mdp, nouveau_mdp });
}
