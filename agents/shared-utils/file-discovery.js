/**
 * File Discovery Utility for AI Agents
 * 
 * Provides centralized, reusable methods for discovering and selecting
 * project files dynamically via MCP (Model Context Protocol).
 * 
 * Benefits:
 * - DRY: Single source of truth for file discovery logic
 * - Maintainable: Update once, all agents benefit
 * - Testable: Can be unit tested independently
 * - Scalable: Works with any project structure
 */

class FileDiscoveryUtil {
  constructor(mcpToolCaller, emoji = '🔍') {
    this.callMCPTool = mcpToolCaller;
    this.emoji = emoji;
  }

  /**
   * Recursively discover files in a directory
   * 
   * @param {string} basePath - Starting directory path
   * @param {string[]} extensions - File extensions to include (e.g. ['.js', '.ts'])
   * @returns {Promise<string[]>} Array of file paths
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
   * Discover all project files (backend + frontend)
   * 
   * @returns {Promise<Object>} Object with backend, frontend, and all files
   */
  async discoverProjectFiles() {
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
        
        return {
          all: discoveredFiles,
          backend: backendFiles,
          frontend: frontendFiles
        };
      }
    } catch (error) {
      console.log(`   ⚠️  MCP discovery failed: ${error.message}`);
    }
    
    // Fallback auf Standard-Liste
    const fallbackFiles = [
      'test-app/backend/server.js',
      'test-app/backend/models/user.js',
      'test-app/frontend/src/app/app.component.ts',
      'test-app/frontend/src/app/models/user.model.ts',
      'test-app/frontend/src/app/services/user.service.ts'
    ];
    
    return {
      all: fallbackFiles,
      backend: fallbackFiles.filter(f => f.includes('backend')),
      frontend: fallbackFiles.filter(f => f.includes('frontend'))
    };
  }

  /**
   * Analyze project structure and group files
   * 
   * @param {string[]} files - Array of file paths
   * @returns {Object} Structure overview with file counts per directory
   */
  analyzeStructure(files) {
    const structure = {};
    
    files.forEach(file => {
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
   * Group files by type/feature for better organization
   * 
   * @param {string[]} files - Array of file paths
   * @returns {Object} Grouped files by category
   */
  groupFilesByType(files) {
    return {
      backend: files.filter(f => f.includes('backend')),
      models: files.filter(f => f.includes('/models/')),
      services: files.filter(f => f.includes('/services/')),
      shared: files.filter(f => f.includes('/shared/')),
      features: files.filter(f => f.includes('/features/')),
      components: files.filter(f => f.includes('.component.')),
      core: files.filter(f => 
        f.includes('app.component') && !f.includes('/shared/') && !f.includes('/features/')
      )
    };
  }

  /**
   * Filter files by keywords (e.g. "user", "auth", "product")
   * 
   * @param {string[]} files - Array of file paths
   * @param {string[]} keywords - Keywords to search for
   * @returns {string[]} Filtered files
   */
  filterFilesByKeywords(files, keywords) {
    if (!keywords || keywords.length === 0) return files;
    
    return files.filter(file => {
      const fileLower = file.toLowerCase();
      return keywords.some(keyword => fileLower.includes(keyword.toLowerCase()));
    });
  }

  /**
   * Find files related to a specific feature
   * 
   * @param {string[]} files - All project files
   * @param {string} featureName - Feature name (e.g. "user-management")
   * @returns {string[]} Related files
   */
  findFeatureFiles(files, featureName) {
    const featureLower = featureName.toLowerCase();
    
    return files.filter(file => {
      const fileLower = file.toLowerCase();
      // Match feature folder or file names
      return fileLower.includes(`/features/${featureLower}`) ||
             fileLower.includes(featureLower.replace('-', ''));
    });
  }

  /**
   * Find files by extension
   * 
   * @param {string[]} files - All project files
   * @param {string} extension - Extension to filter (e.g. '.ts', '.html')
   * @returns {string[]} Filtered files
   */
  findFilesByExtension(files, extension) {
    return files.filter(f => f.endsWith(extension));
  }

  /**
   * Get component-related files (TypeScript, HTML, CSS trilogy)
   * 
   * @param {string[]} files - All project files
   * @param {string} componentName - Component name (e.g. "user-form")
   * @returns {Object} Object with ts, html, css files
   */
  getComponentFiles(files, componentName) {
    const componentFiles = files.filter(f => 
      f.includes(componentName) && f.includes('.component.')
    );
    
    return {
      ts: componentFiles.find(f => f.endsWith('.component.ts')),
      html: componentFiles.find(f => f.endsWith('.component.html')),
      css: componentFiles.find(f => f.endsWith('.component.css')),
      all: componentFiles
    };
  }

  /**
   * Get summary statistics about discovered files
   * 
   * @param {string[]} files - All project files
   * @returns {Object} Statistics object
   */
  getFileStatistics(files) {
    const grouped = this.groupFilesByType(files);
    const structure = this.analyzeStructure(files);
    
    return {
      total: files.length,
      byType: {
        backend: grouped.backend.length,
        frontend: files.length - grouped.backend.length,
        models: grouped.models.length,
        services: grouped.services.length,
        components: grouped.components.length,
        shared: grouped.shared.length,
        features: grouped.features.length
      },
      byExtension: {
        js: files.filter(f => f.endsWith('.js')).length,
        ts: files.filter(f => f.endsWith('.ts')).length,
        html: files.filter(f => f.endsWith('.html')).length,
        css: files.filter(f => f.endsWith('.css')).length
      },
      structure
    };
  }

  /**
   * Pretty print file statistics
   * 
   * @param {string[]} files - All project files
   */
  printStatistics(files) {
    const stats = this.getFileStatistics(files);
    
    console.log(`\n${this.emoji} File Discovery Statistics:`);
    console.log(`   📊 Total Files: ${stats.total}`);
    console.log(`\n   📁 By Type:`);
    console.log(`      Backend: ${stats.byType.backend}`);
    console.log(`      Frontend: ${stats.byType.frontend}`);
    console.log(`      Models: ${stats.byType.models}`);
    console.log(`      Services: ${stats.byType.services}`);
    console.log(`      Components: ${stats.byType.components}`);
    console.log(`      Shared: ${stats.byType.shared}`);
    console.log(`      Features: ${stats.byType.features}`);
    console.log(`\n   📄 By Extension:`);
    console.log(`      .js: ${stats.byExtension.js}`);
    console.log(`      .ts: ${stats.byExtension.ts}`);
    console.log(`      .html: ${stats.byExtension.html}`);
    console.log(`      .css: ${stats.byExtension.css}`);
  }
}

export default FileDiscoveryUtil;
