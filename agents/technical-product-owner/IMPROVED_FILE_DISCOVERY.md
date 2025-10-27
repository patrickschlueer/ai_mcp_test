# IMPROVED FILE DISCOVERY FÜR TECHNICAL PRODUCT OWNER AGENT

## Problem
Die aktuelle `discoverRealFilesViaMCP()` Methode findet nur Files im obersten Ordner und funktioniert nicht mit der neuen Component-Struktur (/shared/, /features/, etc.)

## Lösung
Rekursive File-Discovery die die KOMPLETTE Projektstruktur durchsucht.

## Neue Methode für TPO Agent

```javascript
/**
 * 🆕 VERBESSERT: Rekursive File-Discovery über MCP
 * 
 * Durchsucht rekursiv:
 * - test-app/backend/**/*.js
 * - test-app/frontend/src/app/**/*.ts
 * - test-app/frontend/src/app/**/*.html  
 * - test-app/frontend/src/app/**/*.css
 */
async discoverRealFilesViaMCP() {
  console.log(`\n${this.emoji} Discovering project files recursively...`);
  
  try {
    const discoveredFiles = [];
    
    // Backend rekursiv durchsuchen
    const backendFiles = await this.discoverFilesRecursively('test-app/backend', ['.js']);
    discoveredFiles.push(...backendFiles);
    
    // Frontend rekursiv durchsuchen
    const frontendFiles = await this.discoverFilesRecursively(
      'test-app/frontend/src/app', 
      ['.ts', '.html', '.css']
    );
    discoveredFiles.push(...frontendFiles);
    
    if (discoveredFiles.length > 0) {
      console.log(`   ✅ Discovered ${discoveredFiles.length} files via MCP`);
      console.log(`      Backend: ${backendFiles.length} files`);
      console.log(`      Frontend: ${frontendFiles.length} files`);
      
      // Zeige Struktur-Überblick
      const structureOverview = this.analyzeStructure(discoveredFiles);
      console.log(`\n   📁 Project Structure:`);
      Object.entries(structureOverview).forEach(([dir, count]) => {
        console.log(`      ${dir}: ${count} file(s)`);
      });
      
      return discoveredFiles;
    }
  } catch (error) {
    console.log(`   ⚠️  MCP discovery failed: ${error.message}`);
  }
  
  // Fallback auf Standard-Liste
  return [
    'test-app/backend/server.js',
    'test-app/backend/models/user.js',
    'test-app/frontend/src/app/app.component.ts',
    'test-app/frontend/src/app/models/user.model.ts',
    'test-app/frontend/src/app/services/user.service.ts'
  ];
}

/**
 * 🆕 HELPER: Rekursiv Files in einem Verzeichnis finden
 */
async discoverFilesRecursively(basePath, extensions = ['.js', '.ts']) {
  const files = [];
  const dirsToExplore = [basePath];
  const explored = new Set();
  
  while (dirsToExplore.length > 0) {
    const currentPath = dirsToExplore.shift();
    
    // Skip wenn schon explored oder node_modules
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
        
        // Check ob es ein File mit gewünschter Extension ist
        const hasMatchingExtension = extensions.some(ext => item.endsWith(ext));
        
        if (hasMatchingExtension) {
          files.push(fullPath);
        }
        // Wenn es kein File ist (keine Extension), ist es ein Dir
        else if (!item.includes('.')) {
          dirsToExplore.push(fullPath);
        }
      }
    } catch (error) {
      // Skip Directories die nicht gelesen werden können
      continue;
    }
  }
  
  return files;
}

/**
 * 🆕 HELPER: Analysiere Struktur der gefundenen Files
 */
analyzeStructure(files) {
  const structure = {};
  
  files.forEach(file => {
    // Extrahiere Hauptordner (z.B. "backend", "shared", "features")
    const parts = file.split('/');
    
    if (file.includes('backend')) {
      const key = 'backend';
      structure[key] = (structure[key] || 0) + 1;
    }
    else if (file.includes('/shared/')) {
      const componentMatch = file.match(/\/shared\/([^\/]+)\//);
      const key = componentMatch ? `shared/${componentMatch[1]}` : 'shared';
      structure[key] = (structure[key] || 0) + 1;
    }
    else if (file.includes('/features/')) {
      const featureMatch = file.match(/\/features\/([^\/]+)\//);
      const key = featureMatch ? `features/${featureMatch[1]}` : 'features';
      structure[key] = (structure[key] || 0) + 1;
    }
    else if (file.includes('/models/')) {
      structure['models'] = (structure['models'] || 0) + 1;
    }
    else if (file.includes('/services/')) {
      structure['services'] = (structure['services'] || 0) + 1;
    }
    else {
      structure['app-root'] = (structure['app-root'] || 0) + 1;
    }
  });
  
  return structure;
}

/**
 * 🆕 VERBESSERT: Wähle relevante Files basierend auf Ticket-Kontext
 */
async selectRelevantFiles(ticket) {
  const allFiles = await this.discoverRealFilesViaMCP();
  
  if (allFiles.length === 0) {
    console.log(`   ⚠️  No files discovered`);
    return [];
  }
  
  console.log(`\n${this.emoji} Selecting relevant files for ticket...`);
  
  // Gruppiere Files nach Feature/Type für bessere Übersicht
  const fileGroups = {
    'backend': allFiles.filter(f => f.includes('backend')),
    'frontend-core': allFiles.filter(f => 
      f.includes('app.component') || 
      f.includes('/models/') || 
      f.includes('/services/')
    ),
    'shared-components': allFiles.filter(f => f.includes('/shared/')),
    'feature-components': allFiles.filter(f => f.includes('/features/'))
  };
  
  const prompt = `Du bist ein Technical Product Owner. Wähle die relevantesten Files für dieses Ticket.

=== TICKET ===
Ticket: ${ticket.key}
Summary: ${ticket.summary}
Description: ${ticket.description?.substring(0, 500) || 'Keine'}

=== VERFÜGBARE FILE-GRUPPEN ===

**Backend (${fileGroups['backend'].length} files):**
${fileGroups['backend'].slice(0, 10).join('\n')}

**Frontend Core (${fileGroups['frontend-core'].length} files):**
${fileGroups['frontend-core'].join('\n')}

**Shared Components (${fileGroups['shared-components'].length} files):**
${fileGroups['shared-components'].join('\n')}

**Feature Components (${fileGroups['feature-components'].length} files):**
${fileGroups['feature-components'].join('\n')}

=== AUFGABE ===
Wähle die 3-7 relevantesten Files die zum Ticket passen.

**Regeln:**
1. Wenn Ticket über "User" spricht → user-related Files
2. Wenn Ticket über UI spricht → frontend Components
3. Wenn Ticket über API spricht → backend Files
4. IMMER relevante Models/Services mit einbeziehen

Antworte NUR mit JSON Array:
["file1", "file2", "file3"]`;

  try {
    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    let responseText = message.content[0].text.trim();
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) throw new Error('No JSON array found');
    
    const selectedFiles = JSON.parse(jsonMatch[0]);
    const validFiles = selectedFiles.filter(f => allFiles.includes(f));
    
    console.log(`   ✅ Selected ${validFiles.length} relevant files:`);
    validFiles.forEach(f => console.log(`      - ${f}`));
    
    return validFiles.length > 0 ? validFiles : allFiles.slice(0, 5);
    
  } catch (error) {
    console.error(`   ⚠️  Selection failed: ${error.message}`);
    // Fallback: Nimm ersten 5 Files
    return allFiles.slice(0, 5);
  }
}
```

## Implementation

Diese 3 Methoden ERSETZEN die alte `discoverRealFilesViaMCP()` und `selectRelevantFiles()` im TPO Agent.

## Benefits

✅ **Rekursive Discovery** - Findet ALLE Files in der Projekt-Struktur
✅ **Smart Selection** - Claude wählt basierend auf Ticket-Kontext
✅ **Structure-Aware** - Versteht /shared/, /features/, /models/ etc.
✅ **Scalable** - Funktioniert auch wenn Projekt wächst

## Testing

Nach Implementation teste mit:
1. User-bezogenem Ticket → sollte user.model.ts + user.service.ts + user-form Component finden
2. UI-bezogenem Ticket → sollte shared/header + shared/alert + relevante feature Components finden
3. Backend-Ticket → sollte backend/*.js Files finden
