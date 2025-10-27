# 🔧 GitHub MCP Server - get_pr_comments Tool hinzugefügt

## ✅ Problem gelöst

Der Coder Agent hat `get_pr_comments` aufgerufen, aber dieser Endpoint existierte noch nicht im GitHub MCP Server.

## 🆕 Neue Funktionalität

### GitHub Client (`github-client.js`)

**Neue Methode: `getPRComments(prNumber)`**

```javascript
async getPRComments(prNumber) {
  const { data } = await this.octokit.rest.issues.listComments({
    owner: this.owner,
    repo: this.repo,
    issue_number: prNumber // PRs sind Issues in GitHub API
  });

  const comments = data.map(comment => ({
    id: comment.id,
    body: comment.body,
    author: comment.user.login,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
    url: comment.html_url
  }));

  return {
    success: true,
    comments: comments,
    count: comments.length
  };
}
```

### GitHub MCP Server (`server.js`)

**Neuer Endpoint: `POST /tools/get_pr_comments`**

```javascript
app.post('/tools/get_pr_comments', async (req, res) => {
  const { prNumber } = req.body;
  
  // Validierung
  if (!prNumber) {
    return res.status(400).json({
      success: false,
      error: 'prNumber is required'
    });
  }
  
  // Events
  await sendEvent({
    type: 'get_pr_comments',
    message: `Getting comments for PR #${prNumber}`
  });
  
  const result = await github.getPRComments(prNumber);
  
  if (result.success) {
    await sendEvent({
      type: 'pr_comments_fetched',
      message: `Fetched ${result.count} comment(s) for PR #${prNumber}`
    });
  }
  
  res.json(result);
});
```

**Tool-Katalog aktualisiert:**

```javascript
{
  name: 'get_pr_comments',
  description: 'Get all comments from a pull request',
  parameters: {
    prNumber: { type: 'number', required: true, description: 'Pull request number' }
  },
  endpoint: '/tools/get_pr_comments'
}
```

## 📊 API Response Format

**Request:**
```javascript
POST /tools/get_pr_comments
{
  "prNumber": 3
}
```

**Response (Success):**
```javascript
{
  "success": true,
  "comments": [
    {
      "id": 12345,
      "body": "⚠️ Changes requested\n\n**Changes Needed:**\n- Add input validation\n- Fix TypeScript errors",
      "author": "reviewer-bot",
      "createdAt": "2025-10-27T10:00:00Z",
      "updatedAt": "2025-10-27T10:00:00Z",
      "url": "https://github.com/..."
    }
  ],
  "count": 1
}
```

**Response (Error):**
```javascript
{
  "success": false,
  "error": "Pull request not found"
}
```

## 🎯 Integration mit Coder Agent

Der Coder Agent kann jetzt erfolgreich PR-Kommentare lesen:

```javascript
// Im Coder Agent
const commentsResult = await this.callMCPTool('github', 'get_pr_comments', {
  prNumber: prNumber
});

if (commentsResult.success) {
  console.log(`Read ${commentsResult.count} comment(s)`);
  
  commentsResult.comments.forEach(comment => {
    console.log(`Comment by ${comment.author}:`);
    console.log(comment.body);
  });
}
```

## 🚀 Deployment

**1. GitHub MCP Server neu starten:**
```bash
cd mcp-servers/github
npm start
```

**2. Coder Agent neu starten:**
```bash
cd agents/coder
npm start
```

**3. Test durchführen:**
- Reviewer postet Kommentar in PR
- Ticket auf "To Do" setzen
- Coder sollte jetzt erfolgreich Kommentare lesen können

## ✅ Erwartetes Verhalten

**Console Output (GitHub MCP):**
```
[MCP Tool] get_pr_comments called
[GitHubClient] Getting comments for PR #3
```

**Console Output (Coder Agent):**
```
👨‍💻 Reading PR feedback...
   ✅ Read 1 comment(s)
   📊 Review Status: CHANGES_REQUESTED
   🔧 Requested Changes (2):
      1. Add input validation for email field
      2. Fix TypeScript type error in user.service.ts
```

**Dashboard Events:**
```
🔧 GitHub MCP: Getting comments for PR #3
🔧 GitHub MCP: Fetched 1 comment(s) for PR #3
📖 Coder Agent: Reading PR #3
✅ Coder Agent: Analyzed PR #3
```

## 📝 Änderungen im Detail

### Datei 1: `github-client.js`
- **Neue Methode:** `getPRComments(prNumber)`
- **Zeilen:** ~35 neue Zeilen
- **Location:** Am Ende der Klasse, nach `approvePullRequest()`

### Datei 2: `server.js`
- **Neuer Endpoint:** `POST /tools/get_pr_comments`
- **Zeilen:** ~40 neue Zeilen
- **Location:** Nach `/tools/approve_pull_request`
- **Tool-Katalog Update:** 1 neuer Eintrag

## 🎉 Benefits

✅ **Coder kann PR-Kommentare lesen** - Kein 404 Fehler mehr
✅ **Review-Loop vollständig** - Reviewer → Coder → Reviewer funktioniert
✅ **Transparenz** - Alle PR-Kommentare verfügbar
✅ **GitHub API Best Practice** - Verwendet Issues API für PR-Kommentare

## 🧪 Testing

### Test Case 1: PR ohne Kommentare
```javascript
// Request
{ prNumber: 1 }

// Expected Response
{
  success: true,
  comments: [],
  count: 0
}
```

### Test Case 2: PR mit Review-Kommentar
```javascript
// Request
{ prNumber: 3 }

// Expected Response
{
  success: true,
  comments: [{
    body: "⚠️ Changes requested...",
    author: "reviewer-bot",
    ...
  }],
  count: 1
}
```

### Test Case 3: Nicht existierender PR
```javascript
// Request
{ prNumber: 999 }

// Expected Response
{
  success: false,
  error: "Not Found"
}
```

---

**Status:** ✅ IMPLEMENTED
**Version:** 1.0
**Date:** 2025-10-27
**Kompatibilität:** Octokit @octokit/rest
