# 🎨 AI Agent Control Center - PM Dashboard

## ✨ Neue Features

### 1. **Approval Queue** ⏳
- Zeigt alle Tickets die auf PM-Approval warten
- Direkt-Links zu Jira Tickets
- Story Points und Complexity sichtbar
- PM-Fragen werden angezeigt

### 2. **Detailed Agent Cards** 🤖
- Aktueller Status und Activity
- Timeline mit letzten 15 Events
- Bessere Event-Beschreibungen mit Icons
- Live Updates (kein F5 nötig)

### 3. **Jira Integration** 🔗
- Klickbare Ticket-Links
- Direkter Sprung zu Jira
- Ticket Key angezeigt

### 4. **Besseres Layout** 📐
- 3-Spalten Layout (breiter)
- Approval Queue featured oben
- Agents in der Mitte
- System Panel rechts
- Responsive für verschiedene Bildschirmgrößen

### 5. **Global Timeline** 📊
- Alle Events (Agents + MCP) chronologisch
- Scrollbar für mehr Events
- Bessere Übersicht

## 🎯 Für Project Manager

### Approval Workflow:

1. **Agent analysiert Ticket**
   - Agent liest Code
   - Agent nutzt AGENT_DOCUMENTATION.md
   - Agent erstellt Analyse

2. **Ticket erscheint in Approval Queue**
   - PM sieht Ticket in lila Box oben
   - Story Points, Complexity, Questions sichtbar
   - Klick auf Ticket Key → Jira öffnet sich

3. **PM beantwortet Fragen in Jira**
   - PM liest Agent-Kommentar in Jira
   - PM beantwortet Fragen
   - PM schreibt "approved" wenn fertig

4. **Agent wartet auf "approved"**
   - (TODO: Agent muss noch "approved" erkennen)
   - Dann weiter mit Implementierung

## ⚙️ Konfiguration

### Jira URL einstellen:

In `src/app/app.component.ts` Zeile 31:
```typescript
jiraBaseUrl = 'https://patrickschlueer.atlassian.net/browse';
```

Ersetze `your-domain` mit deiner Jira Domain.

Oder besser: In `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  jiraBaseUrl: 'https://patrickschlueer.atlassian.net/browse'
};
```

## 🚀 Starten

```bash
cd C:\Users\patri\OneDrive\Desktop\AITest\dashboard
npm start
```

Öffne: http://localhost:4200

## 📊 Dashboard Bereiche

### Top Navbar
- Connection Status
- Stats: Active Agents, MCP Servers, Awaiting Approval, Total Events

### Approval Queue (Lila Box)
- **WAS:** Tickets die auf PM warten
- **ZEIGT:** Ticket Key, Summary, Agent, Story Points, Questions
- **AKTION:** Klick auf Ticket Key → Jira öffnet

### Agent Cards (Mitte)
- **WAS:** Alle aktiven Agents
- **ZEIGT:** Status, Current Activity, Recent Timeline
- **UPDATE:** Live (kein F5 nötig)

### System Panel (Rechts)
- **MCP Servers:** Status aller MCP Server
- **Global Timeline:** Alle Events chronologisch

## 🎨 Farben & Status

### Agent Status:
- 🟢 **Active** - Arbeitet gerade
- 🟡 **Idle** - Wartet auf Arbeit
- 🔴 **Offline** - Nicht verbunden

### MCP Server Status:
- 🟢 **Online** - Läuft
- 🔴 **Offline** - Gestoppt

### Event Colors:
- 🔵 **Blau** - In Progress (Analyzing, Reading)
- 🟢 **Grün** - Success (Complete, Posted)
- 🟡 **Gelb** - Warning (Idle, Status Change)
- 🔴 **Rot** - Error (Failed, Shutdown)
- 🟣 **Lila** - Documentation

## 📱 Responsive

- **Desktop (>1600px):** 3 Spalten
- **Tablet (1200-1600px):** 2 Spalten
- **Mobile (<1200px):** 1 Spalte

## 🔄 Live Updates

Das Dashboard aktualisiert sich automatisch via WebSocket:
- Kein F5 drücken nötig
- Neue Events erscheinen sofort
- Agent Status ändert sich live
- Approval Queue updated automatisch

## 🐛 Troubleshooting

### Dashboard zeigt keine Daten:
1. Event Hub läuft? → `http://localhost:3000/health`
2. WebSocket verbunden? → Browser Console: "✅ WebSocket connected"
3. F12 → Console → Schaue nach Fehlern

### Approval Queue leer:
1. Agent läuft?
2. Agent hat Tickets gefunden?
3. Agent hat Kommentar gepostet?
4. Schaue in "Global Timeline" nach Events

### Jira Links funktionieren nicht:
1. `jiraBaseUrl` in `app.component.ts` anpassen
2. Format: `https://your-domain.atlassian.net/browse`

## 🎯 Nächste Schritte

### TODO: Approval System vervollständigen
- [ ] Agent erkennt "approved" in Jira Comments
- [ ] Agent startet Implementierung nach Approval
- [ ] PM kann in Dashboard "Approve" Button klicken
- [ ] Dashboard sendet Approval an Agent

### TODO: Mehr Agent-Details
- [ ] Zeige vollen Kommentar-Text in Modal
- [ ] Code-Insights anzeigen
- [ ] Recommendation anzeigen

### TODO: Notifications
- [ ] Browser Notification wenn Ticket auf Approval wartet
- [ ] Sound bei neuen Tickets

---

**Version:** 2.0 - PM Control Center
**Datum:** 2025-10-26
**Für:** Project Managers & Technical Product Owners
