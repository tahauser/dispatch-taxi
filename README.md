# Dispatch Taxi

## Structure

```
dispatch-taxi/
├── backend/   — API Node.js/Express + PostgreSQL
├── frontend/  — Interface React/Vite (dispatch/admin)
└── mobile/    — (à venir) App Expo chauffeur
```

## Backend

### Démarrage

```bash
cd backend
cp .env.example .env   # configurer DB_HOST, JWT_SECRET, etc.
npm install
npm run db-init        # créer les tables de base
psql -U dispatch_user -d dispatch_taxi -f migrations/20260421_add_routes_stops_gps_logs.sql
npm run seed           # données de test
npm run dev
```

### Tables principales

| Table | Description |
|---|---|
| `chauffeurs` | Chauffeurs (auth, profil, coordonnées) |
| `trajets` | Courses ponctuelles A→B |
| `disponibilites` | Créneaux de disponibilité des chauffeurs |
| `affectations` | Assignation trajet↔chauffeur |
| `routes` | Routes multi-stops assignées à un chauffeur |
| `stops` | Points d'arrêt d'une route (géolocalisés) |
| `gps_logs` | Historique GPS envoyé par le mobile |

### Endpoints principaux

Voir [`backend/API.md`](backend/API.md) pour la documentation complète.

| Préfixe | Description |
|---|---|
| `/api/auth` | Login, profil, mot de passe |
| `/api/trajets` | Courses ponctuelles |
| `/api/chauffeurs` | Liste des chauffeurs |
| `/api/disponibilites` | Gestion des disponibilités |
| `/api/affectations` | Assignation et envoi emails |
| `/api/routes` | Routes multi-stops + `/me/route-du-jour` |
| `/api/stops` | Mise à jour stops, marquage arrivée/skip |
| `/api/gps-logs` | Logs GPS (batch et single) |

## Frontend

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173
```
