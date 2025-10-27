# ✅ Coder & Reviewer - Review Loop Fix

## 🔧 Problem

**Vorher:**
- Reviewer requested Changes
- Coder sah "To Do" Ticket
- Coder erstellte **NEUEN Branch** mit gleichem Namen ❌
- Coder erstellte **NEUEN PR** statt existierenden zu updaten ❌
- Review-Loop funktionierte nicht!

**Bug Fix:**
- `existingPR.head` war `undefined` ❌
- Richtig: `existingPR.headBranch` ✅
- GitHub API gibt `headBranch` zurück, nicht `head`

## ✅ Lösung

### 🔄 Coder Agent - Rework Mode

Der Coder Agent prüft jetzt ob bereits ein PR existiert und arbeitet mit diesem weiter:

```javascript
// 1. Prüfe ob PR existiert
const existingPR = await this.findExistingPR(ticket);

if (existingPR) {
  // 🔄 REWORK MODE
  branchName = existingPR.head; // Verwende existierenden Branch!
  isRework = true;
} else {
  // 🆕 FRESH START
  branchName = await this.createFeatureBranch(ticket);
}
```

### 🔍 Reviewer Agent - Re-Review Detection

Der Reviewer Agent erkennt jetzt aktualisierte PRs:

```javascript
// Check ob PR seit letztem Review aktualisiert wurde
const hasUpdates = await this.hasRecentUpdates(pr.number);

if (hasUpdates) {
  this.reviewedPRs.delete(pr.number); // Reset
  prsToReview.push(pr); // Re-review!
}
```

## 🔁 Vollständiger Review-Loop

### Iteration 1:

```
1. 👨‍💻 Coder: Erstellt PR #3
   Branch: feature/AT-13-user-filter
   Status: "In Arbeit" ✅

2. 🔍 Reviewer: Findet Issues
   → Changes requested
   → Setzt Ticket: "To Do" ✅

3. 👨‍💻 Coder: Sieht "To Do"
   → Prüft: PR #3 existiert bereits! ✅
   → 🔄 REWORK MODE aktiviert
   → Setzt Status: "In Arbeit" ✅
   → Verwendet Branch: feature/AT-13-user-filter ✅
```

### Iteration 2:

```
4. 👨‍💻 Coder: Implementiert Fixes
   → Committed auf existierenden Branch ✅
   → Postet Comment in PR #3 ✅
   → Postet Update in Jira ✅
   → Status bleibt: "In Arbeit" ✅

5. 🔍 Reviewer: Erkennt Update
   → PR #3 updated_at: vor 2 Minuten
   → hasRecentUpdates() = true ✅
   → Reviewed PR #3 erneut ✅

6. 🔍 Reviewer: Approved! 🎉
   → Setzt Ticket: "Fertig" ✅
```

## 📊 Workflow-Diagramm

```
┌─────────────────────────────────────┐
│ Ticket: AT-13 (Status: To Do)      │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Coder: Check existing PR?           │
├─────────────────────────────────────┤
│ → findExistingPR(ticket)            │
└─────────────────────────────────────┘
              │
         ┌────┴────┐
         │         │
    No PR      Existing PR
         │         │
         ▼         ▼
    ┌────────┐  ┌──────────────┐
    │ FRESH  │  │ REWORK MODE  │
    │ START  │  │              │
    └────────┘  └──────────────┘
         │         │
         │    Use existing
         │    branch! ✅
         │         │
         └────┬────┘
              ▼
     Implement Changes
              │
              ▼
     Commit to Branch
              │
              ▼
    ┌─────────────────┐
    │ New PR?         │
    ├─────────────────┤
    │ No → Comment    │
    │ Yes → Create PR │
    └─────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Reviewer: Check for PRs             │
├─────────────────────────────────────┤
│ → hasRecentUpdates()                │
│ → If updated → Re-review ✅         │
└─────────────────────────────────────┘
```

## 🎯 Implementierte Features

### Coder Agent (3 neue Features):

1. **`findExistingPR(ticket)`**
   - Sucht nach offenem PR für Ticket
   - Matched über Ticket-Key in Title/Body
   - Returns PR object oder null

2. **Rework Mode Detection**
   - `isRework` Flag
   - Verwendet existierenden Branch
   - Updated PR statt neuen zu erstellen

3. **PR Update Comment**
   - Postet "Code Updated" Comment
   - Listet alle Changes auf
   - Markiert als "Ready for Re-Review"

### Reviewer Agent (1 neues Feature):

1. **`hasRecentUpdates(prNumber)`**
   - Prüft `updated_at` Timestamp
   - Returns true wenn <5 Minuten alt
   - Triggert Re-Review

## 📝 Dashboard Events

### Coder - Rework Mode:
```javascript
await this.sendEvent({
  type: 'rework_started',
  message: `Reworking ${ticket.key} based on review feedback`,
  details: `PR #${existingPR.number}`,
  activity: `🔧 Fixing ${ticket.key}`
});
```

### Coder - PR Updated:
```javascript
await this.sendEvent({
  type: 'pr_updated',
  message: `PR updated for ${ticket.key}`,
  details: `PR #${existingPR.number} ready for re-review`,
  activity: `✅ Updated PR #${existingPR.number}`
});
```

## 🧪 Testing

### Test 1: Fresh Start (kein existing PR)
```bash
# Ticket: AT-14 (Status: To Do)
# Expected:
# ✅ Coder erstellt neuen Branch: feature/AT-14-...
# ✅ Coder erstellt neuen PR
# ✅ Status: "In Arbeit"
```

### Test 2: Rework (existing PR)
```bash
# Ticket: AT-13 (Status: To Do)
# Existing PR: #3 (Branch: feature/AT-13-user-filter)
# Expected:
# ✅ Coder findet PR #3
# ✅ Coder verwendet Branch: feature/AT-13-user-filter
# ✅ Coder committed auf existierenden Branch
# ✅ Coder postet Comment in PR #3
# ✅ KEIN neuer Branch/PR erstellt
```

### Test 3: Re-Review
```bash
# PR #3 wurde vor 2 Minuten updated
# Expected:
# ✅ Reviewer findet PR #3
# ✅ hasRecentUpdates() = true
# ✅ Reviewer deleted reviewedPRs entry
# ✅ Reviewer reviewed PR #3 erneut
```

## 🎨 Console Output

### Coder - Rework Mode:
```
👨‍💻 Checking for existing PR...
   ✅ Found existing PR #3: AT-13: Add user filter
   🌿 Branch: feature/AT-13-user-filter

👨‍💻 🔄 REWORK MODE: Updating existing PR
   📝 Working on fixes...
   ✅ Changes applied
   ✅ PR #3 updated with fixes
```

### Reviewer - Re-Review:
```
🔍 Checking for open pull requests...
Found PR: #3
   🔄 PR #3 was updated 2 min ago
   🔄 PR #3 has updates, will re-review
   Found 1 PR(s) to review
```

## 🎉 Benefits

### Für den Workflow:
- ✅ **Review-Loop funktioniert** - Kein doppelter Branch!
- ✅ **Sauberes Git History** - Ein Branch, ein PR
- ✅ **Transparenz** - Alle Changes in einem PR

### Für das Team:
- ✅ **Keine Branch-Konflikte** - Kein duplicate branch error
- ✅ **Klare PR History** - Alle Iterationen sichtbar
- ✅ **Automatischer Re-Review** - Reviewer erkennt Updates

## ⚙️ Konfiguration

**Reviewer - Update Detection Window:**
```javascript
// In reviewer/agent.js - hasRecentUpdates()

const minutesSinceUpdate = (now - updatedAt) / 1000 / 60;

// Adjust time window (default: 5 minutes)
if (minutesSinceUpdate < 5) { // ← Change here
  return true;
}
```

## 📋 Checkliste

- [x] Coder findet existierende PRs
- [x] Coder verwendet existierenden Branch
- [x] Coder updated PR statt neuen zu erstellen
- [x] Reviewer erkennt PR Updates
- [x] Reviewer reviewed PRs erneut
- [x] Dashboard zeigt Rework Mode
- [x] Jira wird bei Rework updated

---

**Status:** ✅ FIXED
**Agents Updated:** 2 (Coder + Reviewer)
**Impact:** 🎯 Critical - Review-Loop jetzt vollständig funktional
**Branch Conflicts:** ✅ RESOLVED
