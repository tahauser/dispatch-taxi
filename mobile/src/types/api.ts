// Types alignés sur backend/API-REFERENCE-MOBILE.md §4
// snake_case conservé — l'API retourne les colonnes PostgreSQL sans transformation

export type Role = 'chauffeur' | 'dispatch' | 'admin';
export type StatutRoute = 'planifiee' | 'en_cours' | 'terminee' | 'annulee';
export type StatutStop = 'en_attente' | 'en_approche' | 'arrive' | 'skip';
export type EventType =
  | 'tracking'
  | 'geofence_enter'
  | 'geofence_exit'
  | 'stop_arrived'
  | 'manual';

export interface ChauffeurLogin {
  id: string;
  numero_chauffeur: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  type_vehicule: string;
}

export interface ChauffeurProfil {
  id: string;
  numero_chauffeur: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  telephone: string | null;
  adresse_domicile: string;
  type_vehicule: string;
  actif: boolean;
}

export interface Stop {
  id: string;
  route_id: string;
  ordre: number;
  adresse: string;
  latitude: number;
  longitude: number;
  rayon_geofence_m: number;
  notes: string | null;
  statut: StatutStop;
  heure_arrivee_prevue: string | null;
  heure_arrivee_reelle: string | null;
  created_at: string;
  updated_at: string;
}

export interface RouteListItem {
  id: string;
  chauffeur_id: string;
  nom: string;
  date_planifiee: string;
  statut: StatutRoute;
  heure_debut_reelle: string | null;
  heure_fin_reelle: string | null;
  created_at: string;
  updated_at: string;
  chauffeur_nom: string;
  chauffeur_prenom: string;
  nb_stops: number;
  nb_arrives: number;
}

export interface Route {
  id: string;
  chauffeur_id: string;
  nom: string;
  date_planifiee: string;
  statut: StatutRoute;
  heure_debut_reelle: string | null;
  heure_fin_reelle: string | null;
  created_at: string;
  updated_at: string;
  chauffeur_nom?: string;
  chauffeur_prenom?: string;
  numero_chauffeur?: string;
  stops: Stop[];
}

export interface GpsLog {
  id: string;
  chauffeur_id: string;
  route_id: string | null;
  stop_id: string | null;
  latitude: number;
  longitude: number;
  vitesse_kmh: number | null;
  precision_m: number | null;
  timestamp_device: string;
  received_at: string;
  event_type: EventType;
  chauffeur_nom: string;
  chauffeur_prenom: string;
}

export interface LoginPayload {
  email: string;
  mot_de_passe: string;
}

export interface LoginResponse {
  token: string;
  chauffeur: ChauffeurLogin;
}

export interface GpsLogInput {
  latitude: number;
  longitude: number;
  timestamp_device: string;
  vitesse_kmh?: number;
  precision_m?: number;
  route_id?: string;
  stop_id?: string;
  event_type?: EventType;
}

export interface StopArriveRequest {
  latitude: number;
  longitude: number;
  timestamp_device: string;
}

export interface ApiError {
  message: string;
}
