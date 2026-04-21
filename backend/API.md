# API Backend — Dispatch Taxi

Base URL : `http://localhost:3001/api`  
Auth : `Authorization: Bearer <jwt_token>` (sauf mention contraire)

---

## Auth

### `POST /api/auth/login`
Login chauffeur/dispatch/admin.
```json
{ "email": "chauffeur@example.com", "mot_de_passe": "secret" }
```
Réponse `200` : `{ "token": "eyJ...", "chauffeur": { "id", "nom", "role", ... } }`

### `GET /api/auth/me`
Profil du chauffeur authentifié.

### `PUT /api/auth/mot-de-passe`
```json
{ "ancien_mot_de_passe": "...", "nouveau_mot_de_passe": "..." }
```

---

## Routes multi-stops

### `GET /api/routes`
Liste des routes. Chauffeurs : uniquement les leurs.
| Param | Type | Description |
|---|---|---|
| `chauffeur_id` | UUID | Filtre (dispatch/admin seulement) |
| `date` | DATE | Filtre par date planifiée |
| `statut` | string | `planifiee` / `en_cours` / `terminee` / `annulee` |

Réponse `200` : tableau de routes avec `nb_stops` et `nb_arrives`.

### `GET /api/routes/:id`
Détail d'une route avec ses stops ordonnés.
```json
{
  "id": "uuid",
  "nom": "Tournée matin 21/04",
  "date_planifiee": "2026-04-21",
  "statut": "planifiee",
  "chauffeur_nom": "Tremblay",
  "stops": [
    {
      "id": "uuid",
      "ordre": 1,
      "adresse": "1000 Rue Saint-Denis, Montréal",
      "latitude": 45.5120,
      "longitude": -73.5615,
      "rayon_geofence_m": 75,
      "statut": "en_attente",
      "heure_arrivee_prevue": "2026-04-21T08:00:00Z"
    }
  ]
}
```

### `POST /api/routes` _(dispatch/admin)_
Crée une route avec ses stops en transaction atomique.
```json
{
  "chauffeur_id": "uuid",
  "nom": "Tournée matin 21/04",
  "date_planifiee": "2026-04-21",
  "stops": [
    {
      "ordre": 1,
      "adresse": "1000 Rue Saint-Denis, Montréal",
      "latitude": 45.5120,
      "longitude": -73.5615,
      "rayon_geofence_m": 75,
      "notes": "Appeler à l'arrivée",
      "heure_arrivee_prevue": "2026-04-21T08:00:00Z"
    }
  ]
}
```
Réponse `201` : route créée avec ses stops.

### `PATCH /api/routes/:id` _(dispatch/admin)_
Modifie `nom`, `date_planifiee` ou `statut`. Tous les champs sont optionnels.
```json
{ "statut": "annulee" }
```

### `DELETE /api/routes/:id` _(dispatch/admin)_
Supprime la route et tous ses stops (CASCADE).

### `POST /api/routes/:id/start`
Démarre une route (`planifiee` → `en_cours`). Enregistre `heure_debut_reelle`.  
Chauffeur : seulement ses propres routes. Dispatch/admin : toutes.

### `POST /api/routes/:id/complete`
Termine une route (`en_cours` → `terminee`). Enregistre `heure_fin_reelle`.

### `GET /api/routes/me/route-du-jour` _(chauffeur uniquement)_
Retourne la route du jour du chauffeur authentifié (`en_cours` en priorité, sinon `planifiee`), avec ses stops.  
Retourne `null` si aucune route ce jour.

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/routes/me/route-du-jour
```

---

## Stops

### `PATCH /api/stops/:id`
Modifie `rayon_geofence_m` (10..500), `notes` ou `ordre`.
```json
{ "rayon_geofence_m": 100, "notes": "Interphone code 1234" }
```

### `POST /api/stops/:id/arrive`
Marque un stop comme arrivé. Crée automatiquement un `gps_log` de type `stop_arrived`.
```json
{
  "latitude": 45.5120,
  "longitude": -73.5615,
  "timestamp_device": "2026-04-21T08:03:42Z"
}
```
Réponse `200` : stop mis à jour avec `statut: "arrive"` et `heure_arrivee_reelle`.

### `POST /api/stops/:id/skip`
Marque un stop comme skippé (`statut: "skip"`).

---

## GPS Logs

### `POST /api/gps-logs`
Batch insert de points GPS (max 500 par requête). Optimisé pour l'envoi mobile groupé.
```json
{
  "logs": [
    {
      "latitude": 45.5120,
      "longitude": -73.5615,
      "timestamp_device": "2026-04-21T08:01:00Z",
      "vitesse_kmh": 42.5,
      "precision_m": 8.0,
      "route_id": "uuid-optionnel",
      "event_type": "tracking"
    }
  ]
}
```
`event_type` : `tracking` | `geofence_enter` | `geofence_exit` | `stop_arrived` | `manual`  
Réponse `201` : `{ "message": "N log(s) enregistré(s)", "count": N }`

### `POST /api/gps-logs/single`
Insert d'un seul point GPS. Même payload qu'un élément du tableau ci-dessus.

### `GET /api/gps-logs`
Historique GPS.
| Param | Type | Description |
|---|---|---|
| `chauffeur_id` | UUID | Filtre (dispatch/admin seulement) |
| `route_id` | UUID | Filtre par route |
| `date_debut` | timestamp | Borne basse |
| `date_fin` | timestamp | Borne haute |
| `event_type` | string | Filtre par type d'événement |
| `limit` | int | Nb max de résultats (défaut 200, max 1000) |

---

## Commandes de test (curl)

```bash
export TOKEN="eyJ..."
export BASE="http://localhost:3001/api"

# Santé
curl $BASE/health

# Créer une route avec stops
curl -X POST $BASE/routes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chauffeur_id": "uuid-chauffeur",
    "nom": "Tournée test",
    "date_planifiee": "2026-04-22",
    "stops": [
      {"ordre":1,"adresse":"1000 St-Denis Montréal","latitude":45.512,"longitude":-73.561,"rayon_geofence_m":75},
      {"ordre":2,"adresse":"CHUM 1051 Sanguinet","latitude":45.510,"longitude":-73.560}
    ]
  }'

# Route du jour (chauffeur)
curl -H "Authorization: Bearer $TOKEN" $BASE/routes/me/route-du-jour

# Démarrer une route
curl -X POST $BASE/routes/<route_id>/start \
  -H "Authorization: Bearer $TOKEN"

# Marquer un stop arrivé
curl -X POST $BASE/stops/<stop_id>/arrive \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"latitude":45.510,"longitude":-73.560,"timestamp_device":"2026-04-21T09:15:00Z"}'

# Batch GPS logs
curl -X POST $BASE/gps-logs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"logs":[{"latitude":45.512,"longitude":-73.561,"timestamp_device":"2026-04-21T09:00:00Z","event_type":"tracking"}]}'
```

---

## Appliquer la migration

**En local :**
```bash
psql -U dispatch_user -d dispatch_taxi -f backend/migrations/20260421_add_routes_stops_gps_logs.sql
```

**En production (VM Azure) :**
```bash
cd /home/azureuser/app/backend
psql -U dispatch_user -d dispatch_taxi -h localhost -f migrations/20260421_add_routes_stops_gps_logs.sql
```

Ou via variable d'environnement si `DATABASE_URL` est définie :
```bash
npm run migrate
```
