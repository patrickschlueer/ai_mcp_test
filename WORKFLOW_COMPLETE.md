# 🚀 Complete AI Agent Development Workflow

## 📋 Übersicht

Vollautomatischer Software-Entwicklungs-Workflow mit 5 spezialisierten AI-Agenten:

1. **🎯 Technical Product Owner** - Analysiert Tickets, stellt Fragen
2. **🏛️ Software Architect** - Erstellt High-Level Architektur-Design
3. **🎨 UI Designer** - Erstellt UI-Design Spezifikationen
4. **👨‍💻 Coder** - Implementiert Code-Änderungen
5. **🔍 Review Agent** - Reviewed Code und gibt konstruktives Feedback

## 🔄 Workflow

```
┌─────────────────────────────────────────────────────────┐
│ 1. TPO Agent: Analysiert "To Do" Tickets                │
│    → Stellt Fragen an PM                                │
│    → Wartet auf "Approved" Status                       │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 2. TPO Agent: Prüft Antworten                           │
│    → Entscheidet: Architect/Designer benötigt?          │
│    → Erstellt Sub-Tasks falls nötig                     │
└───────────────────┬─────────────────────────────────────┘
                    │
       ┌────────────┴────────────┐
       ▼                         ▼
┌─────────────────┐    ┌─────────────────┐
│ 3a. Architect   │    │ 3b. Designer    │
│    Sub-Task     │    │    Sub-Task     │
│    → Analyzes   │    │    → Creates    │
│    → Designs    │    │    → UI Spec    │
│    → Iterates   │    │    → Iterates   │
│    → Documents  │    │    → Documents  │
└────────┬────────┘    └────────┬────────┘
         │                      │
         └──────────┬───────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Warte bis alle Sub-Tasks "Fertig" sind               │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Coder Agent: Implementiert Code                      │
│    → Erstellt Feature-Branch                            │
│    → Liest Architektur & Design                         │
│    → Implementiert Änderungen                           │
│    → Erstellt Pull Request                              │
│    → Postet PR-Info in Jira                             │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Review Agent: Code Review                            │
│    → Reviewed Code (nicht zu streng!)                   │
│    → Kommentiert im PR                                  │
│    → Diskutiert mit Coder (optional)                    │
│    → Approved PR                                        │
│    → Update Jira                                        │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 7. Menschlicher Developer: Final Review & Merge         │
└─────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack Constraints

**WICHTIG:** Alle Agenten sind konfiguriert um folgende Tech Stack Constraints zu respektieren:

### Frontend
- **Angular** (kein React, Vue, etc.)
- **Custom CSS** (KEIN Angular Material, Bootstrap, Tailwind!)
- Nur eigene CSS-Styles

### Backend
- **Node.js**
- **Express** (falls nötig)
- KEINE zusätzlichen Frameworks

### Datenbank
- **In-Memory Node.js** (einfaches Array/Object)
- KEINE echte Datenbank
- Es sei denn, das Ticket erwähnt explizit eine DB-Migration

### 3rd Party Libraries
- **KEINE** zusätzlichen npm packages
- **KEINE** externen Libraries
- Nur eingebaute Node.js/Angular Module
- **Ausnahme:** Nur wenn der TPO es EXPLIZIT im Ticket angewiesen hat!

## 🚀 Installation & Start

### 1. Dependencies installieren

```bash
# Event Hub
cd event-hub
npm install

# Orchestrator
cd ../orchestrator
npm install

# Dashboard
cd ../dashboard
npm install

# Alle Agenten
cd ../agents/technical-product-owner && npm install
cd ../software-architect && npm install
cd ../ui-designer && npm install
cd ../coder && npm install
cd ../reviewer && npm install
```

### 2. Environment Variables konfigurieren

Für jeden Agent `.env` Datei erstellen (von `.env.example` kopieren):

```bash
# In jedem Agent-Verzeichnis
cp .env.example .env
# Dann ANTHROPIC_API_KEY eintragen
```

### 3. Agenten starten

**Empfohlene Reihenfolge:**

```bash
# Terminal 1: Event Hub
cd event-hub
npm start

# Terminal 2: Dashboard
cd dashboard
npm start

# Terminal 3: Orchestrator (startet alle Agenten)
cd orchestrator
npm start
```

**Oder einzeln starten:**

```bash
# Terminal 3: TPO Agent
cd agents/technical-product-owner
npm start

# Terminal 4: Architect Agent
cd agents/software-architect
npm start

# Terminal 5: Designer Agent
cd agents/ui-designer
npm start

# Terminal 6: Coder Agent
cd agents/coder
npm start

# Terminal 7: Review Agent
cd agents/reviewer
npm start
```

## 📊 Dashboard

Das Dashboard zeigt:
- **🟢 Active Agents** - Welche Agenten aktiv sind
- **⏳ Approval Queue** - Tickets die auf PM-Antworten warten
- **📋 Active Sub-Tasks** - Architecture/Design Sub-Tasks in Arbeit
- **✅ Approved Tickets** - Finalisierte Tickets
- **🔄 Recent Events** - Echtzeit-Events aller Agenten

**URL:** http://localhost:4200

## 🎯 Workflow-Details

### Phase 1: Ticket-Analyse (TPO)

1. TPO Agent holt "To Do" Tickets
2. Analysiert mit Claude:
   - Story Points
   - Komplexität
   - Code-Insights
   - Fragen an PM
3. Postet Analyse in Jira
4. Wartet auf "Approved" Status

### Phase 2: Finalisierung (TPO)

1. TPO prüft ob alle Fragen beantwortet wurden
2. Erstellt detaillierte Beschreibung
3. Entscheidet: Architect/Designer benötigt?
4. Erstellt Sub-Tasks falls nötig
5. Markiert Ticket als finalisiert

### Phase 3: Architecture (Optional)

1. Architect Agent holt "To Do" Sub-Tasks mit Label "architecture"
2. Liest Parent-Task + Code-Files
3. Erstellt High-Level Architektur-Design
4. 1 Iteration: Initial + Review
5. Dokumentiert im Parent-Task
6. Setzt Sub-Task auf "Fertig"

### Phase 4: UI-Design (Optional)

1. Designer Agent holt "To Do" Sub-Tasks mit Label "ui-design"
2. Liest Parent-Task + Frontend-Files
3. Erstellt UI-Design Spezifikation
4. 1 Iteration: Initial + Review
5. Dokumentiert im Parent-Task
6. Setzt Sub-Task auf "Fertig"

### Phase 5: Implementierung (Coder)

1. Coder Agent prüft:
   - Ticket finalisiert?
   - Alle Sub-Tasks "Fertig"?
2. Erstellt Feature-Branch
3. Liest Architektur & Design aus Parent-Task
4. Implementiert Code-Änderungen
5. Erstellt Pull Request
6. Postet PR-Info in Jira

### Phase 6: Code Review (Reviewer)

1. Review Agent holt offene PRs
2. Reviewed Code (nicht zu streng!)
3. Kommentiert im PR:
   - Critical Issues
   - Major Improvements
   - Minor Notes
   - What I Like
4. Approved PR falls empfohlen
5. Updated Jira mit Review-Info

### Phase 7: Final Merge (Mensch)

1. Menschlicher Developer sieht PR-Kommentar in Jira
2. Reviewed PR auf GitHub
3. Merged PR falls approved

## 🔧 Troubleshooting

### Agent läuft nicht

```bash
# Prüfe .env Datei
cat .env

# Prüfe API Key
echo $ANTHROPIC_API_KEY

# Prüfe Dependencies
npm install
```

### Tickets werden nicht verarbeitet

1. Prüfe Jira-Status: Muss "To Do" sein (nicht "Approved" für neue Tickets)
2. Prüfe ob Agent läuft: Dashboard zeigt "active"
3. Prüfe Logs im Terminal

### Sub-Tasks landen in Approval Queue

- **Problem gelöst!** Agenten senden jetzt KEINE `comment_posted` Events mehr für Sub-Tasks
- Dashboard filtert Sub-Tasks automatisch aus Approval Queue

### PR wird nicht erstellt

1. Prüfe ob alle Sub-Tasks "Fertig" sind
2. Prüfe ob Ticket finalisiert wurde (TPO Kommentar)
3. Prüfe GitHub MCP Server Verbindung

## 📝 Best Practices

### Für Product Manager

1. **Beantworte Fragen vollständig** - TPO prüft ob alle Fragen beantwortet wurden
2. **Setze Status auf "Approved"** - Nach Beantwortung der Fragen
3. **Gib Tech Stack an** - Falls neue Libraries benötigt werden

### Für Developer

1. **Review PR auf GitHub** - Nicht nur in Jira
2. **Prüfe Tech Stack Compliance** - Keine verbotenen Libs?
3. **Merge nach Human-Review** - Review Agent ist kein Ersatz!

## 🎉 Features

✅ Vollautomatischer Workflow von Ticket → PR  
✅ Echtzeit-Dashboard mit Live-Updates  
✅ Tech Stack Constraints in allen Agenten  
✅ Sub-Tasks für Architektur & Design  
✅ Konstruktives Code-Review  
✅ Jira-Integration mit Kommentaren  
✅ GitHub-Integration mit PRs  
✅ Event-basierte Kommunikation  

## 🔮 Future Improvements

- [ ] Testing Agent für automatische Tests
- [ ] Deployment Agent für CI/CD
- [ ] Documentation Agent für README/Docs
- [ ] Security Scanner Agent
- [ ] Performance Analyzer Agent

---

**Viel Erfolg mit deinem AI-Agenten-Team! 🚀**
