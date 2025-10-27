# 🚀 Quick Reference für AI Agents

**Last Updated:** 2025-01-27

## 📁 Projekt-Struktur auf einen Blick

```
test-app/
├── backend/
│   ├── server.js                    # Express API
│   └── models/user.js               # In-Memory DB
│
└── frontend/src/app/
    ├── app.component.*              # Root Component
    │
    ├── models/                      # TypeScript Interfaces
    │   └── user.model.ts
    │
    ├── services/                    # API Services
    │   ├── user.service.ts
    │   └── auth.service.ts          # ⚠️ Platzhalter!
    │
    ├── shared/                      # Reusable Components
    │   ├── header/
    │   └── alert/
    │
    └── features/                    # Feature Modules
        └── user-management/
            ├── user-form/
            ├── user-list/
            └── user-table-row/
```

---

## 🎯 Wo gehört mein Code hin?

| Was? | Wohin? | Beispiel |
|------|--------|----------|
| Reusable UI Component | `/shared/[name]/` | Button, Modal, Alert |
| Feature Component | `/features/[feature]/[name]/` | User-Form, Product-List |
| Data Model | `/models/[name].model.ts` | User, Product |
| API Service | `/services/[name].service.ts` | UserService, AuthService |
| Backend Endpoint | `backend/server.js` | GET /api/users |
| Backend Model | `backend/models/[name].js` | user.js |

---

## ✅ Component Checklist

Jede Angular Component braucht:

- [ ] **3 separate Files:** `.ts`, `.html`, `.css`
- [ ] **templateUrl & styleUrls** (kein inline)
- [ ] **< 400 Zeilen** pro File
- [ ] **kebab-case** File-Namen
- [ ] **Deklariert** in `app.module.ts`
- [ ] **Test File** `.spec.ts` (geplant)

**Example:**
```
shared/button/
├── button.component.ts       # Logic
├── button.component.html     # Template
├── button.component.css      # Styles
└── button.component.spec.ts  # Tests (TODO)
```

---

## ⚠️ Was NICHT existiert (aber oft gefragt wird)

| Feature | Status | Wenn Ticket es erwähnt... |
|---------|--------|---------------------------|
| **Authentifizierung** | ❌ Keine | AuthService ist Platzhalter → JWT/OAuth implementieren |
| **Rollenkonzept** | ❌ Keine | Role ist nur String → Rechte-System bauen |
| **Datenbank** | ❌ Keine | In-Memory Arrays → DB anbinden |
| **NgRx Store** | ❌ Keine | Component-State → Store einführen |
| **Tests** | ❌ Keine | Keine Tests → Tests schreiben |
| **Validierung** | ⚠️ Minimal | Kaum vorhanden → Validierung implementieren |

---

## 📊 Story Points Quick Guide

| Komplexität | SP | Beispiele |
|-------------|-----|-----------|
| **Trivial** | 1 | Text/Label ändern, CSS Tweaks |
| **Niedrig** | 2-3 | Neue Shared Component ohne Logic, UI Anpassung |
| **Mittel** | 5 | Neue Feature Component, Service-Integration, Filter |
| **Mittel-Hoch** | 8 | Rollenkonzept, Form-Validierung, komplexe Component |
| **Hoch** | 13 | Auth-System, NgRx einführen, DB-Integration |

---

## 🔍 Quick Code-Search

**User fragt nach "User Management":**
```
✅ Check: features/user-management/
✅ Check: services/user.service.ts
✅ Check: models/user.model.ts
✅ Check: backend/server.js (GET /api/users)
```

**User fragt nach "Authentication":**
```
⚠️  Check: services/auth.service.ts  → Platzhalter!
❌ Check: features/auth/             → Existiert nicht
❌ Check: backend/server.js (/login) → Existiert nicht
→ Empfehlung: Auth-System implementieren (13 SP)
```

**User fragt nach "Filter Users":**
```
✅ Check: features/user-management/user-list/
❌ Check: Filter-Logic                        → Existiert nicht
❌ Check: Backend Query-Parameters            → Existiert nicht
→ Empfehlung: Filter implementieren (5 SP)
```

---

## 💬 Standard-Fragen an PM

**Bei UI-Features:**
- Wo soll die Component angezeigt werden?
- Ist es wiederverwendbar? (`/shared/`) oder feature-spezifisch? (`/features/`)
- Responsive Design erforderlich?

**Bei Auth-Features:**
- JWT oder Session-basiert?
- Welche OAuth-Provider? (Google, GitHub, etc.)
- Welche Rollen und Rechte?

**Bei Rollen-Features:**
- Welche Rollen? (Admin, User, Guest, ...)
- Welche Rechte pro Rolle?
- Welche Endpoints/UI sollten geschützt sein?

**Bei State-Features:**
- Reicht Component-State oder NgRx Store?
- Welche Daten müssen global verfügbar sein?

---

## 🚨 Häufigste Fehler

1. ❌ **Inline Templates** in Components
   ```typescript
   // FALSCH
   @Component({
     template: `<div>...</div>`
   })
   ```
   
   ```typescript
   // RICHTIG
   @Component({
     templateUrl: './my.component.html'
   })
   ```

2. ❌ **Business Logic in `/shared/`**
   - Shared = nur Präsentation
   - Business Logic gehört in Services oder Features

3. ❌ **Annehmen dass Auth existiert**
   - AuthService ist Platzhalter
   - Immer prüfen und erwähnen

4. ❌ **Zu niedrige Story Points bei Auth/DB**
   - Auth = 8-13 SP (NICHT 3!)
   - DB-Integration = 5-8 SP

---

## 📋 Standard-Analyse-Template

```markdown
## 📊 Analyse

**Story Points:** [1-13]
**Komplexität:** [Niedrig/Mittel/Hoch]
**Klarheit:** [Klar/Unklar]

## 💡 Code Insights

- Feature existiert [NICHT / TEILWEISE / VOLLSTÄNDIG]
- Relevante Files: 
  - frontend/...
  - backend/...
- Abhängigkeiten: [Liste]

## ❓ Fragen an PM

1. [Konkrete Frage]
2. [Konkrete Frage]

## 🎯 Empfehlung

[Umsetzbar / Bedarf Klärung / Zu komplex]
[Begründung]
```

---

## 🛠️ Nützliche Commands

```bash
# Frontend starten
cd test-app/frontend
npm start

# Backend starten
cd test-app/backend
node server.js

# Component generieren (manuell)
mkdir -p src/app/shared/my-component
touch src/app/shared/my-component/my-component.component.{ts,html,css}
```

---

## 🔗 Quick Links

- [Vollständige Dokumentation](./AGENT_DOCUMENTATION.md)
- [Frontend Refactoring Docs](./frontend/REFACTORING_DOCUMENTATION.md)
- [File Discovery Guide](../agents/DYNAMIC_FILE_DISCOVERY_GUIDE.md)

---

**Für:** AI Agents - Quick Reference beim Ticket-Analysieren
