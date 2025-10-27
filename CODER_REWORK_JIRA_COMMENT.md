# 🔧 Coder Agent - Rework Start Jira Comment

## ✅ Neue Funktionalität

Der Coder Agent postet jetzt automatisch einen Jira-Kommentar, wenn er mit dem Rework eines PRs beginnt.

## 📝 Kommentar-Format

```markdown
👨‍💻 *Rework Started!*

Ich arbeite jetzt an den Änderungen die vom Review Agent angefordert wurden.

🔗 **Pull Request**: https://github.com/.../pull/3
🔍 **Review Status**: CHANGES_REQUESTED

## 🔧 Änderungen die umgesetzt werden (4):

1. FEHLENDE .spec.ts FILES: Viele neu erstellte Dateien haben keine entsprechenden Test-Dateien...
2. MULTIPLE INTERFACES PRO FILE: In models/user.model.ts und models/filter.model.ts sind mehrere...
3. COMPONENT >400 ZEILEN: user-list.component.ts hat über 400 Zeilen und sollte in kleinere...
4. STRUKTURELLER KONFLIKT: Es gibt sowohl app.module.ts (neu erstellt) als auch bestehende...

## ✅ Nächste Schritte
1. Implementiere die geforderten Änderungen
2. Update den Pull Request
3. Warte auf erneutes Review

---
_Rework gestartet am 2025-10-27T15:30:00.000Z_
```

## 🔄 Workflow

### 1. Review Agent postet Review
```markdown
🔍 **Code Review - Iteration 1**

## 🚨 Critical Issues
- Issue 1
- Issue 2

## ⚠️ Major Improvements
- Improvement 1
- Improvement 2

⚠️ **Recommendation**: Please fix critical/major issues
```

### 2. Review Agent setzt Ticket auf "To Do"
```javascript
await this.callMCPTool('jira', 'update_ticket', {
  ticketKey,
  updates: { status: 'To Do' }
});
```

### 3. Coder Agent findet Ticket
```
👨‍💻 Checking for ready tickets...
   Found 1 ready ticket(s)
```

### 4. Coder findet existierenden PR
```
👨‍💻 Checking for existing PR...
   ✅ Found existing PR #3
   🌿 Branch: feature/AT-13-user-filter
```

### 5. Coder liest PR-Feedback
```
👨‍💻 Reading PR feedback...
   ✅ Read 1 comment(s)
   📋 Found 1 review comment(s) from Review Agent
   📊 Review Status: CHANGES_REQUESTED
   🔧 Requested Changes (4):
      1. FEHLENDE .spec.ts FILES: ...
      2. MULTIPLE INTERFACES PRO FILE: ...
      3. COMPONENT >400 ZEILEN: ...
      4. STRUKTURELLER KONFLIKT: ...
```

### 6. 🆕 Coder postet Jira-Kommentar
```
👨‍💻 Posting rework start comment to Jira...
   ✅ Rework start comment posted to Jira
```

### 7. Coder implementiert Fixes
```
👨‍💻 Planning implementation...
👨‍💻 Implementing test-app/src/app/models/user.model.ts...
👨‍💻 Implementing test-app/src/app/models/filter.model.ts...
...
```

### 8. Coder updated PR
```
👨‍💻 Updating existing PR with fixes...
   ✅ PR #3 updated with fixes
```

## 🎯 Beispiel Jira-Ticket Timeline

```
AT-13: Implement User Filter Functionality
Status: In Arbeit

Comments:
┌─────────────────────────────────────────────────────┐
│ 🔍 Review Agent - 2025-10-27 15:00                  │
│ *Code Review Complete!*                             │
│                                                     │
│ Der Pull Request wurde reviewed                     │
│ ⚠️ Changes Requested                                │
│ Siehe PR für Details                                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 👨‍💻 Coder Agent - 2025-10-27 15:30 🆕               │
│ *Rework Started!*                                   │
│                                                     │
│ Ich arbeite an den Änderungen vom Review Agent     │
│                                                     │
│ 🔧 Änderungen (4):                                  │
│ 1. FEHLENDE .spec.ts FILES: ...                     │
│ 2. MULTIPLE INTERFACES PRO FILE: ...               │
│ 3. COMPONENT >400 ZEILEN: ...                       │
│ 4. STRUKTURELLER KONFLIKT: ...                      │
│                                                     │
│ ✅ Nächste Schritte                                 │
│ 1. Implementiere Änderungen                         │
│ 2. Update Pull Request                              │
│ 3. Warte auf Re-Review                              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 👨‍💻 Coder Agent - 2025-10-27 15:45                 │
│ *Code Fixes Applied!*                               │
│                                                     │
│ Die Review-Feedback wurde umgesetzt                 │
│ PR wurde aktualisiert                               │
│                                                     │
│ ✅ Nächste Schritte                                 │
│ Review Agent wird die Änderungen reviewen           │
└─────────────────────────────────────────────────────┘
```

## 📊 Dashboard Events

**Neue Events:**
```javascript
{
  type: 'jira_comment_posted',
  message: 'Posted rework start comment to AT-13',
  details: '4 changes to address',
  activity: '📝 Updating Jira'
}
```

**Activity Stream:**
```
📖 Reading PR #3
✅ Analyzed PR #3
📝 Updating Jira          ← NEU!
🔧 Fixing AT-13
⚙️ Coding user.model.ts
⚙️ Coding filter.model.ts
✅ Updated PR #3
```

## 🎨 Formatierung

Der Kommentar nutzt:
- **Markdown Headers** (`##`) für Struktur
- **Emojis** für visuelle Klarheit
- **Nummerierte Listen** für Changes
- **Bold Text** für wichtige Info
- **Shortened Changes** (max 100 chars) für Lesbarkeit

## 💡 Benefits

✅ **Transparenz** - Team sieht sofort dass Rework gestartet wurde
✅ **Kontext** - Alle Changes sind im Ticket dokumentiert
✅ **Status** - Klar was als nächstes passiert
✅ **Timeline** - Jira zeigt kompletten Workflow
✅ **Kommunikation** - Keine zusätzliche Abstimmung nötig

## 🔧 Code-Änderungen

### Neue Methode: `postReworkStartComment()`
**Location:** Nach `postPRInfoToJira()`
**Lines:** ~50 neue Zeilen
**Parameters:**
- `ticket` - Jira Ticket Object
- `pullRequest` - GitHub PR Object
- `prFeedback` - Parsed PR Feedback

### Updated: `processTicket()`
**Change:** Ruft `postReworkStartComment()` auf bei Rework
**Line:** Nach `startWorkOnTicket()`, vor `sendEvent()`

## 🚀 Deployment

```bash
# Coder Agent neu starten
cd agents/coder
npm start
```

## 🧪 Testing

**Test Case: Rework mit 4 Changes**

1. Reviewer postet Review mit 4 Critical/Major Issues
2. Ticket wird auf "To Do" gesetzt
3. Coder findet Ticket und existierenden PR
4. Coder liest Feedback (4 changes)
5. ✅ Coder postet Jira-Kommentar mit allen 4 Changes
6. Coder implementiert Fixes
7. Coder updated PR

**Expected Jira Comment:**
```markdown
👨‍💻 *Rework Started!*

🔧 Änderungen die umgesetzt werden (4):

1. FEHLENDE .spec.ts FILES: ...
2. MULTIPLE INTERFACES PRO FILE: ...
3. COMPONENT >400 ZEILEN: ...
4. STRUKTURELLER KONFLIKT: ...

✅ Nächste Schritte
1. Implementiere die geforderten Änderungen
2. Update den Pull Request
3. Warte auf erneutes Review
```

---

**Status:** ✅ IMPLEMENTED
**Version:** 1.2
**Date:** 2025-10-27
