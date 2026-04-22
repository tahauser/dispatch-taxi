# API Reference — Mobile Chauffeur (Dispatch Taxi)

> Document généré à partir du code source réel (`backend/src/`).  
> Toutes les valeurs sont factuelles — aucune hypothèse.  
> Date de génération : 2026-04-22

---

## 1. Base URLs

| Environnement | URL |
|---|---|
| **Développement local** | `http://localhost:3001/api` |
| **VM Azure (accès direct)** | `http://40.85.221.73:3001/api` |

> **Note** : aucun reverse proxy (nginx/apache) ni domaine personnalisé n'est configuré dans le dépôt.  
> Le port 3001 est exposé directement par le processus PM2 `dispatch-api`.  
> Si un reverse proxy est ajouté en prod, adapter l'URL de base côté mobile.

---

## 2. Authentification

### Mécanisme
JWT (JSON Web Token) — **stateless**, pas de session serveur.

### Endpoint de login
```
POST /api/auth/login
```

### Payload login
```json
{
  "email": "string",
  "mot_de_passe": "string"
}
```

### Réponse login — succès `200`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "chauffeur": {
    "id": "uuid",
    "numero_chauffeur": "string",
    "nom": "string",
    "prenom": "string",
    "email": "string",
    "role": "chauffeur | dispatch | admin",
    "type_vehicule": "string"
  }
}
```

> **Champs absents du login** : `telephone`, `adresse_domicile`, `actif`. Pour les obtenir, appeler `GET /api/auth/me` après login.

### Réponse login — échec

| Condition | Code | Body |
|---|---|---|
| Email ou mot de passe manquant | `400` | `{ "message": "Email et mot de passe requis" }` |
| Email inexistant ou compte inactif (`actif = FALSE`) | `401` | `{ "message": "Email ou mot de passe incorrect" }` |
| Mot de passe incorrect | `401` | `{ "message": "Email ou mot de passe incorrect" }` |
| Erreur serveur | `500` | `{ "message": "Erreur serveur" }` |

### Transmission du token
Toutes les requêtes authentifiées doivent inclure le header :
```
Authorization: Bearer <jwt_token>
```

### Durée de validité
- Valeur par défaut : **`24h`**
- Configurable via la variable d'environnement `JWT_EXPIRES_IN` sur le serveur
- Source : `backend/src/routes/auth.js` — `jwt.sign(..., { expiresIn: process.env.JWT_EXPIRES_IN || '24h' })`

### Payload JWT décodé (claims)
```json
{
  "id": "uuid",
  "numero_chauffeur": "string",
  "role": "chauffeur | dispatch | admin",
  "nom": "string",
  "prenom": "string",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Refresh token
**N'existe pas.** Aucun mécanisme de refresh. Quand le token expire, l'API retourne `401` — l'app doit re-logger l'utilisateur.

### Logout
**Pas d'endpoint de logout.** Stateless JWT : le logout se fait uniquement côté client (supprimer le token du stockage local).

### Changement de mot de passe
```
PUT /api/auth/mot-de-passe
Authorization: Bearer <token>
```
```json
{
  "ancien_mdp": "string",
  "nouveau_mdp": "string"
}
```
> ⚠️ **Attention** : les champs s'appellent `ancien_mdp` et `nouveau_mdp` (pas `ancien_mot_de_passe` / `nouveau_mot_de_passe` comme indiqué dans l'ancien API.md).  
> Source : `backend/src/routes/auth.js` ligne 55.

Réponse `200` : `{ "message": "Mot de passe mis a jour" }`  
Contrainte : `nouveau_mdp` doit faire ≥ 8 caractères.

---

## 3. Endpoints mobile-critical

> Convention d'erreur commune à tous les endpoints : `{ "message": "string" }` en français.

---

### a. Login chauffeur

```
POST /api/auth/login
Auth : non requise
```

**Body :**
```json
{ "email": "string", "mot_de_passe": "string" }
```

**Réponse `200` :**
```json
{
  "token": "string (JWT)",
  "chauffeur": {
    "id": "string (UUID)",
    "numero_chauffeur": "string",
    "nom": "string",
    "prenom": "string",
    "email": "string",
    "role": "chauffeur | dispatch | admin",
    "type_vehicule": "string"
  }
}
```

**Erreurs :** `400`, `401`, `500` — voir section 2.

---

### b. Logout

**N'existe pas côté serveur.** Supprimer le token localement (AsyncStorage / SecureStore).

---

### c. Profil du chauffeur authentifié

```
GET /api/auth/me
Auth : Bearer token requis
```

**Réponse `200` :**
```json
{
  "id": "string (UUID)",
  "numero_chauffeur": "string",
  "nom": "string",
  "prenom": "string",
  "email": "string",
  "role": "chauffeur | dispatch | admin",
  "telephone": "string | null",
  "adresse_domicile": "string",
  "type_vehicule": "string",
  "actif": true
}
```

**Erreurs :**
| Code | Message |
|---|---|
| `401` | `Token manquant ou invalide` / `Token expire ou invalide` |
| `404` | `Chauffeur non trouve` |
| `500` | `Erreur serveur` |

---

### d. Route du jour du chauffeur authentifié

```
GET /api/routes/me/route-du-jour
Auth : Bearer token requis
Rôle : chauffeur uniquement (403 si dispatch/admin)
```

**Logique :** retourne la route du chauffeur pour `CURRENT_DATE` (date serveur UTC). Priorité `en_cours` > `planifiee`. Une seule route retournée.

**Réponse `200` — route trouvée :**
```json
{
  "id": "string (UUID)",
  "chauffeur_id": "string (UUID)",
  "nom": "string",
  "date_planifiee": "string (DATE, ex: 2026-04-22)",
  "statut": "planifiee | en_cours | terminee | annulee",
  "heure_debut_reelle": "string (ISO 8601 avec TZ) | null",
  "heure_fin_reelle": "string (ISO 8601 avec TZ) | null",
  "created_at": "string (ISO 8601 avec TZ)",
  "updated_at": "string (ISO 8601 avec TZ)",
  "stops": [
    {
      "id": "string (UUID)",
      "route_id": "string (UUID)",
      "ordre": 1,
      "adresse": "string",
      "latitude": -90.0,
      "longitude": -180.0,
      "rayon_geofence_m": 50,
      "notes": "string | null",
      "statut": "en_attente | en_approche | arrive | skip",
      "heure_arrivee_prevue": "string (ISO 8601 avec TZ) | null",
      "heure_arrivee_reelle": "string (ISO 8601 avec TZ) | null",
      "created_at": "string (ISO 8601 avec TZ)",
      "updated_at": "string (ISO 8601 avec TZ)"
    }
  ]
}
```

**Réponse `200` — aucune route aujourd'hui :** `null`

**Erreurs :**
| Code | Message |
|---|---|
| `401` | `Token manquant ou invalide` / `Token expire ou invalide` |
| `403` | `Acces refuse` (rôle non chauffeur) |
| `500` | `Erreur serveur` |

> **Note timezone** : `date_planifiee` est une `DATE` PostgreSQL (pas d'heure). `CURRENT_DATE` est évalué en UTC côté serveur. Si le chauffeur est dans un fuseau différent, la "route du jour" peut ne pas correspondre à sa journée locale.

---

### e. Détail d'une route

```
GET /api/routes/:id
Auth : Bearer token requis
Rôle : tous (chauffeurs voient uniquement leurs propres routes)
```

**Réponse `200` :**
```json
{
  "id": "string (UUID)",
  "chauffeur_id": "string (UUID)",
  "nom": "string",
  "date_planifiee": "string (DATE)",
  "statut": "planifiee | en_cours | terminee | annulee",
  "heure_debut_reelle": "string (ISO 8601) | null",
  "heure_fin_reelle": "string (ISO 8601) | null",
  "created_at": "string (ISO 8601)",
  "updated_at": "string (ISO 8601)",
  "chauffeur_nom": "string",
  "chauffeur_prenom": "string",
  "numero_chauffeur": "string",
  "stops": [ /* même shape que route-du-jour */ ]
}
```

**Erreurs :**
| Code | Message |
|---|---|
| `401` | Token invalide/manquant |
| `403` | `Acces refuse` (chauffeur essayant d'accéder à la route d'un autre) |
| `404` | `Route non trouvée` |
| `500` | `Erreur serveur` |

---

### f. Démarrer une route

```
POST /api/routes/:id/start
Auth : Bearer token requis
Body : aucun
```

**Règles :**
- La route doit être en statut `planifiee` (sinon 404)
- Un chauffeur ne peut démarrer que ses propres routes
- Dispatch/admin peuvent démarrer n'importe quelle route

**Réponse `200` :** objet `Route` complet (sans stops) avec `statut: "en_cours"` et `heure_debut_reelle` renseignée.

**Erreurs :**
| Code | Message |
|---|---|
| `401` | Token invalide/manquant |
| `404` | `Route non trouvée ou déjà démarrée` (inclut aussi : route d'un autre chauffeur) |
| `500` | `Erreur serveur` |

---

### g. Terminer une route

```
POST /api/routes/:id/complete
Auth : Bearer token requis
Body : aucun
```

**Règles :** identiques à `/start` mais la route doit être `en_cours`.

**Réponse `200` :** objet `Route` avec `statut: "terminee"` et `heure_fin_reelle` renseignée.

**Erreurs :**
| Code | Message |
|---|---|
| `401` | Token invalide/manquant |
| `404` | `Route non trouvée ou non en cours` |
| `500` | `Erreur serveur` |

---

### h. Modifier un stop (rayon geofence / notes / ordre)

```
PATCH /api/stops/:id
Auth : Bearer token requis
```

**Body (tous les champs optionnels) :**
```json
{
  "rayon_geofence_m": 75,
  "notes": "string",
  "ordre": 2
}
```

**Contraintes :**
- `rayon_geofence_m` : entier entre 10 et 500
- `ordre` : entier ≥ 1
- Chauffeur : ne peut modifier que les stops de ses propres routes

**Réponse `200` :** objet `Stop` complet mis à jour.

**Erreurs :**
| Code | Message |
|---|---|
| `400` | `rayon_geofence_m doit être entre 10 et 500` |
| `400` | `ordre doit être un entier >= 1` |
| `400` | `Un stop avec cet ordre existe déjà sur cette route` |
| `401` | Token invalide/manquant |
| `403` | `Accès refusé` |
| `404` | `Stop non trouvé` |
| `500` | `Erreur serveur` |

---

### i. Marquer un stop comme arrivé

```
POST /api/stops/:id/arrive
Auth : Bearer token requis
```

**Body :**
```json
{
  "latitude": 45.5120,
  "longitude": -73.5615,
  "timestamp_device": "2026-04-22T08:03:42Z"
}
```

**Comportement (transaction atomique) :**
1. Vérifie que le stop existe et appartient au chauffeur
2. Met `statut = 'arrive'` et `heure_arrivee_reelle = timestamp_device`
3. Crée automatiquement un `gps_log` avec `event_type = 'stop_arrived'`

**Réponse `200` :** objet `Stop` avec `statut: "arrive"` et `heure_arrivee_reelle` renseignée.

**Erreurs :**
| Code | Message |
|---|---|
| `400` | `latitude invalide (-90..90)` |
| `400` | `longitude invalide (-180..180)` |
| `400` | `timestamp_device requis` |
| `401` | Token invalide/manquant |
| `403` | `Accès refusé` |
| `404` | `Stop non trouvé` |
| `500` | `Erreur serveur` |

> **Idempotence** : l'endpoint n'est pas idempotent. Appeler `/arrive` deux fois crée deux `gps_log` et écrase `heure_arrivee_reelle`. Gérer côté mobile (ne pas rappeler si déjà `arrive`).

---

### j. Marquer un stop comme skip

```
POST /api/stops/:id/skip
Auth : Bearer token requis
Body : aucun
```

**Réponse `200` :** objet `Stop` avec `statut: "skip"`.

**Erreurs :**
| Code | Message |
|---|---|
| `401` | Token invalide/manquant |
| `404` | `Stop non trouvé ou accès refusé` (message unique pour les deux cas) |
| `500` | `Erreur serveur` |

---

### k. Batch GPS logs

```
POST /api/gps-logs
Auth : Bearer token requis
```

**Body :**
```json
{
  "logs": [
    {
      "latitude": 45.5120,
      "longitude": -73.5615,
      "timestamp_device": "2026-04-22T08:01:00Z",
      "vitesse_kmh": 42.5,
      "precision_m": 8.0,
      "route_id": "uuid | null",
      "stop_id": "uuid | null",
      "event_type": "tracking | geofence_enter | geofence_exit | stop_arrived | manual"
    }
  ]
}
```

**Contraintes :**
- `latitude`, `longitude`, `timestamp_device` : **obligatoires** pour chaque log
- `vitesse_kmh`, `precision_m`, `route_id`, `stop_id` : optionnels (null si absent)
- `event_type` : optionnel, défaut `"tracking"`
- Maximum **500 logs** par requête
- `chauffeur_id` est injecté automatiquement depuis le token JWT (ne pas le passer dans le body)

**Réponse `201` :**
```json
{
  "message": "N log(s) enregistré(s)",
  "count": 42
}
```

**Erreurs :**
| Code | Message |
|---|---|
| `400` | `logs doit être un tableau non vide` |
| `400` | `Maximum 500 logs par requête` |
| `400` | `Log N : latitude invalide (-90..90)` |
| `400` | `Log N : longitude invalide (-180..180)` |
| `400` | `Log N : timestamp_device requis` |
| `400` | `Log N : event_type invalide. Valeurs : tracking, geofence_enter, geofence_exit, stop_arrived, manual` |
| `401` | Token invalide/manquant |
| `500` | `Erreur serveur` |

---

### l. Single GPS log

```
POST /api/gps-logs/single
Auth : Bearer token requis
```

**Body :** même shape qu'un élément du tableau `/api/gps-logs` (sans l'enveloppe `logs`).

**Réponse `201` :** objet `GpsLog` complet.

**Erreurs :** identiques au batch mais sans le préfixe `Log N :`.

---

## 4. Modèles TypeScript

> Noms de champs : **snake_case** — l'API retourne les colonnes PostgreSQL telles quelles, sans transformation camelCase.

```typescript
// Rôles possibles
type Role = 'chauffeur' | 'dispatch' | 'admin';

// Statuts d'une route
type StatutRoute = 'planifiee' | 'en_cours' | 'terminee' | 'annulee';

// Statuts d'un stop
type StatutStop = 'en_attente' | 'en_approche' | 'arrive' | 'skip';

// Types d'événement GPS
type EventType = 'tracking' | 'geofence_enter' | 'geofence_exit' | 'stop_arrived' | 'manual';

// Réponse de login (chauffeur partiel — sans telephone, adresse_domicile, actif)
interface ChauffeurLogin {
  id: string;
  numero_chauffeur: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  type_vehicule: string;
}

// Profil complet via GET /api/auth/me
interface ChauffeurProfil {
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

// Stop (tel que retourné dans routes et stops endpoints)
interface Stop {
  id: string;
  route_id: string;
  ordre: number;
  adresse: string;
  latitude: number;
  longitude: number;
  rayon_geofence_m: number;
  notes: string | null;
  statut: StatutStop;
  heure_arrivee_prevue: string | null; // ISO 8601 with TZ
  heure_arrivee_reelle: string | null; // ISO 8601 with TZ
  created_at: string;                  // ISO 8601 with TZ
  updated_at: string;                  // ISO 8601 with TZ
}

// Route (liste — via GET /api/routes)
interface RouteListItem {
  id: string;
  chauffeur_id: string;
  nom: string;
  date_planifiee: string;   // "YYYY-MM-DD"
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

// Route détail (GET /api/routes/:id et route-du-jour)
interface Route extends Omit<RouteListItem, 'nb_stops' | 'nb_arrives'> {
  numero_chauffeur?: string; // présent dans GET /:id, absent dans route-du-jour
  stops: Stop[];
}

// GPS Log (tel que retourné par GET /api/gps-logs)
interface GpsLog {
  id: string;
  chauffeur_id: string;
  route_id: string | null;
  stop_id: string | null;
  latitude: number;
  longitude: number;
  vitesse_kmh: number | null;
  precision_m: number | null;
  timestamp_device: string;  // ISO 8601 with TZ
  received_at: string;       // ISO 8601 with TZ
  event_type: EventType;
  chauffeur_nom: string;     // joint depuis table chauffeurs
  chauffeur_prenom: string;  // joint depuis table chauffeurs
}

// Payload de login
interface LoginRequest {
  email: string;
  mot_de_passe: string;
}

// Réponse de login
interface LoginResponse {
  token: string;
  chauffeur: ChauffeurLogin;
}

// Body pour POST /api/gps-logs (batch)
interface GpsLogInput {
  latitude: number;
  longitude: number;
  timestamp_device: string;   // ISO 8601
  vitesse_kmh?: number;
  precision_m?: number;
  route_id?: string;
  stop_id?: string;
  event_type?: EventType;
}

// Body pour POST /api/stops/:id/arrive
interface StopArriveRequest {
  latitude: number;
  longitude: number;
  timestamp_device: string;   // ISO 8601
}

// Shape d'erreur API (tous les endpoints)
interface ApiError {
  message: string;
}
```

---

## 5. CORS et configuration

### Configuration actuelle
Source : `backend/src/index.js` — `app.use(cors())` **sans options**.

Comportement `cors()` sans options (defaults du paquet `cors` v2.x) :

| Paramètre | Valeur |
|---|---|
| `Access-Control-Allow-Origin` | `*` (toutes origines) |
| `Access-Control-Allow-Credentials` | **non défini** (false) |
| `Access-Control-Allow-Methods` | `GET, HEAD, PUT, PATCH, POST, DELETE` |
| `Access-Control-Allow-Headers` | miroir de `Access-Control-Request-Headers` |
| `Access-Control-Max-Age` | non défini |

### Compatibilité avec une app mobile native (React Native / Expo)
**Aucun problème.** Les apps natives (non-WebView) ne sont pas soumises aux restrictions CORS — les headers CORS sont ignorés par React Native. La configuration actuelle est suffisante pour le mobile.

> Si une WebView ou une PWA doit accéder à l'API depuis un domaine spécifique, il faudra restreindre l'origine dans `backend/src/index.js` :
> ```javascript
> app.use(cors({ origin: 'https://mon-domaine.com', credentials: true }));
> ```

---

## 6. Format standard des erreurs

### Shape JSON
Tous les endpoints retournent les erreurs sous la même forme :
```json
{ "message": "string" }
```

### Convention codes HTTP

| Code | Usage |
|---|---|
| `200` | Succès (GET, PATCH, PUT, POST sans création) |
| `201` | Création réussie (POST routes, stops/arrive, gps-logs) |
| `400` | Validation échouée (champ manquant, valeur hors plage) |
| `401` | Token absent, expiré ou invalide |
| `403` | Authentifié mais rôle insuffisant (`Acces refuse`) |
| `404` | Ressource inexistante ou accès refusé (certains endpoints fusionnent les deux) |
| `500` | Erreur serveur interne |

### Langue des messages
**Français** — tous les messages d'erreur sont en français (quelques-uns avec des accents manquants : `"Acces refuse"`, `"Route non trouvée"`, etc.).

---

## 7. Points d'attention pour le mobile

### Endpoints à mettre en cache localement

| Endpoint | Raison |
|---|---|
| `GET /api/routes/me/route-du-jour` | Appel au démarrage de l'app — mettre en cache et actualiser toutes les N minutes |
| `GET /api/routes/:id` | Détail complet avec stops — cacher pour mode hors-ligne |

### Idempotence

| Endpoint | Idempotent ? | Recommandation |
|---|---|---|
| `POST /api/stops/:id/arrive` | **Non** | Vérifier `stop.statut === 'arrive'` avant d'appeler |
| `POST /api/stops/:id/skip` | Oui (SET fixe) | Appel répété sans effet DB |
| `POST /api/gps-logs` | **Non** | Chaque appel insère de nouveaux enregistrements — ne pas rejouer un batch déjà envoyé |
| `POST /api/routes/:id/start` | Oui (filtre `AND statut = 'planifiee'`) | Double appel retourne `404` sans corruption de données |
| `POST /api/routes/:id/complete` | Oui (filtre `AND statut = 'en_cours'`) | Idem |

### Rate limiting
**Aucun rate limiting** configuré côté serveur.

### Taille max des payloads

| Endpoint | Limite |
|---|---|
| `POST /api/gps-logs` (batch) | **500 logs par requête** (vérification applicative) |
| Autres endpoints | Limite par défaut d'Express : **100kb** pour JSON (`express.json()` sans options) |

### Stratégie GPS recommandée pour le mobile
1. Enregistrer les points GPS localement (file d'attente en mémoire ou SQLite)
2. Envoyer en batch via `POST /api/gps-logs` toutes les 30-60 secondes
3. Rejouer le batch seulement si la réponse n'est pas `201` (éviter les doublons)
4. Pour les événements critiques (`stop_arrived`, `geofence_enter/exit`), envoyer via `POST /api/gps-logs/single` immédiatement

### Timezone
Le serveur utilise `CURRENT_DATE` (UTC) pour `/me/route-du-jour`. Si les chauffeurs sont dans un fuseau UTC-N, la route peut ne pas apparaître avant N heures du matin UTC. À gérer en configurant le fuseau PostgreSQL ou en passant la date client dans une future version.

---

## Annexe — Surprises et divergences

| # | Élément | Attendu (PR 1 spec) | Réel (code) |
|---|---|---|---|
| 1 | Champ mot de passe (changement) | `ancien_mot_de_passe` / `nouveau_mot_de_passe` | `ancien_mdp` / `nouveau_mdp` — **mismatch** avec l'ancien API.md |
| 2 | Path route-du-jour | `/api/me/route-du-jour` | `/api/routes/me/route-du-jour` — monté sous le router `/api/routes` |
| 3 | `numero_chauffeur` sur route | Non documenté dans PR 1 | Présent dans `GET /api/routes/:id` (`JOIN chauffeurs`) mais **absent** de `route-du-jour` |
| 4 | Statut stop `en_approche` | Documenté dans le schéma DB | Aucun endpoint ne le set — réservé pour usage futur (mobile peut le définir localement) |
| 5 | Logout endpoint | Non prévu | Inexistant — JWT stateless, logout côté client uniquement |
| 6 | Refresh token | Non prévu | Inexistant — re-login nécessaire à expiration |
| 7 | `received_at` vs `created_at` sur gps_logs | — | `gps_logs` utilise `received_at` (pas `created_at`) pour l'horodatage serveur |
| 8 | `chauffeur_id` dans gps_log body | — | **Ne pas passer** dans le body — injecté automatiquement depuis `req.user.id` (token) |
