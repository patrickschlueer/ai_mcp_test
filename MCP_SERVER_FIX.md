# 🔧 MCP Server Offline/Online Fix

## ✅ Was wurde behoben:

### Problem 1: MCP Server gehen nach 30-60s auf "Offline"
**Ursache:** 
- MCP Server senden alle 30s ein Heartbeat
- Event Hub prüft alle 10s nach Inaktivität >60s
- Race Condition: Heartbeat kam manchmal zu spät an

**Lösung:**
- ✅ Heartbeat Intervall von 30s → **25s reduziert**
- ✅ Stale Timeout von 60s → **90s erhöht** (3x Heartbeat Intervall)
- ✅ `lastSeen` Timestamp wird jetzt bei **JEDEM** Event aktualisiert (auch Heartbeat)
- ✅ Heartbeat Events werden nicht mehr im Event History gespeichert (weniger Spam)

### Problem 2: MCP Server gehen nicht auf "Offline" wenn sie gestoppt werden
**Ursache:**
- Keine explizite Abmeldung beim Shutdown

**Lösung:**
- ✅ Shutdown Hooks hinzugefügt (SIGINT, SIGTERM, SIGHUP)
- ✅ Neuer Endpoint `/mcp/shutdown` im Event Hub
- ✅ MCP Server melden sich explizit ab bei Ctrl+C

## 🚀 Wie es jetzt funktioniert:

### Normaler Betrieb:
```
MCP Server sendet alle 25s: "heartbeat" Event
     ↓
Event Hub aktualisiert lastSeen Timestamp
     ↓
Event Hub prüft alle 10s: lastSeen < 90s? → Status bleibt "online"
```

### Graceful Shutdown:
```
User drückt Ctrl+C
     ↓
MCP Server fängt SIGINT Signal ab
     ↓
MCP Server sendet POST /mcp/shutdown
     ↓
Event Hub setzt Status auf "offline"
     ↓
Dashboard zeigt sofort "offline"
```

### Crash / Netzwerk Ausfall:
```
MCP Server crashed (kein Heartbeat mehr)
     ↓
Event Hub wartet 90 Sekunden
     ↓
Kein Heartbeat erhalten → Status wird auf "offline" gesetzt
     ↓
Dashboard zeigt "offline"
```

## 📊 Timings:

| Event | Timing | Grund |
|-------|--------|-------|
| **Heartbeat** | Alle 25s | Regelmäßiges "I'm alive" Signal |
| **Stale Check** | Alle 10s | Prüfung auf inaktive Server |
| **Stale Timeout** | 90s | 3x Heartbeat Intervall = sicher |
| **Shutdown** | Sofort | Explizite Abmeldung |

## 🧪 Testen:

### Test 1: Normaler Betrieb
```bash
# Starte alle Services
# Warte 2-3 Minuten
# MCP Server sollten "online" bleiben
```

### Test 2: Graceful Shutdown
```bash
# Stoppe MCP Server mit Ctrl+C
# Dashboard sollte SOFORT "offline" anzeigen
```

### Test 3: Crash Simulation
```bash
# Töte MCP Server Prozess: Ctrl+Z oder Task Manager
# Dashboard sollte nach max. 90s "offline" anzeigen
```

## 📝 Änderungen:

### Event Hub (`event-hub/server.js`):
- ✅ `lastSeen` Update bei jedem Event (auch heartbeat)
- ✅ Stale Timeout: 60s → 90s
- ✅ Heartbeat Events nicht mehr in History
- ✅ Neuer Endpoint: `POST /mcp/shutdown`
- ✅ Bessere Console Logs bei Status-Änderungen

### MCP Server (beide):
- ✅ Heartbeat: 30s → 25s
- ✅ Shutdown Hooks (SIGINT, SIGTERM, SIGHUP)
- ✅ Graceful Shutdown Funktion
- ✅ POST /mcp/shutdown beim Beenden
- ✅ Bessere Console Logs

## 🎯 Ergebnis:

✅ MCP Server bleiben zuverlässig "online"  
✅ Sofortiges "offline" bei Ctrl+C  
✅ Automatisches "offline" nach 90s bei Crash  
✅ Weniger Spam in Event Timeline (keine Heartbeats)  
✅ Robuster gegen Race Conditions
