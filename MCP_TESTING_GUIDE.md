# 🧪 MCP Server Status Testing Guide

## Was wurde gefixt:

### ✅ Problem 1: Live Updates funktionieren nicht
**Ursache:** Dashboard empfing WebSocket Messages, aber Status wurde nicht aktualisiert

**Lösung:**
- Status-Änderungen werden jetzt als Events zur Timeline hinzugefügt
- Console Logs im Dashboard zeigen alle Updates
- Browser Console (F12) zeigt jetzt alle WebSocket Messages

### ✅ Problem 2: Shutdown nicht sofort sichtbar
**Ursache:** Status-Änderung wurde nicht in Event History gespeichert

**Lösung:**
- Shutdown Events werden in History gespeichert
- Broadcast funktioniert jetzt zuverlässig
- Status-Änderungen erscheinen in MCP Activity Timeline

### ✅ Problem 3: Offline Status nicht sichtbar
**Ursache:** Status-Änderungs-Events wurden nicht zur Timeline hinzugefügt

**Lösung:**
- Alle Status-Änderungen (online → offline, idle, etc.) erscheinen jetzt als Events
- Event-Namen: "🔴 Shutdown", "🟢 Started", "🔄 Status Changed"

## 🧪 Testing Schritte:

### Schritt 1: Alle Services neu starten

**Terminal 1 - Event Hub:**
```bash
cd C:\Users\patri\OneDrive\Desktop\AITest\event-hub
npm start
```

**Terminal 2 - Dashboard:**
```bash
cd C:\Users\patri\OneDrive\Desktop\AITest\dashboard
npm start
```

**Terminal 3 - Jira MCP:**
```bash
cd C:\Users\patri\OneDrive\Desktop\AITest\mcp-servers\jira-confluence
npm start
```

**Terminal 4 - GitHub MCP:**
```bash
cd C:\Users\patri\OneDrive\Desktop\AITest\mcp-servers\github
npm start
```

### Schritt 2: Dashboard öffnen
- Öffne http://localhost:4200
- Öffne Browser Console (F12 → Console Tab)

### Schritt 3: Live Updates testen

**Was du sehen solltest im Dashboard:**
- ✅ "🟢 Connected" Status oben links
- ✅ 2 MCP Servers als "online"
- ✅ Events in der MCP Activity Timeline

**Was du sehen solltest in der Browser Console:**
```
✅ WebSocket connected
📩 WebSocket message received: initial_state
📡 MCP Servers updated: [...]
📩 WebSocket message received: mcp_event
📡 MCP event: server_started
```

### Schritt 4: Graceful Shutdown testen

**Stoppe den Jira MCP Server:**
1. Gehe zu Terminal 3 (Jira MCP)
2. Drücke `Ctrl+C`

**Was du SOFORT sehen solltest:**

**Im Jira MCP Terminal:**
```
⚠️  Shutting down Jira/Confluence MCP Server...
```

**Im Event Hub Terminal:**
```
🔴 Jira/Confluence MCP is shutting down gracefully
📤 Broadcasting: mcp_status_change
```

**Im Dashboard (sofort, ohne F5):**
- ✅ Jira MCP Server Status Badge wird ROT "offline"
- ✅ MCP Activity Timeline zeigt neuen Event: "🔴 Shutdown - Server is shutting down"
- ✅ "1 online" anstatt "2 online" in der Statistik

**In der Browser Console:**
```
📩 WebSocket message received: mcp_event
📡 MCP event: server_shutdown
📡 MCP Servers updated: [...]
📩 WebSocket message received: mcp_status_change
🔄 Status change: {...}
✅ MCP Server Jira/Confluence MCP status: online → offline
```

### Schritt 5: Server neu starten testen

**Starte Jira MCP wieder:**
```bash
cd C:\Users\patri\OneDrive\Desktop\AITest\mcp-servers\jira-confluence
npm start
```

**Was du SOFORT sehen solltest im Dashboard:**
- ✅ Jira MCP Status Badge wird GRÜN "online"
- ✅ MCP Activity Timeline zeigt: "🟢 Started - Jira/Confluence MCP started on port 3001"
- ✅ "2 online" in der Statistik

### Schritt 6: Crash Simulation testen

**Töte GitHub MCP unsanft:**
1. Gehe zum GitHub MCP Terminal
2. **NICHT** Ctrl+C drücken
3. Schließe das Terminal-Fenster direkt oder Task Manager → Prozess beenden

**Was du sehen solltest:**
- ⏱️ Nach ca. 90 Sekunden: GitHub MCP wird als "offline" markiert
- ✅ MCP Activity Timeline zeigt: "🔴 Shutdown - Server went offline (timeout)"

## 📊 Was in der Browser Console zu sehen sein sollte:

### Bei normalem Betrieb (alle 25s):
```
(Keine Heartbeat Messages - die werden gefiltert)
```

### Bei Server Start:
```
📩 WebSocket message received: mcp_event
📡 MCP event: server_started
📡 MCP Servers updated: [{id: "jira-mcp-001", status: "online", ...}]
📋 Events updated, total: 5
```

### Bei Graceful Shutdown:
```
📩 WebSocket message received: mcp_event
📡 MCP event: server_shutdown
📋 Events updated, total: 6
📩 WebSocket message received: mcp_status_change
🔄 Status change: {type: "mcp_status_change", serverId: "jira-mcp-001", status: "offline"}
✅ MCP Server Jira/Confluence MCP status: online → offline
📡 MCP Servers updated: [{id: "jira-mcp-001", status: "offline", ...}]
📋 Events updated, total: 7
```

## ✅ Success Criteria:

1. **Live Updates:** Dashboard aktualisiert sich OHNE F5
2. **Sofortiges Shutdown:** Status ändert sich innerhalb von 1 Sekunde
3. **Shutdown in Timeline:** "🔴 Shutdown" Event erscheint in MCP Activity
4. **Restart funktioniert:** Server wird sofort als "online" angezeigt
5. **Crash Detection:** Nach 90s wird Server als "offline" markiert
6. **Keine Heartbeat Spam:** Timeline zeigt nur echte Events, keine Heartbeats

## 🐛 Debugging:

**Falls Updates nicht ankommen:**
1. Öffne Browser Console (F12)
2. Schaue nach `📩 WebSocket message received` Messages
3. Wenn keine Messages ankommen → Event Hub neu starten
4. Wenn Messages ankommen aber UI nicht updated → Dashboard neu laden (Ctrl+Shift+R)

**Falls MCP Server nicht offline geht:**
1. Schaue im Event Hub Terminal nach `📤 Broadcasting: mcp_status_change`
2. Schaue im MCP Terminal nach `⚠️  Shutting down...`
3. Prüfe ob `/mcp/shutdown` Endpoint erreichbar ist: `curl -X POST http://localhost:3000/mcp/shutdown -H "Content-Type: application/json" -d "{\"serverId\":\"test\"}"`
