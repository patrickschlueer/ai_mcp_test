# DYNAMIC FILE DISCOVERY FÜR ALLE AGENTEN

## Problem gelöst ✅

**Vorher:** Alle Agenten hatten statische File-Listen die schnell veraltet waren
**Nachher:** Rekursive File-Discovery die automatisch die gesamte Projektstruktur findet

## Betroffene Agenten

1. ✅ **Technical Product Owner** - DONE
2. ⏳ **Coder Agent** - TODO
3. ⏳ **Reviewer Agent** - TODO  
4. ⏳ **Software Architect** - TODO
5. ⏳ **UI Designer** - TODO

## Gemeinsame Helper-Methoden

Diese 3 Methoden sollten ALLE Agenten haben:

### 1. discoverFilesRecursively()
```javascript
async discoverFilesRecursively(basePath, extensions = ['.js', '.ts']) {
  const files = [];
  const dirsToExplore = [basePath];
  const explored = new Set();
  
  while (dirsToExplore.length > 0) {
    const currentPath = dirsToExplore.shift();
    
    if (explored.has(currentPath) || currentPath.includes('node_modules')) {
      continue;
    }
    
    explored.add(currentPath);
    
    try {
      const result = await this.callMCPTool('github', 'list_directory', { 
        path: currentPath 
      });
      
      if (!result.success || !result.files) continue;
      
      for (const item of result.files) {
        const fullPath = `${currentPath}/${item}`;
        const hasMatchingExtension = extensions.some(ext => item.endsWith(ext));
        
        if (hasMatchingExtension) {
          files.push(fullPath);
        }
        else if (!item.includes('.')) {
          dirsToExplore.push(fullPath);
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  return files;
}
```

### 2. discoverProjectFiles()
```javascript
async discoverProjectFiles() {
  console.log(`\n${this.emoji} Discovering project files...`);
  
  try {
    const discoveredFiles = [];
    
    // Backend
    const backendFiles = await this.discoverFilesRecursively('test-app/backend', ['.js']);
    discoveredFiles.push(...backendFiles);
    
    // Frontend
    const frontendFiles = await this.discoverFilesRecursively(
      'test-app/frontend/src/app', 
      ['.ts', '.html', '.css']
    );
    discoveredFiles.push(...frontendFiles);
    
    console.log(`   ✅ Found ${discoveredFiles.length} files`);
    console.log(`      Backend: ${backendFiles.length}`);
    console.log(`      Frontend: ${frontendFiles.length}`);
    
    return discoveredFiles;
  } catch (error) {
    console.log(`   ⚠️  Discovery failed: ${error.message}`);
    return [];
  }
}
```

### 3. selectRelevantFiles()
```javascript
async selectRelevantFiles(ticket, allFiles) {
  // Gruppiere nach Features
  const fileGroups = {
    'backend': allFiles.filter(f => f.includes('backend')),
    'models': allFiles.filter(f => f.includes('/models/')),
    'services': allFiles.filter(f => f.includes('/services/')),
    'shared': allFiles.filter(f => f.includes('/shared/')),
    'features': allFiles.filter(f => f.includes('/features/'))
  };
  
  // Verwende Claude um relevante Files zu wählen
  const prompt = `...`; // Agent-spezifisch
  
  // Return selected files
}
```

## Implementierung pro Agent

### Coder Agent

```javascript
// ERSETZE diese Zeilen:
const filesToRead = [
  'test-app/backend/server.js',
  // ... statische Liste
];

// MIT:
const allFiles = await this.discoverProjectFiles();
const selectedFiles = await this.selectRelevantFiles(ticket, allFiles);
const filesContent = await this.readFilesCompletely(selectedFiles);
```

### Reviewer Agent

```javascript
// Im PR-Review:
const allFiles = await this.discoverProjectFiles();
const changedFiles = pr.changedFiles; // Von PR
const relatedFiles = await this.findRelatedFiles(changedFiles, allFiles);
// Review changed + related files
```

### Software Architect

```javascript
// Bei Architektur-Design:
const allFiles = await this.discoverProjectFiles();
const backendFiles = allFiles.filter(f => f.includes('backend'));
const modelFiles = allFiles.filter(f => f.includes('/models/'));
// Analysiere Struktur
```

### UI Designer

```javascript
// Bei UI-Design:
const allFiles = await this.discoverProjectFiles();
const componentFiles = allFiles.filter(f => 
  f.includes('.component.ts') || 
  f.includes('.component.html') ||
  f.includes('.component.css')
);
// Analysiere UI-Struktur
```

## Benefits

✅ **Automatisch aktuell** - Keine veralteten File-Listen mehr
✅ **Skalierbar** - Funktioniert auch wenn Projekt wächst
✅ **Structure-Aware** - Versteht /shared/, /features/, /models/ etc.
✅ **Intelligent** - Claude wählt basierend auf Kontext
✅ **Maintainable** - Eine Methode für alle Agenten

## Testing

Teste jeden Agent mit:
1. User-bezogenem Ticket → sollte user.model + user.service + user-form finden
2. UI-Ticket → sollte shared + feature Components finden
3. Backend-Ticket → sollte backend/*.js Files finden

## Next Steps

1. ✅ TPO Agent - DONE
2. ⏳ Coder Agent aktualisieren
3. ⏳ Reviewer Agent aktualisieren
4. ⏳ Architect Agent aktualisieren
5. ⏳ Designer Agent aktualisieren
