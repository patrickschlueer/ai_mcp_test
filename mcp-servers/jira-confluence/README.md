# Jira/Confluence MCP Server

MCP (Model Context Protocol) Server für die Integration von Jira und Confluence mit AI Agents.

## 🎯 Was macht dieser Server?

Dieser MCP Server stellt **Tools** bereit, die Claude (oder andere AI Agents) nutzen können um:
- ✅ Jira Tickets abzurufen
- ✅ Tickets zu aktualisieren  
- ✅ Kommentare hinzuzufügen
- ✅ Status zu ändern
- ✅ Confluence Seiten zu erstellen/aktualisieren

## 🚀 Quick Start

### 1. Dependencies installieren

```bash
cd C:\Users\patri\OneDrive\Desktop\AITest\mcp-servers\jira-confluence
npm install
```

### 2. Verbindung testen

```bash
npm test
```

**Erwartete Ausgabe:**
```
✅ Connection successful!
   User: Patrick Schlüer
   Email: patrickschlueer@googlemail.com
✅ Found 3 tickets
   - AT-1: [Ticket Name]
   - AT-2: [Ticket Name]
   - AT-3: [Ticket Name]
```

### 3. Server starten

```bash
npm start
```

Server läuft auf: **http://localhost:3001**

## 🔌 Verfügbare Tools

### 1. **get_tickets**
Alle Tickets aus Jira abrufen (mit Filtern)

```bash
POST http://localhost:3001/tools/get_tickets
Content-Type: application/json

{
  "status": "To Do",
  "assignee": "UNASSIGNED",
  "maxResults": 10
}
```

### 2. **get_ticket**
Einzelnes Ticket abrufen

```bash
POST http://localhost:3001/tools/get_ticket
Content-Type: application/json

{
  "ticketKey": "AT-1"
}
```

### 3. **update_ticket**
Ticket aktualisieren

```bash
POST http://localhost:3001/tools/update_ticket
Content-Type: application/json

{
  "ticketKey": "AT-1",
  "updates": {
    "status": "In Progress",
    "summary": "Updated title"
  }
}
```

### 4. **add_comment**
Kommentar zu Ticket hinzufügen

```bash
POST http://localhost:3001/tools/add_comment
Content-Type: application/json

{
  "ticketKey": "AT-1",
  "comment": "Work started by Developer Agent"
}
```

### 5. **update_confluence_page**
Confluence Seite erstellen/aktualisieren

```bash
POST http://localhost:3001/tools/update_confluence_page
Content-Type: application/json

{
  "title": "Sprint Progress",
  "content": "<h1>Sprint Progress</h1><p>Updated by Agent</p>"
}
```

## 📊 Tool Catalog

Alle verfügbaren Tools anzeigen:

```bash
GET http://localhost:3001/tools
```

Das ist wichtig für Agents - hier sehen sie welche Tools verfügbar sind!

## 🧪 Testen mit cURL (Windows CMD)

```cmd
# Health Check
curl http://localhost:3001/health

# Connection Test
curl http://localhost:3001/test-connection

# Get Tickets
curl -X POST http://localhost:3001/tools/get_tickets ^
  -H "Content-Type: application/json" ^
  -d "{\"status\":\"To Do\"}"

# Get Single Ticket
curl -X POST http://localhost:3001/tools/get_ticket ^
  -H "Content-Type: application/json" ^
  -d "{\"ticketKey\":\"AT-1\"}"

# Add Comment
curl -X POST http://localhost:3001/tools/add_comment ^
  -H "Content-Type: application/json" ^
  -d "{\"ticketKey\":\"AT-1\",\"comment\":\"Test from MCP\"}"
```

## 🔑 Credentials

Die Credentials sind in der `.env` Datei gespeichert:

```
JIRA_HOST=patrickschlueer.atlassian.net
JIRA_EMAIL=patrickschlueer@googlemail.com
JIRA_API_TOKEN=ATATT3xFfGF0...
JIRA_PROJECT_KEY=AT
```

## 🏗️ Architektur

```
┌─────────────────┐
│  Claude Agent   │
└────────┬────────┘
         │ Calls Tool
         ▼
┌─────────────────┐
│  MCP Server     │ ← Du bist hier!
│  (Port 3001)    │
└────────┬────────┘
         │ API Calls
         ▼
┌─────────────────┐
│ Jira/Confluence │
│  (Cloud)        │
└─────────────────┘
```

## 📝 Wie Agents den Server nutzen

**Beispiel Workflow:**

1. **Agent**: "Ich will alle offenen Tickets sehen"
2. **Agent** ruft Tool: `get_tickets({ status: "To Do" })`
3. **MCP Server** macht Jira API Call
4. **Agent** bekommt Tickets zurück
5. **Agent**: "Ich bearbeite AT-1"
6. **Agent** ruft Tool: `add_comment({ ticketKey: "AT-1", comment: "Started implementation" })`

## 🛠️ Troubleshooting

### Problem: "Connection failed"

**Lösung 1:** API Token prüfen
- Gehe zu: https://id.atlassian.com/manage-profile/security/api-tokens
- Erstelle neuen Token
- Update `.env` Datei

**Lösung 2:** Email prüfen
- Stelle sicher dass Email korrekt ist in `.env`

**Lösung 3:** Jira Site URL prüfen
- Format: `deinname.atlassian.net` (ohne https://)

### Problem: "Ticket not found"

- Prüfe ob Project Key korrekt ist (`AT`)
- Prüfe ob Ticket existiert in Jira

### Problem: Port 3001 already in use

```bash
# Finde Process
netstat -ano | findstr :3001

# Töte Process
taskkill /PID <PID> /F
```

## 🎯 Nächste Schritte

1. ✅ MCP Server läuft
2. ✅ Verbindung zu Jira funktioniert
3. 🔄 **Nächster Schritt:** GitHub MCP Server
4. 🔄 **Danach:** Ersten Agent implementieren

## 📞 Support

Bei Problemen:
1. Prüfe `npm test` Output
2. Prüfe Server Logs
3. Teste Health Endpoint: http://localhost:3001/health
4. Prüfe Jira Web-Interface ob Tickets da sind

## ✅ Bereit!

Dein Jira/Confluence MCP Server ist ready! 🎉

Starte mit:
```bash
npm test    # Verbindung testen
npm start   # Server starten
```
