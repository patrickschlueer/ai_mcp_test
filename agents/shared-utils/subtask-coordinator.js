/**
 * Sub-Task Coordinator
 * 
 * Flexible Koordination von Agent Sub-Tasks:
 * - Prüft ob ALLE erwarteten Sub-Tasks fertig sind
 * - Unterstützt beliebig viele Sub-Task-Typen
 * - Setzt Parent-Task zurück auf "To Do" wenn alle fertig
 * - Damit TPO dem Coder bescheid geben kann
 */

/**
 * Definierte Sub-Task-Typen die im System existieren können
 * Jeder Typ hat mehrere Identifikations-Möglichkeiten
 */
const SUB_TASK_TYPES = [
  {
    id: 'architecture',
    name: 'Architektur',
    emoji: '🏛️',
    identifiers: {
      labels: ['architecture'],
      keywords: ['architektur', 'architecture'],
      emoji: '🏛️'
    }
  },
  {
    id: 'ui-design',
    name: 'UI-Design',
    emoji: '🎨',
    identifiers: {
      labels: ['ui-design'],
      keywords: ['ui-design', 'design'],
      emoji: '🎨'
    }
  }
  // ✨ Hier können zukünftig weitere Typen hinzugefügt werden:
  // {
  //   id: 'testing',
  //   name: 'Testing',
  //   emoji: '🧪',
  //   identifiers: {
  //     labels: ['testing'],
  //     keywords: ['test', 'testing'],
  //     emoji: '🧪'
  //   }
  // },
  // {
  //   id: 'documentation',
  //   name: 'Documentation',
  //   emoji: '📚',
  //   identifiers: {
  //     labels: ['documentation', 'docs'],
  //     keywords: ['documentation', 'docs', 'dokumentation'],
  //     emoji: '📚'
  //   }
  // }
];

/**
 * Identifiziert den Typ eines Sub-Tasks basierend auf Labels, Summary und Keywords
 */
function identifySubTaskType(subTask) {
  for (const type of SUB_TASK_TYPES) {
    const { labels, keywords, emoji } = type.identifiers;
    
    // Check Labels
    if (labels?.some(label => subTask.labels?.includes(label))) {
      return type;
    }
    
    // Check Summary für Emoji
    if (emoji && subTask.summary?.includes(emoji)) {
      return type;
    }
    
    // Check Summary für Keywords
    const summaryLower = (subTask.summary || '').toLowerCase();
    if (keywords?.some(keyword => summaryLower.includes(keyword))) {
      return type;
    }
  }
  
  return null; // Kein bekannter Typ
}

/**
 * Prüft ob ein Sub-Task als "fertig" gilt
 */
function isSubTaskComplete(subTask) {
  const completedStatuses = ['Fertig', 'Done', 'Abgeschlossen', 'Closed'];
  return completedStatuses.includes(subTask.status);
}

/**
 * Prüft ob ALLE erwarteten Sub-Tasks fertig sind
 * und setzt Parent-Task zurück auf "To Do" wenn ja
 * 
 * FLEXIBLE LOGIK:
 * - Erkennt automatisch welche Sub-Task-Typen existieren
 * - Prüft nur die Sub-Tasks die tatsächlich vorhanden sind
 * - Funktioniert mit 1, 2, 3 oder mehr Sub-Tasks
 * 
 * @param {Function} jiraMcpClient - MCP Client Funktion für Jira calls
 * @param {string} parentTaskKey - Key des Parent-Tasks (z.B. "AT-6")
 * @param {string} completedSubTaskKey - Key des gerade fertiggestellten Sub-Tasks
 * @param {string} agentEmoji - Emoji des aufrufenden Agents
 * @returns {Promise<Object>} - { allComplete: boolean, parentUpdated: boolean, summary: string }
 */
export async function checkAndResetParentTask(jiraMcpClient, parentTaskKey, completedSubTaskKey, agentEmoji) {
  try {
    console.log(`\n${agentEmoji} Checking if all sub-tasks are complete...`);
    
    // 1. Hole Parent-Task
    const parentResult = await jiraMcpClient('get_ticket', { 
      ticketKey: parentTaskKey 
    });
    
    if (!parentResult.success) {
      console.log(`   ⚠️  Could not load parent task`);
      return { allComplete: false, parentUpdated: false };
    }
    
    // 2. Hole alle Sub-Tasks des Parents
    const subTasksResult = await jiraMcpClient('get_tickets', {
      parentKey: parentTaskKey,
      maxResults: 50
    });
    
    if (!subTasksResult.success) {
      console.log(`   ⚠️  Could not load sub-tasks`);
      return { allComplete: false, parentUpdated: false };
    }
    
    const allSubTasks = subTasksResult.tickets;
    
    // 3. Identifiziere und gruppiere Sub-Tasks nach Typ
    const subTasksByType = new Map();
    const unidentifiedSubTasks = [];
    
    for (const subTask of allSubTasks) {
      const type = identifySubTaskType(subTask);
      
      if (type) {
        subTasksByType.set(type.id, {
          type: type,
          subTask: subTask,
          isComplete: isSubTaskComplete(subTask)
        });
      } else {
        // Sub-Task hat keinen bekannten Typ (z.B. manuelle Sub-Tasks)
        unidentifiedSubTasks.push(subTask);
      }
    }
    
    // 4. Log Status aller identifizierten Sub-Tasks
    console.log(`\n   📋 Found ${subTasksByType.size} agent sub-task(s):`);
    for (const [typeId, info] of subTasksByType.entries()) {
      const statusIcon = info.isComplete ? '✅' : '⏳';
      console.log(`   ${statusIcon} ${info.type.emoji} ${info.type.name}: ${info.subTask.key} (${info.subTask.status})`);
    }
    
    if (unidentifiedSubTasks.length > 0) {
      console.log(`\n   ℹ️  ${unidentifiedSubTasks.length} other sub-task(s) (not agent-managed)`);
    }
    
    // 5. Prüfe ob mindestens 1 Sub-Task existiert
    if (subTasksByType.size === 0) {
      console.log(`\n   ⚠️  No agent sub-tasks found`);
      return { allComplete: false, parentUpdated: false };
    }
    
    // 6. Prüfe ob ALLE gefundenen Sub-Tasks fertig sind
    const allComplete = Array.from(subTasksByType.values()).every(info => info.isComplete);
    const totalSubTasks = subTasksByType.size;
    const completedSubTasks = Array.from(subTasksByType.values()).filter(info => info.isComplete).length;
    
    console.log(`\n   Progress: ${completedSubTasks}/${totalSubTasks} sub-tasks complete`);
    
    if (!allComplete) {
      console.log(`   ⏳ Waiting for remaining sub-tasks...`);
      return { allComplete: false, parentUpdated: false };
    }
    
    // 7. ✅ ALLE Sub-Tasks sind fertig! → Reset Parent
    console.log(`\n   🎉 All ${totalSubTasks} sub-task(s) complete! Resetting parent to "To Do"...`);
    
    // Update Parent-Task Status
    const updateResult = await jiraMcpClient('update_ticket', {
      ticketKey: parentTaskKey,
      updates: {
        status: 'To Do'
      }
    });
    
    if (!updateResult.success) {
      console.log(`   ❌ Failed to update parent status`);
      return { allComplete: true, parentUpdated: false };
    }
    
    console.log(`   ✅ Parent task ${parentTaskKey} reset to "To Do"`);
    
    // 8. Erstelle Kommentar mit Zusammenfassung
    const completedList = Array.from(subTasksByType.values())
      .map(info => `- ${info.subTask.key}: ${info.type.emoji} ${info.subTask.summary}`)
      .join('\n');
    
    const emojis = Array.from(subTasksByType.values())
      .map(info => info.type.emoji)
      .join('');
    
    const comment = `${emojis} *Alle Vorarbeiten abgeschlossen*\n\n` +
                   `${totalSubTasks} Sub-Task(s) sind fertig:\n` +
                   `${completedList}\n\n` +
                   `Der Task ist bereit für die Implementierung! 🚀\n` +
                   `_Status zurückgesetzt auf "To Do" am ${new Date().toISOString()}_`;
    
    await jiraMcpClient('add_comment', {
      ticketKey: parentTaskKey,
      comment: comment
    });
    
    console.log(`   ✅ Comment posted in parent task`);
    
    const summary = `${totalSubTasks} sub-task(s) completed: ${Array.from(subTasksByType.values()).map(i => i.type.name).join(', ')}`;
    
    return { 
      allComplete: true, 
      parentUpdated: true,
      summary: summary,
      completedCount: totalSubTasks
    };
    
  } catch (error) {
    console.error(`${agentEmoji} Error in checkAndResetParentTask:`, error.message);
    return { allComplete: false, parentUpdated: false, error: error.message };
  }
}

/**
 * Hilfsfunktion: Füge einen neuen Sub-Task-Typ hinzu
 * Nützlich für Erweiterungen in der Zukunft
 */
export function registerSubTaskType(typeConfig) {
  // Prüfe ob Typ bereits existiert
  const exists = SUB_TASK_TYPES.some(t => t.id === typeConfig.id);
  
  if (!exists) {
    SUB_TASK_TYPES.push(typeConfig);
    console.log(`✅ Registered new sub-task type: ${typeConfig.emoji} ${typeConfig.name}`);
    return true;
  } else {
    console.log(`⚠️  Sub-task type already exists: ${typeConfig.id}`);
    return false;
  }
}

/**
 * Hilfsfunktion: Zeige alle registrierten Sub-Task-Typen
 */
export function getRegisteredSubTaskTypes() {
  return SUB_TASK_TYPES.map(type => ({
    id: type.id,
    name: type.name,
    emoji: type.emoji
  }));
}
