# Shared Utilities for AI Agents

Zentrale Utility-Module die von allen Agenten verwendet werden können.

## 📁 Module

### 1. `file-discovery.js`

Stellt rekursive File-Discovery-Funktionalität für alle Agenten bereit.

**Features:**
- ✅ Rekursive Verzeichnis-Durchsuchung via MCP
- ✅ Intelligente File-Gruppierung nach Type/Feature
- ✅ Struktur-Analyse und Statistiken
- ✅ Helper-Methoden für häufige Use-Cases

## 🚀 Usage

### Basic Usage

```javascript
import FileDiscoveryUtil from '../shared-utils/file-discovery.js';

class MyAgent {
  constructor() {
    // Initialisiere File Discovery mit MCP Tool Caller
    this.fileDiscovery = new FileDiscoveryUtil(
      this.callMCPTool.bind(this),  // MCP Tool Caller Function
      this.emoji                      // Agent Emoji (optional)
    );
  }

  async analyzeProject() {
    // Discover alle Files
    const { all, backend, frontend } = await this.fileDiscovery.discoverProjectFiles();
    
    // Gruppiere nach Type
    const grouped = this.fileDiscovery.groupFilesByType(all);
    
    // Zeige Statistiken
    this.fileDiscovery.printStatistics(all);
  }
}
```

### Use Cases

#### 1. Find User-Related Files

```javascript
const allFiles = await this.fileDiscovery.discoverProjectFiles();
const userFiles = this.fileDiscovery.filterFilesByKeywords(
  allFiles.all, 
  ['user', 'auth']
);
```

#### 2. Get All Components in a Feature

```javascript
const allFiles = await this.fileDiscovery.discoverProjectFiles();
const userMgmtFiles = this.fileDiscovery.findFeatureFiles(
  allFiles.all,
  'user-management'
);
```

#### 3. Get Component Trilogy (TS + HTML + CSS)

```javascript
const allFiles = await this.fileDiscovery.discoverProjectFiles();
const formComponent = this.fileDiscovery.getComponentFiles(
  allFiles.all,
  'user-form'
);

console.log(formComponent.ts);    // .component.ts
console.log(formComponent.html);  // .component.html
console.log(formComponent.css);   // .component.css
```

#### 4. Analyze Project Structure

```javascript
const allFiles = await this.fileDiscovery.discoverProjectFiles();
const structure = this.fileDiscovery.analyzeStructure(allFiles.all);

// Returns:
// {
//   'backend': 5,
//   'shared/header': 3,
//   'shared/alert': 3,
//   'features/user-management': 12,
//   'models': 2,
//   'services': 2
// }
```

## 📖 API Reference

### Constructor

```javascript
new FileDiscoveryUtil(mcpToolCaller, emoji)
```

- `mcpToolCaller`: Function that calls MCP tools (usually `this.callMCPTool.bind(this)`)
- `emoji`: Optional emoji for logging (default: '🔍')

### Methods

#### Core Discovery

- `discoverFilesRecursively(basePath, extensions)` - Recursively discover files
- `discoverProjectFiles()` - Discover all backend + frontend files
- `analyzeStructure(files)` - Analyze and group project structure

#### File Grouping & Filtering

- `groupFilesByType(files)` - Group files by backend/frontend/models/services/etc
- `filterFilesByKeywords(files, keywords)` - Filter by keywords (e.g. "user", "auth")
- `findFeatureFiles(files, featureName)` - Find files for specific feature
- `findFilesByExtension(files, extension)` - Filter by extension

#### Component Helpers

- `getComponentFiles(files, componentName)` - Get .ts + .html + .css for component

#### Statistics

- `getFileStatistics(files)` - Get detailed statistics
- `printStatistics(files)` - Pretty print statistics to console

## 🎯 Integration in Agents

### Technical Product Owner

```javascript
import FileDiscoveryUtil from '../shared-utils/file-discovery.js';

class TechnicalProductOwnerAgent {
  constructor() {
    // ...
    this.fileDiscovery = new FileDiscoveryUtil(
      this.callMCPTool.bind(this),
      this.emoji
    );
  }

  async selectRelevantFiles(ticket) {
    const { all } = await this.fileDiscovery.discoverProjectFiles();
    const grouped = this.fileDiscovery.groupFilesByType(all);
    
    // Use grouped files in prompt for Claude to select relevant ones
    // ...
  }
}
```

### Coder Agent

```javascript
import FileDiscoveryUtil from '../shared-utils/file-discovery.js';

class CoderAgent {
  constructor() {
    // ...
    this.fileDiscovery = new FileDiscoveryUtil(
      this.callMCPTool.bind(this),
      this.emoji
    );
  }

  async implementFeature(ticket) {
    // Discover files dynamically statt statische Liste
    const { all } = await this.fileDiscovery.discoverProjectFiles();
    
    // Find relevant files based on ticket
    const relevantFiles = this.fileDiscovery.filterFilesByKeywords(
      all,
      [ticket.summary.toLowerCase()]
    );
    
    // Read and process files
    // ...
  }
}
```

### Software Architect

```javascript
import FileDiscoveryUtil from '../shared-utils/file-discovery.js';

class SoftwareArchitectAgent {
  constructor() {
    // ...
    this.fileDiscovery = new FileDiscoveryUtil(
      this.callMCPTool.bind(this),
      this.emoji
    );
  }

  async designArchitecture(ticket) {
    const { backend, frontend } = await this.fileDiscovery.discoverProjectFiles();
    
    // Analyze current architecture
    const models = this.fileDiscovery.filterFilesByKeywords(backend, ['model']);
    const services = this.fileDiscovery.filterFilesByKeywords(backend, ['service']);
    
    // Design new architecture
    // ...
  }
}
```

### UI Designer

```javascript
import FileDiscoveryUtil from '../shared-utils/file-discovery.js';

class UIDesignerAgent {
  constructor() {
    // ...
    this.fileDiscovery = new FileDiscoveryUtil(
      this.callMCPTool.bind(this),
      this.emoji
    );
  }

  async designUI(ticket) {
    const { all } = await this.fileDiscovery.discoverProjectFiles();
    
    // Get all components
    const grouped = this.fileDiscovery.groupFilesByType(all);
    const sharedComponents = grouped.shared;
    const featureComponents = grouped.features;
    
    // Design new UI
    // ...
  }
}
```

## 🔧 Migration Guide

### Von statischen Listen zu dynamischer Discovery

**Vorher:**
```javascript
const filesToRead = [
  'test-app/backend/server.js',
  'test-app/backend/models/user.js',
  'test-app/frontend/src/app/app.component.ts',
  // ... statische Liste
];
```

**Nachher:**
```javascript
const { all } = await this.fileDiscovery.discoverProjectFiles();
const relevantFiles = this.fileDiscovery.filterFilesByKeywords(
  all,
  ['user', 'auth']
);
```

## 📝 Best Practices

1. **Initialisiere einmal im Constructor**
   ```javascript
   this.fileDiscovery = new FileDiscoveryUtil(this.callMCPTool.bind(this), this.emoji);
   ```

2. **Cache Discovery Results**
   ```javascript
   if (!this.cachedFiles) {
     this.cachedFiles = await this.fileDiscovery.discoverProjectFiles();
   }
   ```

3. **Verwende Helper-Methoden**
   ```javascript
   // Statt selbst filtern
   const userFiles = files.filter(f => f.includes('user'));
   
   // Nutze Helper
   const userFiles = this.fileDiscovery.filterFilesByKeywords(files, ['user']);
   ```

4. **Logge Statistiken für Debugging**
   ```javascript
   const { all } = await this.fileDiscovery.discoverProjectFiles();
   this.fileDiscovery.printStatistics(all);
   ```

## 🧪 Testing

```javascript
// Test Discovery
const util = new FileDiscoveryUtil(mockMCPCaller);
const files = await util.discoverProjectFiles();
assert(files.all.length > 0);

// Test Grouping
const grouped = util.groupFilesByType(files.all);
assert(grouped.backend.length > 0);
assert(grouped.frontend.length > 0);

// Test Filtering
const userFiles = util.filterFilesByKeywords(files.all, ['user']);
assert(userFiles.length > 0);
```

## 🚀 Future Enhancements

- [ ] File content caching
- [ ] Git diff integration
- [ ] Dependency graph analysis
- [ ] Code complexity metrics
- [ ] Test coverage analysis
