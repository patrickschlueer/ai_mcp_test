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
│           ├── app.component.ts              # Root Component
│           ├── app.component.html
│           ├── app.component.css
│           │
│           ├── models/                       # Data Models
│           │   └── user.model.ts
│           │
│           ├── services/                     # API Services
│           │   ├── user.service.ts
│           │   └── auth.service.ts
│           │
│           ├── shared/                       # Reusable Components
│           │   ├── header/
│           │   │   ├── header.component.ts
│           │   │   ├── header.component.html
│           │   │   └── header.component.css
│           │   └── alert/
│           │       ├── alert.component.ts
│           │       ├── alert.component.html
│           │       └── alert.component.css
│           │
│           └── features/                     # Feature Modules
│               └── user-management/
│                   ├── user-form/
│                   │   ├── user-form.component.ts
│                   │   ├── user-form.component.html
│                   │   └── user-form.component.css
│                   ├── user-list/
│                   │   ├── user-list.component.ts
│                   │   ├── user-list.component.html
│                   │   └── user-list.component.css
│                   └── user-table-row/
│                       ├── user-table-row.component.ts
│                       ├── user-table-row.component.html
│                       └── user-table-row.component.css
│
└── backend/           # Node.js Express Server
    ├── server.js      # API Server
    └── models/
        └── user.js    # User Model & In-Memory DB
```

---

## 🎨 Frontend Architektur-Regeln

### Angular Best Practices (WICHTIG für Agents!)

**1. Component Structure**
- Jede Component hat **3 separate Files**: `.ts`, `.html`, `.css`
- Verwende `templateUrl` und `styleUrls` - **KEIN** inline template/styles
- Max **400 Zeilen** pro File
- Verwende `OnPush` ChangeDetection wo möglich

**2. Component Organization**
```
/shared/     → Reusable Components (Header, Alert, Button, etc.)
/features/   → Feature-spezifische Components
/models/     → TypeScript Interfaces/Types
/services/   → API Services & Business Logic
```

**3. File Organization**
- **ONE class per file**
- **ONE interface per file**
- File-Namen: kebab-case (z.B. `user-form.component.ts`)

**4. State Management** (Geplant, noch nicht implementiert)
- NgRx (@ngrx/store, effects, entity)
- RxJS für Reactive Programming
- Aktuell: Einfache Component-State

**5. Testing** (Noch nicht implementiert)
- Jedes File sollte `.spec.ts` Test haben
- Unit Tests mit Jasmine/Karma
- E2E Tests mit Playwright/Cypress

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

### 6. **Kein State Management**
- NgRx ist noch nicht implementiert
- Components verwalten lokalen State
- Kein zentraler Store

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

### Struktur-Überblick

#### `/models/` - Data Models

**`models/user.model.ts`**
```typescript
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'Admin' | 'User' | 'Guest';
}
```

**Purpose:** TypeScript Interfaces für Type-Safety

#### `/services/` - Business Logic & API

**`services/user.service.ts`**

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

**`services/auth.service.ts`**

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

#### `/shared/` - Reusable Components

**Purpose:** Wiederverwendbare UI-Components

**Struktur:**
```
shared/
├── header/          # App Header mit Navigation
├── alert/           # Alert/Notification Component
└── [future components...]
```

**Regel:** Components in `/shared/` dürfen **KEINE** Business Logic enthalten
- Nur Präsentation
- Input/Output Properties
- Wiederverwendbar in jedem Feature

**Example: `shared/header/header.component.ts`**
```typescript
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  @Input() title: string = 'test-app';
  @Output() menuClick = new EventEmitter<void>();
}
```

#### `/features/` - Feature Modules

**Purpose:** Feature-spezifische Components mit Business Logic

**Struktur:**
```
features/
└── user-management/
    ├── user-form/          # Create/Edit User Form
    ├── user-list/          # User List Container
    └── user-table-row/     # Single User Table Row
```

**Regel:** Features sind **selbstständige Module**
- Eigene Components
- Nutzen Services aus `/services/`
- Nutzen Shared Components aus `/shared/`
- Können eigene Sub-Features haben

**Example: `features/user-management/user-list/user-list.component.ts`**
```typescript
@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {
  users: User[] = [];

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.userService.getUsers().subscribe(users => {
      this.users = users;
    });
  }

  onDeleteUser(id: number): void {
    this.userService.deleteUser(id).subscribe(() => {
      this.users = this.users.filter(u => u.id !== id);
    });
  }
}
```

#### `app.component.ts` - Root Component

**Purpose:** Application Root - Orchestriert Haupt-Layout

**Responsibilities:**
- Rendered `<app-header>`
- Rendered `<router-outlet>` (wenn Routing implementiert)
- Global State Management (wenn implementiert)

**Aktuell:**
- Zeigt Header
- Zeigt User-List direkt
- Keine Routing

---

## 🎯 Typische Ticket-Szenarien (für Agents)

### Szenario 1: "Neue UI-Component erstellen"

**Was der Agent verstehen muss:**
- Wiederverwendbar? → `/shared/`
- Feature-spezifisch? → `/features/[feature-name]/`
- **IMMER** 3 Files: `.ts`, `.html`, `.css`
- **KEINE** inline templates/styles

**Was zu tun ist:**
1. Component in korrektem Ordner erstellen
2. In `app.module.ts` deklarieren
3. Tests erstellen (`.spec.ts`)
4. In Parent-Component einbinden

**Story Points:** 2-3 (niedrige Komplexität)

### Szenario 2: "Rollenkonzept implementieren"

**Was der Agent verstehen muss:**
- Aktuell: `role` ist nur ein String - KEINE Funktionalität
- Was zu tun ist:
  1. Backend: Middleware für Rechte-Prüfung (`requireRole('Admin')`)
  2. Backend: Endpunkte schützen (z.B. nur Admin kann User löschen)
  3. Frontend: UI anpassen basierend auf Rolle
  4. Frontend: Direktiven für Role-basierte Sichtbarkeit
  5. Service: `AuthService` erweitern mit Role-Checks

**Story Points:** 5-8 (mittlere Komplexität)

### Szenario 3: "Authentifizierung hinzufügen"

**Was der Agent verstehen muss:**
- Aktuell: KEINE Auth - AuthService ist Platzhalter
- Was zu tun ist:
  1. Backend: JWT-Authentifizierung implementieren
  2. Backend: Login/Register Endpoints
  3. Backend: Middleware für Token-Validierung
  4. Frontend: Login-Component (in `/features/auth/`)
  5. Frontend: Token Storage (localStorage/sessionStorage)
  6. Frontend: Auth Guards für Routes
  7. Frontend: HTTP Interceptor für Token

**Story Points:** 8-13 (hohe Komplexität)

### Szenario 4: "NgRx State Management einführen"

**Was der Agent verstehen muss:**
- Aktuell: Component-lokaler State
- Was zu tun ist:
  1. NgRx installieren (`@ngrx/store`, `@ngrx/effects`, `@ngrx/entity`)
  2. Store Structure definieren
  3. Actions, Reducers, Effects erstellen
  4. Services auf Store umstellen
  5. Components auf Selectors umstellen

**Story Points:** 8-13 (hohe Komplexität)

### Szenario 5: "User filtern/sortieren"

**Was der Agent verstehen muss:**
- Betrifft: `features/user-management/user-list/`
- Was zu tun ist:
  1. Filter-UI in `user-list.component.html` hinzufügen
  2. Filter-Logic in `user-list.component.ts`
  3. Optional: Filter-Component in `/shared/filters/`
  4. Backend: Query-Parameter für Filter

**Story Points:** 3-5 (mittlere Komplexität)

---

## 💡 Analyse-Hinweise für Agents

### Bei der Ticket-Analyse folgendes prüfen:

1. **Ist es ein UI-Feature?**
   - → Component erstellen
   - Wo? `/shared/` oder `/features/`?
   - Bestehende Components wiederverwenden?

2. **Erwähnt das Ticket "Rollen"?**
   - Wenn ja: Klarstellen dass aktuell KEIN Rollenkonzept existiert
   - Fragen: Welche Rollen? Welche Rechte pro Rolle?

3. **Erwähnt das Ticket "Auth" oder "Login"?**
   - Wenn ja: Klarstellen dass aktuell KEINE Auth existiert
   - Fragen: JWT oder Session? OAuth-Provider?

4. **Erwähnt das Ticket "State Management"?**
   - Wenn ja: Klarstellen dass aktuell kein NgRx
   - Fragen: Nur lokaler State oder NgRx einführen?

5. **Ist das Feature bereits implementiert?**
   - Code-Check: Suche in `/features/`, `/shared/`, `/services/`
   - Wenn vorhanden: Erwähnen in Analyse

6. **Abhängigkeiten zu anderen Features?**
   - Beispiel: "User-Profile bearbeiten" braucht `user-form` Component
   - In Analyse erwähnen

---

## 🔍 Code-Such-Strategie für Agents

Wenn ein Ticket Feature XYZ erwähnt:

1. **Suche im Frontend:**
   ```
   /features/        → Feature-spezifische Components
   /shared/          → Reusable Components
   /services/        → Business Logic & API
   /models/          → Data Structures
   app.component.*   → Root Component
   ```

2. **Suche im Backend:**
   ```
   server.js         → API Endpoints
   models/           → Data Models
   ```

3. **Wenn nichts gefunden:**
   - Feature existiert wahrscheinlich nicht
   - In Analyse erwähnen: "Feature nicht implementiert"
   - Empfehlung: In welchem Ordner sollte es erstellt werden?

---

## 📊 Complexity Scoring Guide

**Niedrig (1-3 SP):**
- Neue Shared Component ohne Logic
- UI-Text/Label Änderungen
- Simple CSS Anpassungen
- Kleine Component-Erweiterungen

**Mittel (5-8 SP):**
- Neue Feature Component mit Logic
- Service-Integration
- Form Validierung
- Rollenkonzept
- Filter/Sort Funktionalität

**Hoch (8-13 SP):**
- Authentifizierung/Autorisierung
- NgRx State Management einführen
- Komplexe Feature Module
- Routing & Guards
- Datenbank Integration (Backend)

---

## ✅ Checkliste für Agents

Vor dem Kommentieren eines Tickets:

- [ ] Frontend-Struktur durchsucht? (`/features/`, `/shared/`, `/services/`)
- [ ] Backend durchsucht? (`server.js`, `/models/`)
- [ ] Feature bereits vorhanden?
- [ ] In welchem Ordner gehört das Feature? (`/shared/` oder `/features/`?)
- [ ] Abhängigkeiten identifiziert?
- [ ] Angular Best Practices beachtet? (Component Split, Max 400 Zeilen, etc.)
- [ ] Aktuelle Einschränkungen beachtet? (kein Auth, keine DB, kein NgRx)
- [ ] Fragen für PM formuliert?
- [ ] Story Points geschätzt basierend auf aktuellem Stand?
- [ ] Recommendation klar und umsetzbar?

---

## 🚨 Häufige Fehler vermeiden

**NICHT tun:**
- ❌ Inline Templates/Styles in Components
- ❌ Components mit > 400 Zeilen
- ❌ Business Logic in `/shared/` Components
- ❌ Annehmen dass Rollen funktionieren
- ❌ Annehmen dass Auth existiert
- ❌ Annehmen dass NgRx existiert
- ❌ Features empfehlen die bereits existieren

**IMMER tun:**
- ✅ 3 separate Files pro Component (`.ts`, `.html`, `.css`)
- ✅ `templateUrl` und `styleUrls` verwenden
- ✅ Components < 400 Zeilen halten
- ✅ Shared vs. Features Struktur beachten
- ✅ Code prüfen bevor analysieren
- ✅ Einschränkungen klar kommunizieren
- ✅ Konkrete Fragen stellen
- ✅ Abhängigkeiten erwähnen
- ✅ Realistische Story Points vergeben

---

## 🎨 UI/UX Guidelines

**Aktueller Stand:**
- Kein Design System
- Kein CSS Framework (kein Bootstrap, Material, Tailwind)
- Custom CSS für jede Component
- Responsive Design ist Ziel, aber nicht vollständig implementiert

**Für Designer-Agent:**
- Neue Components sollten konsistent zum bestehenden Stil sein
- Farben: Einfache Palette (definiert in CSS)
- Spacing: Konsistent verwenden
- Accessibility: ARIA-Labels wo möglich

---

**Letzte Aktualisierung:** 2025-01-27
**Für:** AI Agents (Technical Product Owner, Developer Agents, Designer Agents, Architect Agents)
**Projekt:** test-app (Demo-Applikation)
**Frontend:** Angular 17 mit Best-Practice Struktur
**Backend:** Node.js Express mit In-Memory Storage
