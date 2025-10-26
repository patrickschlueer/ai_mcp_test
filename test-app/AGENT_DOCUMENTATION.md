# 📚 test-app Code Documentation für AI Agents

## 🎯 Projekt-Übersicht

**test-app** ist eine einfache Full-Stack Applikation mit Angular Frontend und Node.js Backend.

**WICHTIG:** Dies ist eine **Demo-Applikation** mit eingeschränkter Funktionalität. Viele Features sind nur Platzhalter oder simuliert.

---

## 🏗️ Architektur

```
test-app/
├── frontend/          # Angular 17 App
│   └── src/
│       └── app/
│           ├── app.component.ts       # Haupt-Component
│           ├── user.service.ts        # User API Service
│           └── auth.service.ts        # Auth Service (Platzhalter)
│
└── backend/           # Node.js Express Server
    ├── server.js      # API Server
    └── models/
        └── user.js    # User Model & In-Memory DB
```

---

## ⚠️ WICHTIGE EINSCHRÄNKUNGEN (Agents müssen das wissen!)

### 1. **Keine echte Datenbank**
- Backend nutzt **In-Memory Arrays** - keine MongoDB, PostgreSQL etc.
- Daten werden beim Server-Neustart gelöscht
- Keine Persistenz vorhanden

### 2. **Keine echte Authentifizierung**
- **KEIN JWT, KEIN OAuth, KEINE Session-Verwaltung**
- `AuthService` ist nur ein **Platzhalter** mit `isLoggedIn = true`
- Jeder kann alles sehen/ändern - keine Sicherheit

### 3. **"Rollen" sind nur Text-Labels**
- User haben ein `role` Feld (String: "Admin", "User", "Guest")
- **KEINE Rechte-Prüfung** basierend auf Rollen
- **KEIN Rollenkonzept** implementiert
- **KEINE Role-Based Access Control (RBAC)**
- Rollen sind **rein kosmetisch** und haben **keine Auswirkungen**

### 4. **Keine Validierung**
- Backend validiert KEINE Eingaben
- Frontend hat minimale Validierung
- SQL-Injection, XSS etc. sind möglich

### 5. **Keine Tests**
- Keine Unit Tests
- Keine Integration Tests
- Keine E2E Tests

---

## 📁 Backend Dokumentation

### `backend/server.js`

**Purpose:** Einfacher Express API Server

**Endpoints:**

```javascript
GET    /api/users           # Alle User abrufen
GET    /api/users/:id       # Einen User abrufen
POST   /api/users           # Neuen User erstellen
PUT    /api/users/:id       # User aktualisieren
DELETE /api/users/:id       # User löschen
```

**Features:**
- ✅ CORS aktiviert
- ✅ JSON Body Parsing
- ❌ KEINE Authentifizierung
- ❌ KEINE Autorisierung
- ❌ KEINE Input Validierung
- ❌ KEINE Error Handling Best Practices

**Code-Beispiel:**
```javascript
// User erstellen - KEINE Validierung!
app.post('/api/users', (req, res) => {
  const newUser = {
    id: users.length + 1, // Simpel incrementieren
    ...req.body           // Direkt aus Request übernehmen
  };
  users.push(newUser);
  res.status(201).json(newUser);
});
```

### `backend/models/user.js`

**Purpose:** User Model und In-Memory "Datenbank"

**User Schema:**
```javascript
{
  id: number,         // Unique ID
  name: string,       // Username
  email: string,      // Email (keine Validierung)
  role: string        // "Admin" | "User" | "Guest" (nur Text!)
}
```

**WICHTIG für Agents:**
- `role` ist **NUR ein String** - keine Logik dahinter
- Rollen werden **NIRGENDS** für Berechtigungen genutzt
- Wenn ein Ticket "Rollenkonzept implementieren" sagt, heißt das:
  - Backend-Middleware für Rechte-Prüfung erstellen
  - Rollen-basierte API-Zugriffskontrolle
  - Frontend: Zeige/Verstecke UI basierend auf Rolle
  - **Dies existiert aktuell NICHT**

**Initial Data:**
```javascript
let users = [
  { id: 1, name: 'Admin User', email: 'admin@test.com', role: 'Admin' },
  { id: 2, name: 'Normal User', email: 'user@test.com', role: 'User' },
  { id: 3, name: 'Guest User', email: 'guest@test.com', role: 'Guest' }
];
```

---

## 📁 Frontend Dokumentation

### `frontend/src/app/app.component.ts`

**Purpose:** Haupt-Component - zeigt User-Liste

**Features:**
- Lädt User beim Start (`ngOnInit`)
- Zeigt User in Tabelle
- Buttons zum Hinzufügen/Bearbeiten/Löschen (Platzhalter)

**Wichtig:**
- Nutzt `UserService` für API Calls
- Keine Fehlerbehandlung
- Keine Loading States
- Keine Pagination

### `frontend/src/app/user.service.ts`

**Purpose:** API Service für User-Operationen

**Methods:**
```typescript
getUsers(): Observable<User[]>           // GET /api/users
getUser(id: number): Observable<User>    // GET /api/users/:id
createUser(user: User): Observable<User> // POST /api/users
updateUser(user: User): Observable<User> // PUT /api/users/:id
deleteUser(id: number): Observable<void> // DELETE /api/users/:id
```

**Wichtig:**
- Nutzt `HttpClient` von Angular
- Base URL: `http://localhost:3000/api`
- Keine Error Interceptors
- Keine Retry Logic

### `frontend/src/app/auth.service.ts`

**Purpose:** Authentifizierungs-Service (**PLATZHALTER!**)

**Aktueller Stand:**
```typescript
export class AuthService {
  isLoggedIn = true;  // Immer true - KEINE echte Auth!
  
  login() { /* Tut nichts */ }
  logout() { /* Tut nichts */ }
}
```

**WICHTIG für Agents:**
- Wenn ein Ticket "Authentication" erwähnt:
  - JWT oder Session-basierte Auth implementieren
  - Login/Logout Endpoints im Backend
  - Token Storage im Frontend
  - Auth Guards für Protected Routes
  - **Dies existiert aktuell NICHT**

---

## 🎯 Typische Ticket-Szenarien (für Agents)

### Szenario 1: "Rollenkonzept implementieren"

**Was der Agent verstehen muss:**
- Aktuell: `role` ist nur ein String - KEINE Funktionalität
- Was zu tun ist:
  1. Backend: Middleware für Rechte-Prüfung (`requireRole('Admin')`)
  2. Backend: Endpunkte schützen (z.B. nur Admin kann User löschen)
  3. Frontend: UI anpassen basierend auf Rolle
  4. Frontend: API-Calls prüfen ob User berechtigt ist

**Story Points:** 5-8 (mittlere Komplexität)

### Szenario 2: "Authentifizierung hinzufügen"

**Was der Agent verstehen muss:**
- Aktuell: KEINE Auth - AuthService ist Platzhalter
- Was zu tun ist:
  1. Backend: JWT-Authentifizierung implementieren
  2. Backend: Login/Register Endpoints
  3. Backend: Middleware für Token-Validierung
  4. Frontend: Login-Formular
  5. Frontend: Token Storage (localStorage/sessionStorage)
  6. Frontend: Auth Guards für Routes

**Story Points:** 8-13 (hohe Komplexität)

### Szenario 3: "Input Validierung"

**Was der Agent verstehen muss:**
- Aktuell: KEINE Validierung - alles wird akzeptiert
- Was zu tun ist:
  1. Backend: Validation Middleware (z.B. express-validator)
  2. Backend: Schema Validierung für User
  3. Frontend: Form Validation (Angular Reactive Forms)
  4. Frontend: Error Messages anzeigen

**Story Points:** 3-5 (niedrige Komplexität)

### Szenario 4: "Datenbank anbinden"

**Was der Agent verstehen muss:**
- Aktuell: In-Memory Arrays - keine Persistenz
- Was zu tun ist:
  1. Datenbank wählen (MongoDB, PostgreSQL etc.)
  2. ORM/ODM einrichten (Mongoose, Sequelize etc.)
  3. Connection Setup
  4. Migrations/Schema erstellen
  5. User Model umschreiben

**Story Points:** 5-8 (mittlere Komplexität)

---

## 💡 Analyse-Hinweise für Agents

### Bei der Ticket-Analyse folgendes prüfen:

1. **Erwähnt das Ticket "Rollen"?**
   - Wenn ja: Klarstellen dass aktuell KEIN Rollenkonzept existiert
   - Fragen: Welche Rollen? Welche Rechte pro Rolle?

2. **Erwähnt das Ticket "Auth" oder "Login"?**
   - Wenn ja: Klarstellen dass aktuell KEINE Auth existiert
   - Fragen: JWT oder Session? OAuth-Provider?

3. **Erwähnt das Ticket "Datenbank"?**
   - Wenn ja: Klarstellen dass aktuell In-Memory Storage
   - Fragen: Welche DB? Migration-Strategie?

4. **Ist das Feature bereits implementiert?**
   - Code-Check: Suche nach relevanten Files/Functions
   - Wenn vorhanden: Erwähnen in Analyse

5. **Abhängigkeiten zu anderen Features?**
   - Beispiel: "User-Profile bearbeiten" braucht Auth
   - In Analyse erwähnen

---

## 🔍 Code-Such-Strategie für Agents

Wenn ein Ticket Feature XYZ erwähnt:

1. **Suche im Backend:**
   ```
   - server.js nach Endpoints
   - models/ nach relevanten Models
   ```

2. **Suche im Frontend:**
   ```
   - app.component.ts nach UI
   - *.service.ts nach API Calls
   ```

3. **Wenn nichts gefunden:**
   - Feature existiert wahrscheinlich nicht
   - In Analyse erwähnen: "Feature nicht implementiert"

---

## 📊 Complexity Scoring Guide

**Niedrig (1-3 SP):**
- UI-Änderungen ohne Logik
- Simple CRUD Erweiterungen
- Text/Label Änderungen

**Mittel (5-8 SP):**
- Neue Endpoints mit Logik
- Form Validierung
- State Management
- Rollenkonzept

**Hoch (8-13 SP):**
- Authentifizierung/Autorisierung
- Datenbank Integration
- Architektur-Änderungen
- Payment Integration

---

## ✅ Checkliste für Agents

Vor dem Kommentieren eines Tickets:

- [ ] Code in test-app/ durchsucht?
- [ ] Feature bereits vorhanden?
- [ ] Abhängigkeiten identifiziert?
- [ ] Aktuelle Einschränkungen beachtet (kein Auth, keine DB, etc.)?
- [ ] Fragen für PM formuliert?
- [ ] Story Points geschätzt basierend auf aktuellem Stand?
- [ ] Recommendation klar und umsetzbar?

---

## 🚨 Häufige Fehler vermeiden

**NICHT tun:**
- ❌ Annehmen dass Rollen funktionieren
- ❌ Annehmen dass Auth existiert
- ❌ Annehmen dass Daten persistent sind
- ❌ Features empfehlen die bereits existieren
- ❌ Complexity unterschätzen (Auth ist NICHT einfach!)

**IMMER tun:**
- ✅ Code prüfen bevor analysieren
- ✅ Einschränkungen klar kommunizieren
- ✅ Konkrete Fragen stellen
- ✅ Abhängigkeiten erwähnen
- ✅ Realistische Story Points vergeben

---

**Letzte Aktualisierung:** 2025-10-26
**Für:** AI Agents (Technical Product Owner, Developer Agents)
**Projekt:** test-app (Demo-Applikation)
