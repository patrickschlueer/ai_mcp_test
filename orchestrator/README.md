# 🎭 Agent Orchestrator

Zentrales Koordinationssystem für alle AI-Agenten.

## 🏗️ Architektur

```
┌─────────────────────────────────────────┐
│         AGENT ORCHESTRATOR              │
│  (Ein Prozess, koordiniert alles)      │
│                                         │
│  ┌─────────┐  ┌──────────┐  ┌────────┐│
│  │Tech PO  │  │Architect │  │Designer││
│  │ Worker  │  │  Worker  │  │ Worker ││
│  └─────────┘  └──────────┘  └────────┘│
└──────────────────┬──────────────────────┘
                   │
                   ▼
   ┌───────────────────────────────────────┐
   │    MCP Servers + Event Hub            │
   └───────────────────────────────────────┘
```

## ✨ Features

- ✅ **Ein einziger Prozess** für alle Agenten
- ✅ **Zentrales Management** - ein `npm start` startet alles
- ✅ **Koordinierte Ausführung** - Agenten laufen nacheinander
- ✅ **Status Monitoring** - Sehe welcher Agent was macht
- ✅ **Gemeinsame MCP Verbindungen** - effizient
- ✅ **Error Handling** - zentral & robust
- ✅ **Einfach erweiterbar** - neue Agenten hinzufügen ist trivial

## 🚀 Setup

### 1. Installation

```bash
cd orchestrator
npm install
```

### 2. API Key konfigurieren

Öffne `.env` und trage deinen Anthropic API Key ein:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Starten

```bash
npm start
```

**Das war's!** 🎉 Alle 3 Agenten laufen jetzt koordiniert in einem Prozess.

## 📊 Output

Der Orchestrator zeigt dir genau was passiert:

```
🎭 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎭 Coordination Cycle @ 10:30:15
🎭 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Tech PO: Checking for "To Do" tickets...
   Found 1 ticket(s) to analyze
   ✅ AT-9 analyzed

🎯 Tech PO: Checking for "Approved" tickets...
   Found 1 approved ticket(s) to check
   ✅ AT-6 finalized

🏛️ Architect: Checking for architecture sub-tasks...
   Found 1 architecture sub-task(s)
   ✅ AT-7 completed

🎨 Designer: Checking for design sub-tasks...
   Found 1 design sub-task(s)
   ✅ AT-8 completed

🎭 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎭 Agent Status Summary:
🎭 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🎯 Technical Product Owner
      Status: 💤 idle
      Tasks Processed: 2
      Last Active: 10:30:25
   
   🏛️ Software Architect
      Status: 💤 idle
      Tasks Processed: 1
      Last Active: 10:30:40
   
   🎨 UI Designer
      Status: 💤 idle
      Tasks Processed: 1
      Last Active: 10:30:55
🎭 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎭 Sleeping for 30s...
```

## ⚙️ Konfiguration

### Polling Intervall ändern

In `.env`:

```env
# Sekunden zwischen Coordination Cycles
POLLING_INTERVAL=30
```

### Neue Agenten hinzufügen

In `orchestrator.js`:

```javascript
// 1. Import
import MyNewAgent from '../agents/my-new-agent/agent.js';

// 2. In initializeAgents()
const myAgent = new MyNewAgent();
this.agents.set('my-agent', myAgent);
this.agentStatus.set('my-agent', {
  name: 'My New Agent',
  emoji: '🤖',
  status: 'idle',
  lastActive: new Date().toISOString(),
  tasksProcessed: 0
});

// 3. Neue Cycle-Methode
async runMyAgentCycle() {
  console.log(`\n🤖 My Agent: Checking for work...`);
  const agent = this.agents.get('my-agent');
  
  try {
    this.updateAgentStatus('my-agent', 'active');
    
    const tasks = await agent.getTasks();
    
    for (const task of tasks) {
      await agent.processTask(task);
      this.updateAgentStatus('my-agent', 'active', { tasksProcessed: 1 });
    }
    
    this.updateAgentStatus('my-agent', 'idle');
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
    this.updateAgentStatus('my-agent', 'error');
  }
}

// 4. In coordinationCycle()
await this.runMyAgentCycle();
```

## 🔧 Troubleshooting

### Orchestrator startet nicht

- Prüfe ob alle Dependencies installiert sind: `npm install`
- Prüfe ob API Key gesetzt ist in `.env`
- Prüfe ob MCP Server & Event Hub laufen

### Agent findet keine Tickets

- Prüfe Jira-Verbindung: `curl http://localhost:3001/health`
- Prüfe ob Tickets im richtigen Status sind
- Schaue in die Agent-Logs im Orchestrator Output

### "Module not found" Fehler

- Prüfe ob alle Agent-Ordner existieren:
  - `agents/technical-product-owner/`
  - `agents/software-architect/`
  - `agents/ui-designer/`
- Prüfe ob `agent.js` in jedem Ordner existiert

## 📝 Vorteile vs. Separate Agenten

### ❌ Vorher (3 separate Prozesse):

```bash
# Terminal 1
cd agents/technical-product-owner && npm start

# Terminal 2
cd agents/software-architect && npm start

# Terminal 3
cd agents/ui-designer && npm start
```

**Probleme:**
- 3 Terminals managen
- 3x separate API Verbindungen
- Keine Koordination
- Schwer zu debuggen
- Kompliziert zu deployen

### ✅ Jetzt (1 Orchestrator):

```bash
# Ein Terminal
cd orchestrator && npm start
```

**Vorteile:**
- Ein Terminal
- Gemeinsame Ressourcen
- Zentrale Koordination
- Einfaches Debugging
- Simple Deployment
- Status-Übersicht
- Error-Handling zentral

## 🎯 Nächste Schritte

1. **Testen:** Starte Orchestrator und beobachte die Coordination Cycles
2. **Jira Tickets:** Erstelle Test-Tickets in verschiedenen Stati
3. **Dashboard:** Schaue im Dashboard wie die Agenten arbeiten
4. **Erweitern:** Füge eigene Agenten hinzu!

## 💡 Tipps

- **Logs lesen:** Der Orchestrator zeigt genau was passiert
- **Status prüfen:** Agent Status Summary nach jedem Cycle
- **Intervall anpassen:** 30s sind gut zum Testen, in Produktion evtl. kürzer
- **Error Recovery:** Orchestrator läuft weiter auch wenn ein Agent fehlschlägt

## 📚 Weitere Docs

- Tech PO Agent: `../agents/technical-product-owner/README.md`
- Architect Agent: `../agents/ARCHITECT_AND_DESIGNER_README.md`
- Designer Agent: `../agents/ARCHITECT_AND_DESIGNER_README.md`
