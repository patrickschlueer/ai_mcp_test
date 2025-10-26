# GitHub MCP Server

MCP Server für GitHub Integration - ermöglicht AI Agents Code zu lesen, schreiben und Pull Requests zu erstellen.

## 🎯 Was macht dieser Server?

Dieser MCP Server stellt **Tools** bereit für:
- ✅ Files lesen aus dem Repository
- ✅ Ordner-Struktur durchsuchen
- ✅ Code durchsuchen
- ✅ Branches erstellen
- ✅ Code committen
- ✅ Pull Requests erstellen

## 🚀 Setup

### 1. Dependencies installieren

```bash
cd C:\Users\patri\OneDrive\Desktop\AITest\mcp-servers\github
npm install
```

### 2. Verbindung testen

```bash
npm test
```

**Erwartete Ausgabe:**
```
✅ Connection successful!
   User: patrickschlueer
   Repo: patrickschlueer/ai_mcp_test
   Private: false

✅ Repository structure:
   📁 backend (dir)
   📁 frontend (dir)
   📄 README.md (file)
```

### 3. Server starten

```bash
npm start
```

Server läuft auf: **http://localhost:3002**

## 🔌 Verfügbare Tools

### 1. **get_file**
File-Inhalt lesen

```bash
POST http://localhost:3002/tools/get_file
Content-Type: application/json

{
  "path": "backend/server.js",
  "branch": "main"
}
```

### 2. **get_tree**
Ordner-Struktur anzeigen

```bash
POST http://localhost:3002/tools/get_tree
Content-Type: application/json

{
  "path": "backend",
  "branch": "main"
}
```

### 3. **search_code**
Code durchsuchen

```bash
POST http://localhost:3002/tools/search_code
Content-Type: application/json

{
  "query": "function getUsers"
}
```

### 4. **create_branch**
Branch erstellen

```bash
POST http://localhost:3002/tools/create_branch
Content-Type: application/json

{
  "branchName": "feature/add-worker-role",
  "fromBranch": "main"
}
```

### 5. **commit_file**
File committen

```bash
POST http://localhost:3002/tools/commit_file
Content-Type: application/json

{
  "path": "backend/user.service.ts",
  "content": "export type UserRole = 'User' | 'Admin' | 'Worker';",
  "message": "Add Worker role",
  "branch": "feature/add-worker-role"
}
```

### 6. **create_pull_request**
Pull Request erstellen

```bash
POST http://localhost:3002/tools/create_pull_request
Content-Type: application/json

{
  "title": "Add Worker Role",
  "body": "Closes AT-5\n\nAdded Worker role to the system",
  "headBranch": "feature/add-worker-role",
  "baseBranch": "main"
}
```

### 7. **get_branches**
Alle Branches anzeigen

```bash
POST http://localhost:3002/tools/get_branches
```

### 8. **get_commits**
Commits anzeigen

```bash
POST http://localhost:3002/tools/get_commits
Content-Type: application/json

{
  "branch": "main",
  "limit": 10
}
```

## 🧪 Testen mit cURL (Windows CMD)

```cmd
# Health Check
curl http://localhost:3002/health

# Connection Test
curl http://localhost:3002/test-connection

# Get File
curl -X POST http://localhost:3002/tools/get_file ^
  -H "Content-Type: application/json" ^
  -d "{\"path\":\"README.md\"}"

# Get Tree
curl -X POST http://localhost:3002/tools/get_tree ^
  -H "Content-Type: application/json" ^
  -d "{\"path\":\"\"}"

# Search Code
curl -X POST http://localhost:3002/tools/search_code ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"UserRole\"}"
```

## 🔑 Credentials

Die Credentials sind in der `.env` Datei:

```
GITHUB_TOKEN=xxx
GITHUB_OWNER=patrickschlueer
GITHUB_REPO=ai_mcp_test
GITHUB_DEFAULT_BRANCH=main
```

## 🏗️ Wie Agents den Server nutzen

**Beispiel: Developer Agent fügt Worker Role hinzu**

```javascript
// 1. Code lesen
const file = await github.getFile('backend/user.model.ts');
console.log(file.content); // Sieht UserRole enum

// 2. Branch erstellen
await github.createBranch('feature/add-worker-role');

// 3. Code ändern und committen
const newCode = file.content.replace(
  "type UserRole = 'User' | 'Admin'",
  "type UserRole = 'User' | 'Admin' | 'Worker'"
);
await github.commitFile(
  'backend/user.model.ts',
  newCode,
  'Add Worker role to UserRole type',
  'feature/add-worker-role'
);

// 4. Pull Request erstellen
await github.createPullRequest(
  'Add Worker Role',
  'Closes AT-5\n\nAdded Worker role as requested',
  'feature/add-worker-role'
);
```

## 📊 Repository Info

- **Owner:** patrickschlueer
- **Repo:** ai_mcp_test
- **URL:** https://github.com/patrickschlueer/ai_mcp_test

## 🛠️ Troubleshooting

### "Bad credentials"

**Problem:** GitHub Token ist falsch oder abgelaufen

**Lösung:**
- Gehe zu https://github.com/settings/tokens
- Generiere neuen Token
- Update `.env` Datei

### "Not Found"

**Problem:** Repository existiert nicht oder Token hat keine Berechtigung

**Lösung:**
- Prüfe Repository Name in `.env`
- Prüfe ob Token `repo` scope hat

### "API rate limit exceeded"

**Problem:** Zu viele Requests

**Lösung:**
- Warte 1 Stunde
- Authentifizierter Zugriff hat 5000 Requests/Stunde

## 🎯 Nächste Schritte

1. ✅ GitHub MCP Server läuft
2. ✅ Kann Code lesen
3. 🔄 **Nächster Schritt:** Architect Agent bauen (nutzt GitHub MCP)
4. 🔄 **Danach:** Developer Agent (schreibt echten Code)

## ✅ Bereit!

Dein GitHub MCP Server ist ready! 🎉

Agents können jetzt:
- Code lesen
- Branches erstellen
- Code committen
- Pull Requests erstellen

Starte mit:
```bash
npm test    # Verbindung testen
npm start   # Server starten
```
