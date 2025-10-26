# 🚀 Schnellstart-Anleitung (Windows)

## Schritt 1: Node.js prüfen

Öffne **CMD** oder **PowerShell** und tippe:

```cmd
node --version
npm --version
```

**Erwartete Ausgabe:**
```
v18.x.x (oder höher)
9.x.x (oder höher)
```

❌ **Falls nicht installiert**: Download von https://nodejs.org

## Schritt 2: Backend starten

```cmd
cd C:\Users\patri\OneDrive\Desktop\AITest\test-app\backend
npm install
npm start
```

**Erfolgreich wenn du siehst:**
```
🚀 CRUD API Server started successfully!
📍 Server running on: http://localhost:3000
```

✅ **Lass dieses Terminal offen!**

## Schritt 3: Frontend starten (Neues Terminal)

Öffne ein **zweites Terminal** (neues CMD/PowerShell Fenster):

```cmd
cd C:\Users\patri\OneDrive\Desktop\AITest\test-app\frontend
npm install
```

**⚠️ Falls Angular CLI fehlt:**
```cmd
npm install -g @angular/cli
```

Dann starten:
```cmd
npm start
```

**Erfolgreich wenn du siehst:**
```
** Angular Live Development Server is listening on localhost:4200 **
✔ Compiled successfully.
```

## Schritt 4: Browser öffnen

Öffne deinen Browser und gehe zu:

```
http://localhost:4200
```

Du solltest jetzt die User Management App sehen! 🎉

## Schritt 5: Testen

1. Klicke auf **"Add New User"**
2. Füge Name und Email ein
3. Klicke **"Create User"**
4. User sollte in der Tabelle erscheinen
5. Teste **Edit** und **Delete**

## Schnell-Befehle (Copy & Paste)

### Backend starten (ein Terminal):
```cmd
cd C:\Users\patri\OneDrive\Desktop\AITest\test-app\backend && npm install && npm start
```

### Frontend starten (zweites Terminal):
```cmd
cd C:\Users\patri\OneDrive\Desktop\AITest\test-app\frontend && npm install && npm start
```

## Probleme?

### "npm: command not found"
➡️ Node.js ist nicht installiert: https://nodejs.org

### "Port 3000 already in use"
```cmd
netstat -ano | findstr :3000
taskkill /PID <die_gefundene_PID> /F
```

### "Cannot find module '@angular/cli'"
```cmd
npm install -g @angular/cli
```

### App zeigt keine Daten
➡️ Prüfe ob Backend läuft: http://localhost:3000/api/health

## 🎯 Nächste Schritte

✅ Backend läuft  
✅ Frontend läuft  
✅ App funktioniert  

**Jetzt kannst du:**
1. Jira-Tickets erstellen für neue Features
2. MCP Server implementieren
3. Agents aufsetzen

## Stoppen der Server

**Beide Terminals:** Drücke `Ctrl + C`
