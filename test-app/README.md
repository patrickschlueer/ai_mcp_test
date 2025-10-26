# User Management CRUD Application

Eine vollständige Full-Stack CRUD-Anwendung für das AI Agent PoC Projekt.

## 📁 Projekt-Struktur

```
test-app/
├── backend/           # Node.js + Express REST API
│   ├── server.js      # Haupt-Server
│   ├── package.json   # Dependencies
│   └── README.md      # Backend-Dokumentation
│
└── frontend/          # Angular 17 Standalone App
    ├── src/
    │   ├── app/
    │   │   ├── app.component.ts    # Haupt-Komponente
    │   │   └── user.service.ts     # API Service
    │   ├── main.ts                 # Bootstrap
    │   ├── index.html              # HTML Template
    │   └── styles.css              # Global Styles
    ├── angular.json                # Angular Config
    ├── package.json                # Dependencies
    └── tsconfig.json               # TypeScript Config
```

## 🚀 Quick Start

### Voraussetzungen

- **Node.js** v18 oder höher
- **npm** (kommt mit Node.js)
- **Terminal** (CMD, PowerShell, oder Git Bash)

### Installation & Start

#### 1. Backend starten

```bash
# Im Backend-Ordner
cd test-app/backend

# Dependencies installieren
npm install

# Server starten
npm start
```

Backend läuft auf: **http://localhost:3000**

#### 2. Frontend starten (Neues Terminal)

```bash
# Im Frontend-Ordner
cd test-app/frontend

# Dependencies installieren
npm install

# Angular CLI global installieren (falls noch nicht vorhanden)
npm install -g @angular/cli

# Development Server starten
npm start
```

Frontend läuft auf: **http://localhost:4200**

## ✨ Features

### CRUD Operationen

- ✅ **Create**: Neue User erstellen
- ✅ **Read**: Alle User anzeigen + Einzelnen User abrufen
- ✅ **Update**: User bearbeiten
- ✅ **Delete**: User löschen

### Validierung

- Name und Email sind Pflichtfelder
- Email muss unique sein
- Proper Error Handling

### UI Features

- Responsive Design
- Real-time Updates
- Success/Error Messages
- Smooth Animations
- Modern Gradient Design

## 🔌 API Endpoints

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/api/health` | Health Check |
| GET | `/api/users` | Alle Users abrufen |
| GET | `/api/users/:id` | Einzelnen User abrufen |
| POST | `/api/users` | Neuen User erstellen |
| PUT | `/api/users/:id` | User aktualisieren |
| DELETE | `/api/users/:id` | User löschen |

## 📊 Datenmodell

```typescript
interface User {
  id: string;          // UUID
  name: string;        // Name des Users
  email: string;       // Email (unique)
  role: string;        // 'User', 'Admin', 'Manager'
  createdAt: string;   // ISO Timestamp
  updatedAt?: string;  // ISO Timestamp (optional)
}
```

## 🧪 Testen der API

### Mit cURL (CMD/PowerShell)

```bash
# Alle Users abrufen
curl http://localhost:3000/api/users

# Neuen User erstellen
curl -X POST http://localhost:3000/api/users ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"role\":\"User\"}"

# User aktualisieren (ersetze :id mit echter ID)
curl -X PUT http://localhost:3000/api/users/:id ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Updated Name\"}"

# User löschen
curl -X DELETE http://localhost:3000/api/users/:id
```

### Mit Browser

Öffne einfach: http://localhost:4200

## 🎯 Für das AI Agent PoC

Diese Anwendung dient als **Testobjekt** für die AI Agents:

### Zukünftige Agent-Tasks (Beispiele)

1. **Developer Agent**: "Add password field to User model"
2. **Developer Agent**: "Implement user search functionality"
3. **Architect Agent**: "Review the API security"
4. **DevOps Agent**: "Add Docker configuration"
5. **PM Agent**: "Create documentation for new features"

### Jira Tickets erstellen

Beispiel-Tickets die du in Jira anlegen kannst:

```
POC-1: Add password field to User model
POC-2: Implement user authentication
POC-3: Add search/filter functionality
POC-4: Improve error handling
POC-5: Add unit tests
POC-6: Dockerize the application
POC-7: Add user profile picture upload
POC-8: Implement pagination
```

## 🛠️ Technologie-Stack

### Backend
- **Node.js** - Runtime
- **Express.js** - Web Framework
- **CORS** - Cross-Origin Resource Sharing
- **UUID** - Unique IDs
- In-Memory Storage (Array)

### Frontend
- **Angular 17** - Framework (Standalone Components)
- **TypeScript** - Type Safety
- **RxJS** - Reactive Programming
- **HttpClient** - API Calls

## 📝 Nächste Schritte

1. ✅ Backend und Frontend starten
2. ✅ Im Browser testen (http://localhost:4200)
3. ✅ Jira-Tickets erstellen
4. 🔄 MCP Server implementieren
5. 🔄 Agents erstellen
6. 🔄 Orchestrator aufsetzen

## 🐛 Troubleshooting

### Backend startet nicht

**Problem**: Port 3000 bereits belegt
```bash
# Finde Process auf Port 3000
netstat -ano | findstr :3000

# Töte Process (ersetze PID)
taskkill /PID <PID> /F
```

### Frontend startet nicht

**Problem**: Angular CLI nicht gefunden
```bash
# Installiere Angular CLI global
npm install -g @angular/cli
```

**Problem**: Port 4200 bereits belegt
```bash
# Starte auf anderem Port
ng serve --port 4300
```

### CORS Fehler

**Lösung**: Backend ist bereits für CORS konfiguriert. Stelle sicher dass:
- Backend läuft auf Port 3000
- Frontend ruft `http://localhost:3000/api/...` auf

## 📞 Support

Bei Fragen oder Problemen:
1. Prüfe ob Backend läuft: http://localhost:3000/api/health
2. Prüfe Browser Console auf Fehler (F12)
3. Prüfe Backend Logs im Terminal

## 🎉 Fertig!

Die Anwendung ist jetzt bereit für:
- ✅ Manuelle Nutzung
- ✅ AI Agent Testing
- ✅ Jira Integration
- ✅ Weitere Features

Viel Erfolg mit dem PoC! 🚀
