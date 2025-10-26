import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Jira/Confluence API Client
 * Verwendet Basic Authentication mit Email + API Token
 */
class AtlassianClient {
  constructor() {
    this.host = process.env.JIRA_HOST;
    this.email = process.env.JIRA_EMAIL;
    this.apiToken = process.env.JIRA_API_TOKEN;
    this.projectKey = process.env.JIRA_PROJECT_KEY;
    
    // Basic Auth Header erstellen
    const auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');
    
    this.axiosInstance = axios.create({
      baseURL: `https://${this.host}`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Hilfsfunktion: Konvertiere Markdown zu ADF (Atlassian Document Format)
   */
  markdownToADF(markdown) {
    const lines = markdown.split('\n');
    const content = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed) {
        // Leere Zeile = neuer Paragraph mit leerem Text
        continue;
      }
      
      // Überschriften
      if (trimmed.startsWith('## ')) {
        content.push({
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: trimmed.substring(3) }]
        });
      } else if (trimmed.startsWith('### ')) {
        content.push({
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: trimmed.substring(4) }]
        });
      }
      // Liste
      else if (trimmed.startsWith('- ')) {
        // Finde alle aufeinanderfolgenden Listen-Items
        const listItems = [];
        let i = lines.indexOf(line);
        
        while (i < lines.length && lines[i].trim().startsWith('- ')) {
          const itemText = lines[i].trim().substring(2);
          listItems.push({
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: itemText }]
            }]
          });
          i++;
        }
        
        content.push({
          type: 'bulletList',
          content: listItems
        });
        
        // Überspringe die bereits verarbeiteten Zeilen
        lines.splice(lines.indexOf(line), listItems.length - 1);
      }
      // Code Block
      else if (trimmed.startsWith('```')) {
        let i = lines.indexOf(line) + 1;
        const codeLines = [];
        
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        
        content.push({
          type: 'codeBlock',
          content: [{ type: 'text', text: codeLines.join('\n') }]
        });
        
        lines.splice(lines.indexOf(line), codeLines.length + 2);
      }
      // Horizontale Linie
      else if (trimmed === '---') {
        content.push({ type: 'rule' });
      }
      // Normaler Paragraph
      else {
        // Parse inline formatting
        const paragraphContent = [];
        let text = trimmed;
        
        // **Bold**
        const boldRegex = /\*\*([^*]+)\*\*/g;
        let lastIndex = 0;
        let match;
        
        while ((match = boldRegex.exec(text)) !== null) {
          // Text vor dem Bold
          if (match.index > lastIndex) {
            paragraphContent.push({
              type: 'text',
              text: text.substring(lastIndex, match.index)
            });
          }
          
          // Bold Text
          paragraphContent.push({
            type: 'text',
            text: match[1],
            marks: [{ type: 'strong' }]
          });
          
          lastIndex = match.index + match[0].length;
        }
        
        // Rest des Textes
        if (lastIndex < text.length) {
          paragraphContent.push({
            type: 'text',
            text: text.substring(lastIndex)
          });
        }
        
        // Wenn kein inline formatting gefunden wurde
        if (paragraphContent.length === 0) {
          paragraphContent.push({ type: 'text', text: text });
        }
        
        content.push({
          type: 'paragraph',
          content: paragraphContent
        });
      }
    }
    
    return {
      type: 'doc',
      version: 1,
      content: content
    };
  }
  /**
   * Hilfsfunktion: Extrahiere Text aus Atlassian Document Format (ADF)
   */
  extractTextFromADF(adf) {
    if (!adf) return '';
    if (typeof adf === 'string') return adf;
    if (!adf.content) return '';
    
    let text = '';
    
    const processContent = (content) => {
      if (Array.isArray(content)) {
        content.forEach(item => {
          if (item.type === 'text') {
            text += item.text;
          } else if (item.type === 'hardBreak') {
            text += '\n';
          } else if (item.content) {
            processContent(item.content);
          }
          
          // Abstände zwischen Paragraphen
          if (item.type === 'paragraph') {
            text += '\n';
          }
        });
      }
    };
    
    processContent(adf.content);
    return text.trim();
  }

  /**
   * Test: Verbindung zu Jira prüfen
   */
  async testConnection() {
    try {
      const response = await this.axiosInstance.get('/rest/api/3/myself');
      return {
        success: true,
        user: response.data.displayName,
        email: response.data.emailAddress
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * JIRA: Alle Tickets abrufen (mit Filter)
   */
  async getTickets(filters = {}) {
    try {
      const { 
        status = null, 
        assignee = null, 
        maxResults = 50 
      } = filters;

      // JQL Query bauen - INKLUDIERE AUCH SUB-TASKS!
      let jql = `project = ${this.projectKey}`;
      
      if (status) {
        jql += ` AND status = "${status}"`;
      }
      
      if (assignee === 'UNASSIGNED') {
        jql += ` AND assignee is EMPTY`;
      } else if (assignee) {
        jql += ` AND assignee = "${assignee}"`;
      }
      
      jql += ' ORDER BY created DESC';

      console.log(`[JiraClient] Executing JQL: ${jql}`);

      const response = await this.axiosInstance.get('/rest/api/3/search/jql', {
        params: {
          jql: jql,
          maxResults: maxResults,
          fields: 'summary,description,status,assignee,created,updated,priority,issuetype'
        }
      });

      const tickets = response.data.issues.map(issue => {
        // Description in Text umwandeln
        let descriptionText = '';
        if (issue.fields.description) {
          if (typeof issue.fields.description === 'string') {
            descriptionText = issue.fields.description;
          } else if (issue.fields.description.content) {
            descriptionText = this.extractTextFromADF(issue.fields.description);
          } else {
            // Fallback: Object zu String, aber nicht anzeigen
            descriptionText = '';
          }
        }
        
        return {
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        description: descriptionText,
        status: issue.fields.status.name,
        assignee: issue.fields.assignee?.displayName || 'Unassigned',
        priority: issue.fields.priority?.name || 'Medium',
        issueType: issue.fields.issuetype.name,
        created: issue.fields.created,
        updated: issue.fields.updated,
        url: `https://${this.host}/browse/${issue.key}`
      };
      });

      console.log(`[JiraClient] Found ${tickets.length} tickets`);

      return {
        success: true,
        tickets: tickets,
        total: response.data.total
      };
    } catch (error) {
      console.error('[JiraClient] Error fetching tickets:', error.message);
      return {
        success: false,
        error: error.message,
        tickets: []
      };
    }
  }

  /**
   * JIRA: Einzelnes Ticket abrufen
   */
  async getTicket(ticketKey) {
    try {
      console.log(`[JiraClient] Fetching ticket: ${ticketKey}`);

      const response = await this.axiosInstance.get(
        `/rest/api/3/issue/${ticketKey}`,
        {
          params: {
            fields: 'summary,description,status,assignee,created,updated,priority,issuetype,comment,parent,labels,subtasks'
          }
        }
      );

      const issue = response.data;
      
      // Description in Text umwandeln (Jira v3 gibt Object zurück)
      let descriptionText = '';
      if (issue.fields.description) {
        if (typeof issue.fields.description === 'string') {
          descriptionText = issue.fields.description;
        } else if (issue.fields.description.content) {
          // Atlassian Document Format → Text extrahieren
          descriptionText = this.extractTextFromADF(issue.fields.description);
        } else {
          // Fallback für unbekannte Formate
          console.warn(`[JiraClient] Unknown description format for ${issue.key}`);
          descriptionText = '';
        }
      }
      
      const ticket = {
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        description: descriptionText,
        status: issue.fields.status.name,
        assignee: issue.fields.assignee?.displayName || 'Unassigned',
        priority: issue.fields.priority?.name || 'Medium',
        issueType: issue.fields.issuetype.name,
        created: issue.fields.created,
        updated: issue.fields.updated,
        url: `https://${this.host}/browse/${issue.key}`,
        parentKey: issue.fields.parent?.key || null,
        labels: issue.fields.labels || [],
        subTasks: issue.fields.subtasks?.map(st => ({
          key: st.key,
          summary: st.fields.summary,
          status: st.fields.status.name
        })) || [],
        comments: issue.fields.comment?.comments?.map(c => ({
          author: c.author.displayName,
          body: c.body,
          created: c.created
        })) || []
      };

      console.log(`[JiraClient] Ticket fetched: ${ticket.key} - ${ticket.summary}`);

      return {
        success: true,
        ticket: ticket
      };
    } catch (error) {
      console.error(`[JiraClient] Error fetching ticket ${ticketKey}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * JIRA: Ticket aktualisieren
   */
  async updateTicket(ticketKey, updates) {
    try {
      console.log(`[JiraClient] Updating ticket: ${ticketKey}`);

      const payload = {
        fields: {}
      };

      // Status ändern (via Transition)
      if (updates.status) {
        const transitions = await this.getTransitions(ticketKey);
        const transition = transitions.find(t => 
          t.name.toLowerCase() === updates.status.toLowerCase()
        );
        
        if (transition) {
          await this.axiosInstance.post(
            `/rest/api/3/issue/${ticketKey}/transitions`,
            { transition: { id: transition.id } }
          );
          console.log(`[JiraClient] Status changed to: ${updates.status}`);
        }
      }

      // Andere Felder
      if (updates.summary) payload.fields.summary = updates.summary;
      
      // 🔥 WICHTIG: Beschreibung muss als ADF formatiert sein!
      if (updates.description) {
        console.log(`[JiraClient] Converting Markdown to ADF...`);
        payload.fields.description = this.markdownToADF(updates.description);
      }
      
      if (updates.assignee) {
        payload.fields.assignee = { accountId: updates.assignee };
      }

      // Update durchführen (wenn Felder vorhanden)
      if (Object.keys(payload.fields).length > 0) {
        await this.axiosInstance.put(
          `/rest/api/3/issue/${ticketKey}`,
          payload
        );
        console.log(`[JiraClient] Ticket updated: ${ticketKey}`);
      }

      return {
        success: true,
        message: `Ticket ${ticketKey} updated successfully`
      };
    } catch (error) {
      console.error(`[JiraClient] Error updating ticket ${ticketKey}:`, error.message);
      if (error.response) {
        console.error(`[JiraClient] Response status:`, error.response.status);
        console.error(`[JiraClient] Response data:`, JSON.stringify(error.response.data, null, 2));
      }
      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * JIRA: Kommentar hinzufügen
   */
  async addComment(ticketKey, comment) {
    try {
      console.log(`[JiraClient] Adding comment to: ${ticketKey}`);

      await this.axiosInstance.post(
        `/rest/api/3/issue/${ticketKey}/comment`,
        {
          body: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: comment
                  }
                ]
              }
            ]
          }
        }
      );

      console.log(`[JiraClient] Comment added to: ${ticketKey}`);

      return {
        success: true,
        message: `Comment added to ${ticketKey}`
      };
    } catch (error) {
      console.error(`[JiraClient] Error adding comment to ${ticketKey}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * JIRA: Sub-Task erstellen
   */
  async createSubTask(parentKey, summary, description, labels = []) {
    try {
      console.log(`[JiraClient] Creating sub-task for: ${parentKey}`);

      // Hole Parent-Ticket um Project-ID zu bekommen
      const parentResponse = await this.axiosInstance.get(
        `/rest/api/3/issue/${parentKey}`,
        { params: { fields: 'project,issuetype' } }
      );

      const projectId = parentResponse.data.fields.project.id;
      
      // Hole Sub-Task Issue Type
      const issueTypesResponse = await this.axiosInstance.get(
        `/rest/api/3/issue/createmeta`,
        {
          params: {
            projectIds: projectId,
            expand: 'projects.issuetypes'
          }
        }
      );

      const project = issueTypesResponse.data.projects[0];
      const subTaskType = project.issuetypes.find(t => t.subtask === true);

      if (!subTaskType) {
        throw new Error('No sub-task issue type found');
      }

      // Erstelle Sub-Task
      const payload = {
        fields: {
          project: { id: projectId },
          parent: { key: parentKey },
          summary: summary,
          issuetype: { id: subTaskType.id }
        }
      };

      // Description als ADF
      if (description) {
        payload.fields.description = this.markdownToADF(description);
      }

      // Labels
      if (labels && labels.length > 0) {
        payload.fields.labels = labels;
      }

      const response = await this.axiosInstance.post(
        `/rest/api/3/issue`,
        payload
      );

      const subTaskKey = response.data.key;
      console.log(`[JiraClient] Sub-task created: ${subTaskKey}`);

      return {
        success: true,
        key: subTaskKey,
        id: response.data.id,
        url: `https://${this.host}/browse/${subTaskKey}`
      };
    } catch (error) {
      console.error(`[JiraClient] Error creating sub-task for ${parentKey}:`, error.message);
      if (error.response) {
        console.error(`[JiraClient] Response:`, JSON.stringify(error.response.data, null, 2));
      }
      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * JIRA: Verfügbare Transitions abrufen
   */
  async getTransitions(ticketKey) {
    try {
      const response = await this.axiosInstance.get(
        `/rest/api/3/issue/${ticketKey}/transitions`
      );
      return response.data.transitions.map(t => ({
        id: t.id,
        name: t.name
      }));
    } catch (error) {
      console.error(`[JiraClient] Error fetching transitions:`, error.message);
      return [];
    }
  }

  /**
   * CONFLUENCE: Seite erstellen oder aktualisieren
   */
  async updateConfluencePage(title, content, spaceKey = null) {
    try {
      const space = spaceKey || process.env.CONFLUENCE_SPACE_KEY;
      
      console.log(`[ConfluenceClient] Updating page: ${title} in space ${space}`);

      // Prüfe ob Seite existiert
      const searchResponse = await this.axiosInstance.get(
        '/wiki/rest/api/content',
        {
          params: {
            title: title,
            spaceKey: space,
            expand: 'version'
          }
        }
      );

      if (searchResponse.data.results.length > 0) {
        // Update existing page
        const page = searchResponse.data.results[0];
        const newVersion = page.version.number + 1;

        await this.axiosInstance.put(
          `/wiki/rest/api/content/${page.id}`,
          {
            version: { number: newVersion },
            title: title,
            type: 'page',
            body: {
              storage: {
                value: content,
                representation: 'storage'
              }
            }
          }
        );

        console.log(`[ConfluenceClient] Page updated: ${title}`);

        return {
          success: true,
          message: `Page "${title}" updated`,
          url: `https://${this.host}/wiki${page._links.webui}`
        };
      } else {
        // Create new page
        const response = await this.axiosInstance.post(
          '/wiki/rest/api/content',
          {
            type: 'page',
            title: title,
            space: { key: space },
            body: {
              storage: {
                value: content,
                representation: 'storage'
              }
            }
          }
        );

        console.log(`[ConfluenceClient] Page created: ${title}`);

        return {
          success: true,
          message: `Page "${title}" created`,
          url: `https://${this.host}/wiki${response.data._links.webui}`
        };
      }
    } catch (error) {
      console.error(`[ConfluenceClient] Error updating page "${title}":`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default AtlassianClient;
