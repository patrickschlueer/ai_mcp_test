# GitHub MCP Test Agent

Test-Agent für den GitHub MCP Server Workflow.

## Was macht der Test-Agent?

Dieser Agent testet den kompletten GitHub-Workflow:

1. ✅ **Branch erstellen** - Erstellt einen Test-Branch von `main`
2. ✅ **Datei auswählen** - Sucht `README.md` oder erstellt `test-file.txt`
3. ✅ **Datei anpassen** - Fügt einen Timestamp hinzu
4. ✅ **Änderung committen** - Committed mit aussagekräftiger Message
5. ✅ **Pull Request erstellen** - Öffnet einen PR zu `main`

## Installation

```bash
cd C:\Users\patri\OneDrive\Desktop\AITest\test-agents
npm install
```

## Voraussetzungen

- GitHub MCP Server muss laufen auf `http://localhost:3002`
- GitHub Token muss konfiguriert sein
- Repository muss existieren

## Test starten

```bash
npm test
```

oder

```bash
node github-test.js
```

## Erwartete Ausgabe

```
🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪
🚀 Starting GitHub MCP Test Agent
🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪

============================================================
🧪 Testing GitHub MCP Connection
============================================================
✅ Connection successful!
   User: patrickschlueer
   Repo: patrickschlueer/ai_mcp_test

============================================================
📝 STEP A: Create Branch
============================================================

🔧 Calling create_branch...
   ✅ Success!
   ✅ Branch created: test/github-mcp-1234567890

============================================================
🔍 STEP B: Select File
============================================================

🔧 Calling get_tree...
   ✅ Success!
   Found 5 items in root:
     📄 README.md
     📁 test-app
     📄 package.json
     ...

============================================================
✏️  STEP C: Modify File
============================================================
   ✅ Added timestamp to existing file

============================================================
💾 STEP D: Commit Changes
============================================================

🔧 Calling commit_file...
   ✅ Success!
   ✅ File committed!

============================================================
📬 STEP E: Create Pull Request
============================================================

🔧 Calling create_pull_request...
   ✅ Success!
   ✅ Pull Request created!
   PR #123: 🧪 Test: GitHub MCP Workflow Test
   URL: https://github.com/patrickschlueer/ai_mcp_test/pull/123

============================================================
🎉 ALL TESTS PASSED!
============================================================

📋 Summary:
   Branch: test/github-mcp-1234567890
   File: README.md
   Commit: abc123def456...
   PR: https://github.com/patrickschlueer/ai_mcp_test/pull/123

✅ GitHub MCP is working perfectly!
```

## Fehlerbehandlung

Wenn ein Schritt fehlschlägt, zeigt der Agent:
- ❌ Welcher Schritt fehlgeschlagen ist
- 📝 Fehlermeldung
- 🔍 Stack-Trace für Debugging

## Nach dem Test

Der Test erstellt:
- Einen Branch `test/github-mcp-[timestamp]`
- Einen Commit mit Test-Änderungen
- Einen Pull Request

Du kannst:
1. Den PR reviewen unter der angezeigten URL
2. Den PR mergen oder schließen
3. Den Test-Branch löschen (optional)

## Troubleshooting

### "Connection refused"
→ GitHub MCP Server läuft nicht. Starte ihn mit:
```bash
cd C:\Users\patri\OneDrive\Desktop\AITest\mcp-servers\github
npm start
```

### "404 Not Found"
→ Tool existiert nicht. Überprüfe die GitHub MCP Tools:
```bash
curl http://localhost:3002/tools
```

### "401 Unauthorized"
→ GitHub Token ungültig. Überprüfe `.env` im GitHub MCP Server.

## Verwendung als Basis

Dieser Test-Agent kann als Basis für andere Agents verwendet werden:

```javascript
import { callGitHubTool } from './github-test.js';

// Verwende die Funktionen in deinem Agent
await callGitHubTool('create_branch', { ... });
await callGitHubTool('commit_file', { ... });
```
