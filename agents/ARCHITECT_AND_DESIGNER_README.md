# 🏛️ Software Architect & 🎨 UI Designer Agents

Diese beiden Agenten bearbeiten Sub-Tasks die vom Technical Product Owner erstellt wurden.

## 📋 Workflow

### Software Architect Agent (🏛️)
1. **Findet** Architecture Sub-Tasks (Label: `architecture`, Emoji: 🏛️)
2. **Liest** Parent-Task + Sub-Task Beschreibung
3. **Analysiert** relevanten Code via GitHub MCP
4. **Erstellt** initiale Architektur-Ausarbeitung → Kommentar im Sub-Task
5. **Iteriert** 3x: Selbst-Review & Verbesserung → jeweils neuer Kommentar
6. **Dokumentiert** finale Erkenntnisse im Parent-Task (Kommentar + Beschreibung)
7. **Completed** Sub-Task auf "Done" → verschwindet aus Dashboard

### UI Designer Agent (🎨)
1. **Findet** UI-Design Sub-Tasks (Label: `ui-design`, Emoji: 🎨)
2. **Liest** Parent-Task + Sub-Task Beschreibung
3. **Analysiert** Frontend-Code via GitHub MCP
4. **Erstellt** initiale UI-Design Spezifikation → Kommentar im Sub-Task
5. **Iteriert** 3x: Selbst-Review & Verbesserung → jeweils neuer Kommentar
6. **Dokumentiert** finale Erkenntnisse im Parent-Task (Kommentar + Beschreibung)
7. **Completed** Sub-Task auf "Done" → verschwindet aus Dashboard

## 🚀 Setup

### 1. Software Architect Agent

```bash
cd agents/software-architect
npm install
```

Kopiere deine Anthropic API Key in `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

Starte den Agent:
```bash
npm start
```

### 2. UI Designer Agent

```bash
cd agents/ui-designer
npm install
```

Kopiere deine Anthropic API Key in `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

Starte den Agent:
```bash
npm start
```

## 📊 Im Dashboard sichtbar

- Sub-Tasks erscheinen in der **"Sub-Tasks (Agent Work)"** Section
- Nach Completion (Status: Done) verschwinden sie aus dem Dashboard
- Finale Erkenntnisse sind im Parent-Task dokumentiert

## 🔄 Iterationen

Beide Agenten durchlaufen **3 Iterationen**:

**Iteration 0:** Initiale Ausarbeitung
- Erste Analyse basierend auf Code + Requirements
- Posted als Kommentar im Sub-Task

**Iteration 1-3:** Verbesserungen
- Agent reviewt seine eigene Arbeit kritisch
- Verbessert Vollständigkeit, Best Practices, Performance, Security
- Jede Iteration = neuer Kommentar im Sub-Task

**Finale Dokumentation:**
- Kommentar im Parent-Task mit allen Erkenntnissen
- Parent-Task Beschreibung wird erweitert mit finalen Details
- Sub-Task wird auf "Done" gesetzt

## 🎯 Beispiel-Flow

```
1. Tech PO finalisiert AT-6
   ↓
2. Tech PO erstellt Sub-Tasks:
   - AT-7: 🏛️ Architektur: Feature X
   - AT-8: 🎨 UI-Design: Feature X
   ↓
3. Architect Agent (🏛️) findet AT-7
   ↓
4. Architect erstellt Architektur-Design (4 Kommentare total)
   ↓
5. Designer Agent (🎨) findet AT-8
   ↓
6. Designer erstellt UI-Spezifikation (4 Kommentare total)
   ↓
7. Beide dokumentieren in AT-6
   ↓
8. AT-7 & AT-8 → Done (verschwinden aus Dashboard)
   ↓
9. AT-6 hat jetzt vollständige Architektur + Design Docs! ✅
```

## 🔧 Anpassungen

### Anzahl Iterationen ändern

In `agent.js` beide Agenten:
```javascript
this.maxIterations = 3; // Ändere auf gewünschte Anzahl
```

### Polling-Intervall ändern

```javascript
new SoftwareArchitectAgent().run(30); // 30 Sekunden
new UIDesignerAgent().run(30); // 30 Sekunden
```

## 📝 Logs

Beide Agenten loggen ausführlich:
- Welche Sub-Tasks gefunden wurden
- Welche Files gelesen wurden
- Fortschritt der Iterationen
- Dokumentation im Parent-Task
- Completion Status

## ⚠️ Wichtig

- Beide Agenten benötigen laufende MCP Server (Jira + GitHub)
- Event Hub muss laufen für Dashboard-Kommunikation
- API Key muss valide sein
- Sub-Tasks müssen die richtigen Labels haben (`architecture` oder `ui-design`)
