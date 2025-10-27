# 🚀 Agent-Team Setup Guide

Vollständige Anleitung zum Aufsetzen des Multi-Agent Systems mit Jira, GitHub und Claude.

---

## 📋 Inhaltsverzeichnis

1. [Voraussetzungen](#-voraussetzungen)
2. [API Keys & Tokens beschaffen](#-api-keys--tokens-beschaffen)
3. [Environment Files einrichten](#-environment-files-einrichten)
4. [Installation & Start](#-installation--start)
5. [Troubleshooting](#-troubleshooting)

---

## 🔧 Voraussetzungen

### Software
- **Node.js** v18+ und npm
- **Git** (für GitHub Integration)
- Ein **Jira Workspace** (Cloud-Version)
- Ein **GitHub Repository**
- Ein **Anthropic API Key** (für Claude)

### Accounts
- Jira Cloud Account (Admin-Rechte empfohlen)
- GitHub Account mit Repository-Zugriff
- Anthropic Account mit API-Zugang

---

## 🔑 API Keys & Tokens beschaffen

### 1. Anthropic API Key (Claude)

**Was:** API-Zugriff für Claude AI Model

**Wo:** [Anthropic Console](https://console.anthropic.com/)

**Schritte:**
1. Gehe zu https://console.anthropic.com/
2. Einloggen / Account erstellen
3. Navigation: `Settings` → `API Keys`
4. Klicke auf `Create Key`
5. Kopiere den Key (sieht aus wie `sk-ant-api03-...`)

**Kosten:**
- Pay-as-you-go: ~$3-15 per million tokens (Claude Sonnet 4)
- Credits für neue Accounts verfügbar

**Wichtig:** ⚠️ Key NIEMALS in Git committen!

---

### 2. Jira API Token

**Was:** Authentifizierung für Jira REST API

**Wo:** [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)

**Schritte:**
1. Gehe zu https://id.atlassian.com/manage-profile/security/api-tokens
2. Klicke auf `Create API token`
3. Gib einen Namen ein (z.B. "Agent Team")
4. Kopiere das generierte Token (wird nur einmal angezeigt!)

**Format:** Base64 encoded `email:token`

**Wichtig:** 
- Token ist personengebunden (verwende Service-Account wenn möglich)
- Token läuft nicht ab, kann aber jederzeit widerrufen werden

---

### 3. GitHub Personal Access Token (PAT)

**Was:** Authentifizierung für GitHub API

**Wo:** [GitHub Settings → Developer Settings](https://github.com/settings/tokens)

**Schritte:**
1. Gehe zu https://github.com/settings/tokens
2. Klicke auf `Generate new token` → `Generate new token (classic)`
3. **Wichtig:** Wähle folgende Scopes aus:
   - ✅ `repo` (Full control of private repositories)
     - `repo:status`
     - `repo_deployment`
     - `public_repo`
     - `repo:invite`
   - ✅ `workflow` (Update GitHub Action workflows)
   - ✅ `write:packages` (Upload packages to GitHub Package Registry)
   - ✅ `read:org` (Read org and team membership)
4. Setze ein Expiration Date (empfohlen: 90 days, für Production: no expiration)
5. Klicke `Generate token`
6. Kopiere den Token (beginnt mit `ghp_...` oder `github_pat_...`)

**Wichtig:**
- Token wird nur einmal angezeigt - sofort sichern!
- Verwende einen Bot-Account für Production

---

### 4. Jira Workspace Details

**Was du brauchst:**
- **Workspace URL** (z.B. `https://yourcompany.atlassian.net`)
- **Project Key** (z.B. `AT`, `PROJ`, etc.)

**Wo finden:**
1. Gehe zu deinem Jira Board
2. Workspace URL steht in der Browser-Adresse
3. Project Key findest du in jedem Ticket (z.B. `AT-123` → Key ist `AT`)

---

### 5. GitHub Repository Details

**Was du brauchst:**
- **Repository Owner** (GitHub Username oder Organisation)
- **Repository Name**

**Beispiel:**
- URL: `https://github.com/microsoft/vscode`
- Owner: `microsoft`
- Repo: `vscode`

---

## 📁 Environment Files einrichten

### Struktur

Das Projekt benötigt **4 separate `.env` Dateien**:

```
AITest/
├── agents/
│   ├── coder/.env          # Coder Agent
│   ├── reviewer/.env       # Review Agent
│   └── tpo/.env           # TPO Agent
├── mcp-servers/
│   ├── github/.env        # GitHub MCP Server
│   └── jira/.env          # Jira MCP Server
└── event-hub/.env         # Event Hub
```

---

### 1. Event Hub (`.env`)

**Pfad:** `AITest/event-hub/.env`

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# CORS (falls Frontend auf anderem Port läuft)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**Erklärung:**
- `PORT`: Port auf dem der Event Hub läuft (Standard: 3000)
- `ALLOWED_ORIGINS`: Comma-separated Liste von erlaubten Frontend-URLs

---

### 2. Jira MCP Server (`.env`)

**Pfad:** `AITest/mcp-servers/jira/.env`

```bash
# Jira Configuration
JIRA_DOMAIN=yourcompany.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your_jira_api_token_here

# MCP Server Configuration
PORT=3001
NODE_ENV=development

# Optional: Default Project
DEFAULT_PROJECT_KEY=AT
```

**Wo bekomme ich die Werte:**

| Variable | Wo finden | Beispiel |
|----------|-----------|----------|
| `JIRA_DOMAIN` | Browser-URL deines Jira | `yourcompany.atlassian.net` |
| `JIRA_EMAIL` | Deine Jira Email-Adresse | `patrick@company.com` |
| `JIRA_API_TOKEN` | Siehe [Jira API Token](#2-jira-api-token) | `ATATT3xFf...` |
| `DEFAULT_PROJECT_KEY` | Ticket-Präfix in Jira | `AT` (von AT-123) |

**Test ob es funktioniert:**
```bash
cd mcp-servers/jira
npm start
# Öffne http://localhost:3001/health
```

---

### 3. GitHub MCP Server (`.env`)

**Pfad:** `AITest/mcp-servers/github/.env`

```bash
# GitHub Configuration
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repository-name

# MCP Server Configuration
PORT=3002
NODE_ENV=development

# Optional: Default Branch
DEFAULT_BRANCH=main
```

**Wo bekomme ich die Werte:**

| Variable | Wo finden | Beispiel |
|----------|-----------|----------|
| `GITHUB_TOKEN` | Siehe [GitHub PAT](#3-github-personal-access-token-pat) | `ghp_abc123...` |
| `GITHUB_OWNER` | GitHub Username/Org | `patrickschlueer` |
| `GITHUB_REPO` | Repository Name | `agent-test` |
| `DEFAULT_BRANCH` | Haupt-Branch Name | `main` oder `master` |

**Test ob es funktioniert:**
```bash
cd mcp-servers/github
npm start
# Öffne http://localhost:3002/health
```

---

### 4. TPO Agent (`.env`)

**Pfad:** `AITest/agents/tpo/.env`

```bash
# Anthropic API
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Agent Identity
AGENT_NAME=TPO Agent
AGENT_EMOJI=🎯

# Service URLs
JIRA_MCP_SERVER_URL=http://localhost:3001
EVENT_HUB_URL=http://localhost:3000

# Jira Project
JIRA_PROJECT_KEY=AT
```

**Erklärung:**
- `ANTHROPIC_API_KEY`: Siehe [Anthropic API Key](#1-anthropic-api-key-claude)
- `AGENT_NAME`: Anzeigename des Agents (kann angepasst werden)
- `AGENT_EMOJI`: Emoji für UI (optional anpassbar)
- `JIRA_MCP_SERVER_URL`: URL des Jira MCP Servers (Standard: localhost:3001)
- `EVENT_HUB_URL`: URL des Event Hubs (Standard: localhost:3000)
- `JIRA_PROJECT_KEY`: Dein Jira Project Key

---

### 5. Coder Agent (`.env`)

**Pfad:** `AITest/agents/coder/.env`

```bash
# Anthropic API
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Agent Identity
AGENT_NAME=Coder Agent
AGENT_EMOJI=👨‍💻

# Service URLs
JIRA_MCP_SERVER_URL=http://localhost:3001
GITHUB_MCP_SERVER_URL=http://localhost:3002
EVENT_HUB_URL=http://localhost:3000

# Jira Project
JIRA_PROJECT_KEY=AT
```

**Gleiche Keys wie TPO Agent, plus:**
- `GITHUB_MCP_SERVER_URL`: URL des GitHub MCP Servers

---

### 6. Review Agent (`.env`)

**Pfad:** `AITest/agents/reviewer/.env`

```bash
# Anthropic API
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Agent Identity
AGENT_NAME=Review Agent
AGENT_EMOJI=🔍

# Service URLs
JIRA_MCP_SERVER_URL=http://localhost:3001
GITHUB_MCP_SERVER_URL=http://localhost:3002
EVENT_HUB_URL=http://localhost:3000

# Jira Project (optional, falls benötigt)
JIRA_PROJECT_KEY=AT
```

---

## 📦 Installation & Start

### 1. Dependencies installieren

```bash
# Root-Level
cd AITest
npm install

# Event Hub
cd event-hub
npm install

# MCP Servers
cd ../mcp-servers/jira
npm install

cd ../github
npm install

# Agents
cd ../../agents/tpo
npm install

cd ../coder
npm install

cd ../reviewer
npm install
```

### 2. Environment Files validieren

**Checklist:**
- [ ] Alle 6 `.env` Dateien erstellt
- [ ] Alle API Keys eingetragen
- [ ] Keine Tippfehler in URLs
- [ ] Ports sind frei (3000, 3001, 3002)

**Quick Test Script:**
```bash
# Erstelle test-env.js im Root
node test-env.js
```

<details>
<summary>📄 test-env.js Code</summary>

```javascript
// test-env.js
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const envFiles = [
  'event-hub/.env',
  'mcp-servers/jira/.env',
  'mcp-servers/github/.env',
  'agents/tpo/.env',
  'agents/coder/.env',
  'agents/reviewer/.env'
];

console.log('🔍 Checking .env files...\n');

let allGood = true;

for (const file of envFiles) {
  const path = resolve(file);
  const exists = existsSync(path);
  
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  
  if (exists) {
    dotenv.config({ path });
    // Check for critical keys
    if (file.includes('agent')) {
      if (!process.env.ANTHROPIC_API_KEY) {
        console.log(`   ⚠️  Missing ANTHROPIC_API_KEY`);
        allGood = false;
      }
    }
  } else {
    allGood = false;
  }
}

console.log(`\n${allGood ? '✅ All good!' : '❌ Some files missing or incomplete'}`);
```
</details>

### 3. Services starten

**Option A: Manuell in separaten Terminals**

```bash
# Terminal 1 - Event Hub
cd event-hub
npm start

# Terminal 2 - Jira MCP Server
cd mcp-servers/jira
npm start

# Terminal 3 - GitHub MCP Server
cd mcp-servers/github
npm start

# Terminal 4 - TPO Agent
cd agents/tpo
npm start

# Terminal 5 - Coder Agent
cd agents/coder
npm start

# Terminal 6 - Review Agent
cd agents/reviewer
npm start
```

**Option B: Mit Process Manager (empfohlen)**

```bash
# Installiere PM2
npm install -g pm2

# Starte alle Services
pm2 start ecosystem.config.cjs

# Status prüfen
pm2 status

# Logs anschauen
pm2 logs

# Stoppen
pm2 stop all
```

<details>
<summary>📄 ecosystem.config.cjs</summary>

```javascript
module.exports = {
  apps: [
    {
      name: 'event-hub',
      cwd: './event-hub',
      script: 'server.js',
      watch: false
    },
    {
      name: 'jira-mcp',
      cwd: './mcp-servers/jira',
      script: 'server.js',
      watch: false
    },
    {
      name: 'github-mcp',
      cwd: './mcp-servers/github',
      script: 'server.js',
      watch: false
    },
    {
      name: 'tpo-agent',
      cwd: './agents/tpo',
      script: 'agent.js',
      watch: false
    },
    {
      name: 'coder-agent',
      cwd: './agents/coder',
      script: 'agent.js',
      watch: false
    },
    {
      name: 'review-agent',
      cwd: './agents/reviewer',
      script: 'agent.js',
      watch: false
    }
  ]
};
```
</details>

### 4. Health Checks

Prüfe ob alle Services laufen:

```bash
# Event Hub
curl http://localhost:3000/health

# Jira MCP
curl http://localhost:3001/health

# GitHub MCP
curl http://localhost:3002/health
```

Expected Response:
```json
{
  "status": "ok",
  "service": "..."
}
```

---

## 🔥 Troubleshooting

### Problem: "ANTHROPIC_API_KEY is not set"

**Lösung:**
1. Prüfe ob `.env` Datei existiert
2. Prüfe Schreibweise: `ANTHROPIC_API_KEY` (nicht `ANTHROPIC_KEY`)
3. Key muss mit `sk-ant-api03-` beginnen
4. Keine Anführungszeichen um den Key

```bash
# Richtig:
ANTHROPIC_API_KEY=sk-ant-api03-abc123...

# Falsch:
ANTHROPIC_API_KEY="sk-ant-api03-abc123..."
```

---

### Problem: "Failed to connect to Jira"

**Mögliche Ursachen:**
1. **Domain falsch:** Muss `yourcompany.atlassian.net` sein (ohne `https://`)
2. **Email falsch:** Muss die Email sein mit der du dich in Jira anmeldest
3. **API Token abgelaufen/falsch:** Erstelle neuen Token

**Test:**
```bash
# Test Jira Connection
curl -u your-email@company.com:your_api_token \
  https://yourcompany.atlassian.net/rest/api/3/myself
```

---

### Problem: "GitHub API rate limit exceeded"

**Ursache:** GitHub erlaubt nur 60 requests/hour ohne Token

**Lösung:**
1. Prüfe ob `GITHUB_TOKEN` gesetzt ist
2. Token muss Scope `repo` haben
3. Verwende einen Bot-Account für höhere Limits

---

### Problem: "Port 3000 already in use"

**Lösung:**
```bash
# Finde Prozess auf Port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill -9
```

Oder ändere den Port in der `.env`:
```bash
PORT=3010
```

---

### Problem: "Module not found"

**Lösung:**
```bash
# Dependencies neu installieren
rm -rf node_modules package-lock.json
npm install
```

---

### Problem: Agent läuft aber macht nichts

**Checklist:**
1. Ist der Ticket-Status korrekt? (TPO: "Offen", Coder: "To Do")
2. Hat der Agent die richtigen Jira-Projekt-Key?
3. Sind Event Hub + MCP Server erreichbar?
4. Check Agent Logs für Fehler

**Debug Mode aktivieren:**
```bash
# In Agent .env
NODE_ENV=development
DEBUG=true
```

---

## 🔒 Sicherheit Best Practices

### API Keys schützen

1. **Niemals committen:**
```bash
# .gitignore überprüfen
cat .gitignore

# Sollte enthalten:
.env
.env.*
*.env
```

2. **Für Production: Secrets Manager verwenden**
   - AWS Secrets Manager
   - Azure Key Vault
   - GitHub Secrets (für GitHub Actions)

3. **Keys regelmäßig rotieren**
   - Anthropic: Alle 90 Tage
   - GitHub PAT: Alle 90 Tage
   - Jira: Bei Verdacht auf Kompromittierung

4. **Least Privilege Principle**
   - GitHub Token: Nur benötigte Scopes
   - Jira: Service-Account mit minimalen Rechten

---

## 📚 Weitere Ressourcen

- [Anthropic API Docs](https://docs.anthropic.com/)
- [Jira REST API Docs](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [GitHub REST API Docs](https://docs.github.com/en/rest)
- [Project README](../README.md)

---

## 🆘 Support

Bei Problemen:
1. Check die Logs: `pm2 logs` oder Terminal-Output
2. Prüfe Health Endpoints
3. Validiere `.env` Dateien
4. Erstelle ein Issue auf GitHub

---

**Happy Agent Teamwork! 🤖🤝**