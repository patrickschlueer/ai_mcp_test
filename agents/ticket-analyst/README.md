# Ticket Analyst Agent 🔍

Der erste AI Agent für dein PoC! Dieser Agent analysiert neue Jira Tickets und stellt Rückfragen.

## 🎯 Was macht dieser Agent?

1. **Pollt Jira** alle 30 Sekunden nach neuen Tickets (Status: "To Do")
2. **Analysiert** jedes neue Ticket mit Claude:
   - Schätzt Story Points
   - Bewertet Komplexität
   - Identifiziert fehlende Informationen
   - Stellt spezifische Fragen
3. **Postet Analyse** als Kommentar ins Jira Ticket
4. **Wartet auf PM Antwort** ("approved" im Kommentar)
5. **Ändert Status** auf "In Progress" bei Approval

## 🚀 Setup

### 1. Dependencies installieren

```bash
cd C:\Users\patri\OneDrive\Desktop\AITest\agents\ticket-analyst
npm install
```

### 2. Anthropic API Key hinzufügen

Bearbeite die `.env` Datei und füge deinen API Key ein:

```env
ANTHROPIC_API_KEY=sk-ant-api03-dein-echter-key
```

### 3. MCP Server muss laufen!

**WICHTIG:** Der Jira MCP Server muss laufen, sonst kann der Agent nicht mit Jira kommunizieren.

```bash
# In einem anderen Terminal:
cd C:\Users\patri\OneDrive\Desktop\AITest\mcp-servers\jira-confluence
npm start
```

## 🧪 Testen

### Einzelner Testlauf (empfohlen zuerst):

```bash
npm test
```

**Das passiert:**
- Agent holt alle "To Do" Tickets
- Analysiert das erste Ticket
- Postet Kommentar in Jira
- Stoppt dann

**Prüfe danach in Jira:**
- Gehe zu deinem Ticket (z.B. AT-1)
- Du solltest einen Kommentar vom Agent sehen
- Mit Story Points, Fragen, Empfehlungen

### Continuous Mode starten:

```bash
npm start
```

**Das passiert:**
- Agent läuft dauerhaft
- Prüft alle 30 Sekunden nach neuen Tickets
- Verarbeitet sie automatisch
- Prüft auf PM Approvals

**Stoppen:** Drücke `Ctrl+C`

## 📋 Workflow

### Schritt 1: Ticket erstellen

Erstelle ein Ticket in Jira:
```
Project: AT
Summary: Add user profile page
Description: Users should be able to view and edit their profile
Status: To Do
```

### Schritt 2: Agent analysiert

Der Agent findet das Ticket und postet z.B.:

```
🔍 Ticket Analysis Complete

Story Points: 5
Complexity: medium
Clarity: unclear

Missing Information:
• Avatar upload functionality
• Privacy settings

Questions for Project Manager:
1. Should users be able to upload profile pictures?
2. What profile fields are editable?
3. Are there any privacy/permissions considerations?

Please answer these questions and reply with "approved" when ready.

Recommendation: Split into smaller subtasks once requirements are clarified

---
Analyzed by Ticket Analyst Agent at 2025-10-26T12:30:00.000Z
```

### Schritt 3: PM antwortet

Du (als PM) antwortest im Kommentar:

```
Good questions! Here are the answers:
1. Yes, profile picture upload
2. Name, email, bio, avatar
3. Only user can edit their own profile

approved
```

### Schritt 4: Agent erkennt Approval

Der Agent:
- Sieht das "approved" im Kommentar
- Ändert Ticket Status → "In Progress"
- Ticket ist ready für den nächsten Agent (Technical Lead)

## 🔧 Konfiguration

In der `.env` Datei:

```env
# Agent Info
AGENT_NAME=Ticket Analyst Agent
AGENT_EMOJI=🔍

# Claude API
ANTHROPIC_API_KEY=sk-ant-api03-...

# MCP Server (wo läuft der Jira Connector?)
MCP_SERVER_URL=http://localhost:3001

# Jira Project
JIRA_PROJECT_KEY=AT
```

## 📊 Agent Logik

```
┌─────────────────┐
│ Neues Ticket    │ Status: To Do
│ AT-1            │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Agent pollt     │ Alle 30s
│ Jira            │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Claude          │ Analysiert Ticket
│ analysiert      │ - Story Points
└────────┬────────┘ - Fragen
         │          - Empfehlungen
         ▼
┌─────────────────┐
│ Kommentar       │ Wird ins Ticket
│ gepostet        │ geschrieben
└────────┬────────┘
         │
         ▼
    Wartet auf PM...
         │
         ▼
┌─────────────────┐
│ PM antwortet    │ "approved"
│ mit "approved"  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Status ändert   │ To Do → In Progress
│ sich            │
└─────────────────┘
```

## 💡 Tipps

### Test mit echtem Ticket:

1. Erstelle Ticket in Jira mit Status "To Do"
2. Lasse Felder absichtlich unklar (z.B. vage Beschreibung)
3. Starte Agent: `npm test`
4. Schau in Jira - Agent sollte gute Fragen stellen!

### Mehrere Tickets testen:

1. Erstelle 2-3 Tickets
2. Starte Agent: `npm start`
3. Agent verarbeitet alle nacheinander
4. Beantworte Fragen in Jira
5. Agent erkennt Approvals automatisch

### Debug:

Alle Logs werden in der Console angezeigt:
- 🔍 = Agent Action
- ✅ = Success
- ❌ = Error

## 🐛 Troubleshooting

### "Error calling MCP tool"

**Problem:** MCP Server läuft nicht

**Lösung:**
```bash
cd C:\Users\patri\OneDrive\Desktop\AITest\mcp-servers\jira-confluence
npm start
```

### "No new tickets found"

**Problem:** Keine Tickets mit Status "To Do" und unassigned

**Lösung:**
- Erstelle neues Ticket in Jira
- Status muss "To Do" sein
- Assignee muss leer sein

### "Anthropic API error"

**Problem:** API Key fehlt oder falsch

**Lösung:**
- Prüfe `.env` Datei
- API Key muss mit `sk-ant-api03-` beginnen
- Hole Key von: https://console.anthropic.com/

### "Failed to post comment"

**Problem:** Jira API Token falsch im MCP Server

**Lösung:**
- Prüfe MCP Server `.env`
- Token neu generieren in Jira

## 📈 Nächste Schritte

Wenn der Agent läuft:

1. ✅ **Ticket Analyst** funktioniert
2. 🔄 **Technical Lead Agent** bauen (erstellt Confluence Doku)
3. 🔄 **Orchestrator** bauen (koordiniert beide Agents)

## 🎉 Erfolg!

Wenn du einen Kommentar vom Agent in Jira siehst → **ERFOLG!** 🎉

Dein erster AI Agent läuft und analysiert Tickets autonom!
