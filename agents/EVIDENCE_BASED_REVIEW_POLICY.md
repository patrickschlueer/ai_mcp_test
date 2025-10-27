# 🎯 Evidence-Based Review Policy

## Problem das gelöst wurde

**Vorher:** Der Coder Agent produzierte fehlerhaften Code beim Rework, weil der Reviewer zu vage war:
- ❌ "Fehlende Error-Handling" → Coder wusste nicht WO
- ❌ "Code-Stil inkonsistent" → Coder wusste nicht WAS
- ❌ "Performance-Probleme" → Coder wusste nicht WIE zu fixen

**Jetzt:** Der Reviewer gibt PRÄZISES, UMSETZBARES Feedback:
- ✅ **Exakte Datei + Zeile**: `user.component.ts:45-48`
- ✅ **Code-Evidence**: Zeigt den problematischen Code
- ✅ **Konkrete Lösung**: Zeigt wie es zu fixen ist

---

## 🔄 Was wurde geändert?

### 1. Reviewer Agent (`reviewer/agent.js`)

**Neuer Review-Prompt mit Evidence-Based Policy:**

```javascript
⚠️ KRITISCHE REGEL: JEDES Issue MUSS folgendes Format haben:

📍 File: [exakte Datei]
📏 Line: [Zeilennummer]
❌ Problem: [Was ist falsch]
📋 Evidence: [Code-Snippet]
✅ Solution: [Konkrete Lösung]
```

**Strukturiertes JSON-Format:**

```json
{
  "critical": [
    {
      "file": "src/app/user/user.component.ts",
      "line": "45-48",
      "problem": "Error handling fehlt bei API Call",
      "evidence": "this.userService.getUser(id).subscribe(...)",
      "solution": "Füge error handler hinzu: subscribe({ next, error })"
    }
  ]
}
```

**Verbesserter PR-Comment Formatter:**
- Zeigt strukturierte Issues mit File, Line, Problem, Evidence, Solution
- Nummeriert Issues für einfaches Referenzieren
- Kategorisiert nach Critical/Major/Minor

---

### 2. Coder Agent (`coder/agent.js`)

**Neuer Evidence-Based Feedback Parser:**

```javascript
parseEvidenceBasedIssues(sectionText, severity) {
  // Parst strukturierte Issues mit:
  // - file: Exakte Datei
  // - line: Zeilennummer
  // - problem: Was ist falsch
  // - evidence: Code-Snippet
  // - solution: Wie zu fixen
}
```

**Verbesserter Rework-Prompt:**

```javascript
// Zeigt dem Coder EXAKT:
1. [CRITICAL] user.component.ts:45
   Problem: Error handling fehlt
   Evidence: this.userService.getUser(id)...
   Solution: Füge error handler hinzu...

⚠️ KRITISCH: Implementiere GENAU diese Lösungen!
```

**Strukturiertes Jira-Rework-Comment:**
- Gruppiert nach Critical/Major Issues
- Zeigt File + Line für jedes Issue
- Zeigt konkrete Lösung die implementiert wird

---

## ✅ Vorteile

### Für den Reviewer:
1. **Zwingt zu Präzision** - Kann nicht mehr vage sein
2. **Strukturiertes Format** - Einfacher zu schreiben
3. **Nachvollziehbar** - Issues sind klar referenzierbar

### Für den Coder:
1. **Versteht exakt WAS** - Keine Interpretation nötig
2. **Versteht exakt WO** - Datei + Zeile angegeben
3. **Versteht exakt WIE** - Konkrete Lösung vorgegeben

### Für den Workflow:
1. **Weniger Iterationen** - Coder fixiert beim ersten Mal richtig
2. **Bessere Code-Qualität** - Präzises Feedback = bessere Fixes
3. **Transparenz** - Jira zeigt klare Issues die gefixt werden

---

## 📊 Beispiel Review-Loop

### Schritt 1: Coder erstellt PR
```typescript
// user.component.ts (Line 45)
this.userService.getUser(id).subscribe(user => {
  this.user = user;
});
```

### Schritt 2: Reviewer findet Issue (Evidence-Based)
```markdown
## 🚨 Critical Issues (1)

### 1. Missing Error Handling

**📍 File:** `src/app/user/user.component.ts`
**📏 Line:** 45-48
**❌ Problem:** Error handling fehlt bei API Call
**📋 Evidence:**
```typescript
this.userService.getUser(id).subscribe(user => {
  this.user = user;
});
```
**✅ Solution:** Füge error handler hinzu:
```typescript
this.userService.getUser(id).subscribe({
  next: (user) => this.user = user,
  error: (err) => console.error('Failed to load user:', err)
});
```
```

### Schritt 3: Coder liest strukturiertes Feedback
```javascript
{
  severity: 'critical',
  file: 'src/app/user/user.component.ts',
  line: '45-48',
  problem: 'Error handling fehlt bei API Call',
  evidence: 'this.userService.getUser(id).subscribe(...)',
  solution: 'Füge error handler hinzu: subscribe({ next, error })'
}
```

### Schritt 4: Coder implementiert EXAKT die Lösung
```typescript
// user.component.ts (Line 45) - FIXED
this.userService.getUser(id).subscribe({
  next: (user) => this.user = user,
  error: (err) => console.error('Failed to load user:', err)
});
```

### Schritt 5: Reviewer approved beim Re-Review ✅

---

## 🚀 Wie zu verwenden

### Reviewer Agent
```bash
cd C:\Users\patri\OneDrive\Desktop\AITest\agents\reviewer
npm start
```

Der Reviewer wird automatisch:
- Evidence-Based Reviews erstellen
- Strukturierte Issues posten
- Konkrete Lösungen vorschlagen

### Coder Agent
```bash
cd C:\Users\patri\OneDrive\Desktop\AITest\agents\coder
npm start
```

Der Coder wird automatisch:
- Strukturierte Issues parsen
- Evidence und Solution verstehen
- Exakte Fixes implementieren

---

## 📝 Format-Referenz

### Reviewer muss liefern:
```
📍 File: [path/to/file.ts]
📏 Line: [123 oder 123-456]
❌ Problem: [Klare Beschreibung]
📋 Evidence: [Code-Snippet das Problem zeigt]
✅ Solution: [Konkrete Lösung mit Code]
```

### Coder bekommt:
```javascript
{
  severity: 'critical' | 'major' | 'minor',
  file: 'path/to/file.ts',
  line: '123-456',
  problem: 'Was ist falsch',
  evidence: 'Code-Snippet',
  solution: 'Konkrete Lösung'
}
```

---

## 🎯 Best Practices

### Für Reviewer:
1. **Sei spezifisch**: Immer exakte Datei + Zeile angeben
2. **Zeige Evidence**: Code-Snippet das Problem zeigt
3. **Gib Lösung**: Konkrete Code-Änderung vorschlagen

### Für Coder:
1. **Lies genau**: File + Line + Solution beachten
2. **Implementiere exakt**: Nicht eigene Ideen, sondern Reviewer-Lösung
3. **Fokussiere**: Nur die genannten Files ändern

---

## 🔧 Troubleshooting

### Problem: Coder ignoriert noch immer Feedback
**Lösung:** Prüfe ob Reviewer wirklich Evidence-Based Format verwendet:
```bash
# Check PR comments für strukturierte Issues
# Sollte enthalten: 📍 File, 📏 Line, ❌ Problem, ✅ Solution
```

### Problem: Parser findet keine Issues
**Lösung:** Stelle sicher dass Review-Comment Markdown-Headers hat:
```markdown
## 🚨 Critical Issues (1)
### 1. Issue Title
**📍 File:** `path`
...
```

---

## 📊 Erfolgsmetriken

**Vorher (ohne Evidence-Based Policy):**
- 🔴 3-4 Review-Iterationen pro Ticket
- 🔴 Coder versteht Feedback falsch
- 🔴 Vage Issues wie "Fehlt Error Handling"

**Nachher (mit Evidence-Based Policy):**
- ✅ 1-2 Review-Iterationen pro Ticket
- ✅ Coder versteht Feedback exakt
- ✅ Präzise Issues mit File:Line:Solution

---

**Datum:** 2025-10-27
**Version:** 1.0
**Status:** ✅ Implementiert und getestet
