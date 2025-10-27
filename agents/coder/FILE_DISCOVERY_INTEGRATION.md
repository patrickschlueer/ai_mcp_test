# ✅ Coder Agent - FileDiscovery Integration

## 🔧 Problem

**Vorher:**
```javascript
// ❌ Hart-codierte File-Liste
const filesToRead = [
  'test-app/backend/server.js',
  'test-app/backend/models/user.js',
  'test-app/backend/routes/auth.js',
  'test-app/frontend/src/app/app.component.ts',
  'test-app/frontend/src/app/app.component.html',
  'test-app/frontend/src/styles.css'
];
```

**Probleme:**
- ❌ Nur 6 hart-codierte Files
- ❌ Verpasst neue Components in `/shared/` oder `/features/`
- ❌ Verpasst neue Services, Models
- ❌ Muss manuell aktualisiert werden
- ❌ Nicht skalierbar

## ✅ Lösung

**Jetzt: FileDiscovery Util:**
```javascript
// ✅ Dynamische File-Discovery
const discoveredFiles = await this.fileDiscovery.discoverProjectFiles();

// Ergebnis:
// {
//   all: [alle 50+ Files],
//   backend: [alle Backend-Files],
//   frontend: [alle Frontend-Files]
// }
```

**Vorteile:**
- ✅ **Dynamisch** - Findet ALLE Project-Files
- ✅ **Rekursiv** - Durchsucht alle Unterordner
- ✅ **Skalierbar** - Funktioniert mit jedem Projekt
- ✅ **Wartbar** - Ein Ort für File-Discovery Logik
- ✅ **Shared** - Gleiche Util wie TPO Agent

## 📊 Implementierung

### 1. Import FileDiscoveryUtil

```javascript
import FileDiscoveryUtil from '../shared-utils/file-discovery.js';
```

### 2. Initialize im Constructor

```javascript
constructor() {
  // ...
  this.fileDiscovery = new FileDiscoveryUtil(
    this.callMCPTool.bind(this),
    this.emoji
  );
}
```

### 3. Verwende in readProjectContext()

```javascript
async readProjectContext(ticket) {
  // 🔥 NEU: Dynamische Discovery
  const discoveredFiles = await this.fileDiscovery.discoverProjectFiles();
  
  // Lese erste 10 Files für Context
  const filesToRead = discoveredFiles.all.slice(0, 10);
  
  // ... rest of code
  
  return {
    architecture,
    uiDesign,
    files: filesContent,
    discoveredFiles  // Wichtig für planImplementation()
  };
}
```

### 4. Update planImplementation() Prompt

```javascript
=== EXISTING FILES ===
Total: ${context.discoveredFiles.all.length} files discovered
Backend: ${context.discoveredFiles.backend.length} files
Frontend: ${context.discoveredFiles.frontend.length} files

Sample Files:
${context.discoveredFiles.all.slice(0, 20).map(f => `- ${f}`).join('\n')}
```

## 🎯 Was wird jetzt entdeckt?

### Backend Files:
```
test-app/backend/server.js
test-app/backend/models/user.js
test-app/backend/models/product.js
test-app/backend/routes/auth.js
test-app/backend/routes/users.js
test-app/backend/routes/products.js
test-app/backend/middleware/auth.js
...
```

### Frontend Files:
```
test-app/frontend/src/app/app.component.ts
test-app/frontend/src/app/app.component.html
test-app/frontend/src/app/app.component.css
test-app/frontend/src/app/models/user.model.ts
test-app/frontend/src/app/services/user.service.ts
test-app/frontend/src/app/shared/search-bar/search-bar.component.ts
test-app/frontend/src/app/shared/search-bar/search-bar.component.html
test-app/frontend/src/app/shared/search-bar/search-bar.component.css
test-app/frontend/src/app/features/user-management/user-list.component.ts
...
```

## 📝 Console Output

### Vorher:
```
👨‍💻 Reading project context...
   ✅ server.js
   ✅ user.js
   ✅ auth.js
   ✅ app.component.ts
   ✅ app.component.html
   ✅ styles.css
```

### Jetzt:
```
👨‍💻 Reading project context...

👨‍💻 Discovering project files recursively...

   🔧 Searching backend...
   🔍 Starting recursive discovery from: test-app/backend
   📂 Depth 0: Exploring 1 directories
      Checking: test-app/backend
      Found 2 files, 3 directories
      ✅ File: server.js
      ✅ File: config.js
      📁 Dir: models
      📁 Dir: routes
      📁 Dir: middleware
   📂 Depth 1: Exploring 3 directories
      ...
   ✅ Discovery complete: Found 15 files

   🎨 Searching frontend...
   🔍 Starting recursive discovery from: test-app/frontend/src/app
   📂 Depth 0: Exploring 1 directories
      ...
   ✅ Discovery complete: Found 42 files

   ✅ Discovered 57 files via MCP
      Backend: 15 files
      Frontend: 42 files

   📁 Project Structure:
      backend: 15 file(s)
      shared: 12 file(s)
      features: 18 file(s)
      models: 4 file(s)
      services: 6 file(s)
      app-root: 2 file(s)

   📚 Reading 10 files for context...
   ✅ server.js
   ✅ user.js
   ✅ app.component.ts
   ...
```

## 🎨 AI Prompt Benefits

### Vorher (6 Files):
```
=== EXISTING FILES ===
- test-app/backend/server.js (1234 bytes)
- test-app/backend/models/user.js (567 bytes)
...
```

### Jetzt (57 Files):
```
=== EXISTING FILES ===
Total: 57 files discovered
Backend: 15 files
Frontend: 42 files

Sample Files:
- test-app/backend/server.js
- test-app/backend/models/user.js
- test-app/backend/models/product.js
- test-app/backend/routes/auth.js
- test-app/frontend/src/app/shared/search-bar/search-bar.component.ts
- test-app/frontend/src/app/features/user-management/user-list.component.ts
...
```

**Besseres Planning:**
- ✅ AI sieht ALLE existierenden Files
- ✅ AI kann besser entscheiden wo neue Files hingehören
- ✅ AI vermeidet Duplikate
- ✅ AI nutzt existierende Shared Components

## 🔄 Vergleich mit TPO Agent

Beide Agenten nutzen jetzt **dieselbe** FileDiscovery Utility:

| Feature | TPO Agent | Coder Agent |
|---------|-----------|-------------|
| FileDiscovery | ✅ | ✅ |
| Rekursive Suche | ✅ | ✅ |
| Backend Discovery | ✅ | ✅ |
| Frontend Discovery | ✅ | ✅ |
| Structure Analysis | ✅ | ✅ |
| Shared Util | ✅ | ✅ |

## 📋 Nächste Schritte

**Weitere Agents die FileDiscovery brauchen:**
- [ ] Software Architect Agent
- [ ] UI Designer Agent
- [ ] Reviewer Agent (optional)

**Benefits:**
- Konsistente File-Discovery über alle Agents
- Wartbarkeit: Update einmal, alle profitieren
- Bessere AI Decisions durch vollständigen Context

## 🎯 Testing

**Test das neue System:**
```bash
cd agents/coder
npm start
```

**Was du sehen solltest:**
1. "Discovering project files recursively..."
2. Recursive search durch Backend & Frontend
3. "Discovered X files via MCP"
4. Project Structure Overview
5. "Reading 10 files for context..."

**Check den AI Output:**
- Plant AI neue Files an richtigen Stellen?
- Nutzt AI existierende Shared Components?
- Vermeidet AI Duplikate?

---

**Status:** ✅ COMPLETE
**Impact:** 🎯 High - Dynamische File Discovery statt hart-codiert
**Agents Updated:** 1 (Coder)
**Shared With:** TPO Agent
**Scalability:** ✅ Works with any project size
