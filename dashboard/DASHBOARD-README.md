# AI Agent Dashboard 🎯

**Live-Monitoring für alle AI Agents und MCP Servers!**

## 🚀 Start

### 1. Event Hub muss laufen!
```bash
cd C:\Users\patri\OneDrive\Desktop\AITest\event-hub
npm install
npm start
```

### 2. Dashboard starten
```bash
cd C:\Users\patri\OneDrive\Desktop\AITest\dashboard
npm start
```

**Dashboard öffnet sich automatisch auf:** `http://localhost:4200`

## ✨ Was du siehst

- 🤖 **AI Agents** - Live Status & Activity
- 📡 **MCP Servers** - Online/Offline Status  
- 📊 **Activity Timeline** - Real-time Events
- ⚡ **Live Updates** - WebSocket Verbindung

## 🎯 System

```
Dashboard (4200) ← WebSocket → Event Hub (3000)
                                    ↑
                                    │
                          Agents & MCP Servers
```

## 📝 Nächste Schritte

Agents müssen noch integriert werden um zum Event Hub zu loggen!

Dann siehst du ALLES LIVE! 🚀
