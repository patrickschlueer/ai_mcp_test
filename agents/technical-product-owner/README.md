# Technical Product Owner Agent 🎯

Der **Technical Product Owner Agent** - ein AI Agent der Jira Tickets **mit Code-Kontext** analysiert und informierte Business-Fragen stellt!

## 🎯 Was macht dieser Agent?

Dieser Agent ist die **Brücke zwischen Business und Tech**:

1. **Pollt Jira** alle 30 Sekunden nach neuen Tickets (Status: "To Do")
2. **Durchsucht GitHub** nach relevantem Code-Kontext
3. **Analysiert Tickets** mit Claude + bestehender Codebase
4. **Schätzt Story Points** basierend auf Code-Komplexität
5. **Stellt informierte Fragen** basierend auf dem was er im Code sieht
6. **Postet Analyse** als Kommentar ins Jira Ticket
7. **Wartet auf PM Antwort** ("approved" im Kommentar)
8. **Ändert Status** auf "In Progress" bei Approval

## 🚀 Was ist neu? (vs. Ticket Analyst)

### **Vorher: Blind** ❌
```
Agent: "Welche Berechtigungen soll Worker haben?"
→ Blind gefragt, ohne Code zu kennen
```

### **Jetzt: Mit Code-Kontext** ✅
```
Agent durchsucht Code...
Findet: role: 'User' | 'Admin' | 'Manager'
Agent: "Ich sehe User, Admin und Manager Rollen im Code. 
       Welche Permissions soll Worker haben - ähnlich wie User?"
→ Informierte Frage basierend auf bestehendem Code!
```

## 📊 Beispiel-Workflow

```
Ticket: "Add Worker Role"
         ↓
Agent durchsucht GitHub:
  ✅ Findet: user.service.ts
  ✅ Liest: role: 'User' | 'Admin' | 'Manager'
  ✅ Findet: Permissions-System
         ↓
Agent analysiert mit Claude + Code-Kontext:
  🎯 Story Points: 3
  🎯 Complexity: niedrig
  🎯 Code Insights: "System hat bereits 3 Rollen"
         ↓
Agent stellt SMARTE Fragen:
  ✅ "Worker soll zwischen User und Manager sein?"
  ✅ "Worker braucht Read-Only wie User?"
  ✅ "Reports müssen Worker-Filter bekommen?"
         ↓
PM antwortet: "approved"
         ↓
Status → "In Progress"
```

## 🚀 Setup

### 1. Dependencies installieren

```bash
cd C:\Users\patri\OneDrive\Desktop\AITest\agents\technical-product-owner
npm install
```

### 2. MCP Server müssen laufen! ⚠️

**WICHTIG:** Beide MCP Server müssen laufen!

```bash
# Terminal 1: Jira MCP
cd C:\Users\patri\OneDrive\Desktop\AITest\mcp-servers\jira-confluence
npm start

# Terminal 2: GitHub MCP
cd C:\Users\patri\OneDrive\Desktop\AITest\mcp-servers\github
npm start
```

### 3. Agent testen

```bash
npm test
```

**Das passiert:**
- Agent holt "To Do" Tickets
- Durchsucht GitHub nach relevantem Code
- Liest relevante Files
- Analysiert mit Code-Kontext
- Postet informierten Kommentar

## 🧪 Beispiel-Output

```
🎯 Technical Product Owner Agent initialized
   Jira MCP: http://localhost:3001
   GitHub MCP: http://localhost:3002
   Project: AT

🎯 Checking for new tickets...
   Found 1 new ticket(s)

============================================================
🎯 Processing Ticket: AT-5
============================================================

🎯 Gathering code context...
   ✅ Repository accessible
   Keywords: role, user, worker
   Found 3 results for "role"
   ✅ Read: frontend/src/app/user.service.ts
   ✅ Read: backend/models/user.model.js
   ✅ Gathered context from 2 files

🎯 Analyzing ticket: AT-5
   Summary: Add Worker Role
   ✅ Analysis complete:
      Story Points: 3
      Complexity: niedrig
      Questions: 3

🎯 Posting analysis to AT-5...
   ✅ Comment posted successfully
```

**Kommentar in Jira:**

```
🎯 Technical Product Owner Analysis

Story Points: 3
Complexity: niedrig
Clarity: unklar

Code Insights:
• System hat bereits 3 Rollen: User, Admin, Manager
• Rollen werden im user.service.ts als TypeScript Union Type definiert
• Permissions-System ist bereits implementiert

Questions for Project Manager:
1. Ich sehe User, Admin und Manager Rollen im Code. Soll Worker zwischen User und Manager positioniert werden?
2. Welche konkreten Berechtigungen soll Worker haben - ähnlich Read-Only wie User oder mehr?
3. Im Code sehe ich dass Rollen in Dropdowns angezeigt werden. Soll Worker dort ebenfalls erscheinen?

Recommendation: Das Ticket ist gut verständlich, benötigt aber Klärung der Worker-Permissions basierend auf den bestehenden Rollen im System.
```

## 🔧 Konfiguration

In der `.env` Datei:

```env
# Agent Info
AGENT_NAME=Technical Product Owner Agent
AGENT_EMOJI=🎯

# Claude API
ANTHROPIC_API_KEY=sk-ant-api03-...

# MCP Servers (beide!)
JIRA_MCP_SERVER_URL=http://localhost:3001
GITHUB_MCP_SERVER_URL=http://localhost:3002

# Jira Project
JIRA_PROJECT_KEY=AT
```

## 💡 Warum Code-Zugriff?

### Ohne Code (vorher):
```
❌ "Welche Berechtigungen braucht Worker?"
❌ "Wo soll Worker in der Liste stehen?"
❌ "Sind andere Komponenten betroffen?"
→ Blindes Raten!
```

### Mit Code (jetzt):
```
✅ Liest: role: 'User' | 'Admin' | 'Manager'
✅ Sieht: Permissions-System existiert
✅ Findet: Dropdown-Komponente
→ Stellt informierte Fragen basierend auf Realität!
```

## 🎯 Agent-Rolle

Der **Technical Product Owner** ist:
- ✅ Brücke zwischen Business und Tech
- ✅ Versteht Business-Anforderungen
- ✅ Kennt den bestehenden Code
- ✅ Stellt smarte, realitätsbasierte Fragen
- ✅ Fokussiert auf Business (NICHT auf technische Implementierung!)

**Fragen die er stellt:**
- ✅ Business-Logik & Requirements
- ✅ Berechtigungen & Rollen
- ✅ Acceptance Criteria
- ✅ Unterschiede zu bestehendem Code

**Fragen die er NICHT stellt:**
- ❌ UI/UX Design (macht Designer Agent)
- ❌ Technische Implementierung (macht Developer Agent)
- ❌ Datenbank-Schema (macht Architect Agent)
- ❌ Code-Validierung (macht Developer Agent)

## 📈 Nächste Schritte

Wenn der Agent läuft:

1. ✅ **Technical Product Owner** funktioniert
2. 🔄 **Architect Agent** bauen (nutzt auch GitHub)
3. 🔄 **Developer Agent** (schreibt echten Code)
4. 🔄 **Orchestrator** (koordiniert alle Agents)

## 🐛 Troubleshooting

### "Error calling github:get_tree"

**Problem:** GitHub MCP Server läuft nicht

**Lösung:**
```bash
cd C:\Users\patri\OneDrive\Desktop\AITest\mcp-servers\github
npm start
```

### "No code context gathered"

**Problem:** GitHub MCP Server offline oder Repository leer

**Lösung:**
- Prüfe GitHub MCP läuft
- Teste: `http://localhost:3002/test-connection`
- Prüfe Code in Repository

### Agent stellt keine Code-basierten Fragen

**Problem:** Code-Kontext nicht richtig gesammelt

**Lösung:**
- Prüfe Keywords-Extraktion im Log
- Prüfe ob relevante Files gefunden wurden
- Eventuell Keywords im Ticket klarer machen

## 🎉 Erfolg!

Wenn du einen Kommentar mit **Code Insights** in Jira siehst → **ERFOLG!** 🎉

Dein Technical Product Owner Agent:
- ✅ Kann Code lesen
- ✅ Versteht die Codebase
- ✅ Stellt informierte Fragen
- ✅ Ist Brücke zwischen Business und Tech

**Das ist der Unterschied zwischen einem dummen und einem smarten Agent!** 🚀
