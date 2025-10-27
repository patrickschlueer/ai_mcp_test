import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';

dotenv.config();

/**
 * GitHub API Client
 * Wrapper für GitHub API mit Octokit
 */
class GitHubClient {
  constructor() {
    this.token = process.env.GITHUB_TOKEN;
    this.owner = process.env.GITHUB_OWNER;
    this.repo = process.env.GITHUB_REPO;
    this.defaultBranch = process.env.GITHUB_DEFAULT_BRANCH || 'main';
    
    this.octokit = new Octokit({
      auth: this.token
    });
    
    console.log(`[GitHubClient] Initialized`);
    console.log(`   Owner: ${this.owner}`);
    console.log(`   Repo: ${this.repo}`);
  }

  /**
   * Test: Verbindung zu GitHub prüfen
   */
  async testConnection() {
    try {
      const { data: user } = await this.octokit.rest.users.getAuthenticated();
      const { data: repoData } = await this.octokit.rest.repos.get({
        owner: this.owner,
        repo: this.repo
      });
      
      return {
        success: true,
        user: user.login,
        repo: repoData.full_name,
        private: repoData.private
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * File lesen
   */
  async getFile(path, branch = null) {
    try {
      console.log(`[GitHubClient] Getting file: ${path}`);
      
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: path,
        ref: branch || this.defaultBranch
      });

      if (data.type !== 'file') {
        return {
          success: false,
          error: 'Path is not a file'
        };
      }

      // Content ist Base64 encoded
      const content = Buffer.from(data.content, 'base64').toString('utf-8');

      return {
        success: true,
        file: {
          path: data.path,
          name: data.name,
          content: content,
          size: data.size,
          sha: data.sha,
          url: data.html_url
        }
      };
    } catch (error) {
      console.error(`[GitHubClient] Error getting file ${path}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Ordner-Struktur (Tree) abrufen
   */
  async getTree(path = '', branch = null) {
    try {
      console.log(`[GitHubClient] Getting tree: ${path || 'root'}`);
      
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: path,
        ref: branch || this.defaultBranch
      });

      if (!Array.isArray(data)) {
        // Single file, not a directory
        return {
          success: false,
          error: 'Path is not a directory'
        };
      }

      const items = data.map(item => ({
        name: item.name,
        path: item.path,
        type: item.type, // 'file' or 'dir'
        size: item.size,
        sha: item.sha,
        url: item.html_url
      }));

      return {
        success: true,
        path: path || 'root',
        items: items
      };
    } catch (error) {
      console.error(`[GitHubClient] Error getting tree ${path}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Code durchsuchen
   */
  async searchCode(query) {
    try {
      console.log(`[GitHubClient] Searching code: ${query}`);
      
      const { data } = await this.octokit.rest.search.code({
        q: `${query} repo:${this.owner}/${this.repo}`
      });

      const results = data.items.map(item => ({
        name: item.name,
        path: item.path,
        sha: item.sha,
        url: item.html_url,
        score: item.score
      }));

      return {
        success: true,
        total: data.total_count,
        results: results
      };
    } catch (error) {
      console.error(`[GitHubClient] Error searching code:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Branch erstellen
   */
  async createBranch(branchName, fromBranch = null) {
    try {
      console.log(`[GitHubClient] Creating branch: ${branchName}`);
      
      // Get SHA of the source branch
      const { data: refData } = await this.octokit.rest.git.getRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${fromBranch || this.defaultBranch}`
      });

      const sha = refData.object.sha;

      // Create new branch
      const { data } = await this.octokit.rest.git.createRef({
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${branchName}`,
        sha: sha
      });

      return {
        success: true,
        branch: branchName,
        sha: data.object.sha,
        url: data.url
      };
    } catch (error) {
      console.error(`[GitHubClient] Error creating branch ${branchName}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * File committen (erstellen oder ändern)
   */
  async commitFile(path, content, message, branch = null) {
    try {
      console.log(`[GitHubClient] Committing file: ${path}`);
      
      const targetBranch = branch || this.defaultBranch;

      // Check if file exists (to get SHA for update)
      let sha = null;
      try {
        const { data } = await this.octokit.rest.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path: path,
          ref: targetBranch
        });
        sha = data.sha;
      } catch (error) {
        // File doesn't exist, that's okay for new files
      }

      // Create or update file
      const { data } = await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: path,
        message: message,
        content: Buffer.from(content).toString('base64'),
        branch: targetBranch,
        ...(sha && { sha }) // Include SHA if updating existing file
      });

      return {
        success: true,
        path: path,
        sha: data.content.sha,
        commit: {
          sha: data.commit.sha,
          url: data.commit.html_url
        }
      };
    } catch (error) {
      console.error(`[GitHubClient] Error committing file ${path}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Pull Request erstellen
   */
  async createPullRequest(title, body, headBranch, baseBranch = null) {
    try {
      console.log(`[GitHubClient] Creating PR: ${title}`);
      
      const { data } = await this.octokit.rest.pulls.create({
        owner: this.owner,
        repo: this.repo,
        title: title,
        body: body,
        head: headBranch,
        base: baseBranch || this.defaultBranch
      });

      return {
        success: true,
        pr: {
          number: data.number,
          title: data.title,
          url: data.html_url,
          state: data.state
        }
      };
    } catch (error) {
      console.error(`[GitHubClient] Error creating PR:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Pull Requests abrufen (Liste)
   */
  async getPullRequests(state = 'open', limit = 30) {
    try {
      console.log(`[GitHubClient] Getting pull requests (state: ${state})`);
      
      const { data } = await this.octokit.rest.pulls.list({
        owner: this.owner,
        repo: this.repo,
        state: state, // 'open', 'closed', 'all'
        per_page: limit,
        sort: 'created',
        direction: 'desc'
      });

      const pullRequests = data.map(pr => ({
        number: pr.number,
        title: pr.title,
        body: pr.body || '',
        state: pr.state,
        url: pr.html_url,
        headBranch: pr.head.ref,
        baseBranch: pr.base.ref,
        author: pr.user.login,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        mergeable: pr.mergeable,
        merged: pr.merged,
        draft: pr.draft
      }));

      return {
        success: true,
        pullRequests: pullRequests,
        count: pullRequests.length
      };
    } catch (error) {
      console.error(`[GitHubClient] Error getting pull requests:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🆕 Einzelnen Pull Request abrufen (mit Details)
   */
  async getPullRequest(prNumber) {
    try {
      console.log(`[GitHubClient] Getting pull request #${prNumber}`);
      
      const { data } = await this.octokit.rest.pulls.get({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber
      });

      return {
        success: true,
        pr: {
          number: data.number,
          title: data.title,
          body: data.body || '',
          state: data.state,
          url: data.html_url,
          headBranch: data.head.ref,
          baseBranch: data.base.ref,
          author: data.user.login,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          mergeable: data.mergeable,
          merged: data.merged,
          draft: data.draft,
          commits: data.commits,
          additions: data.additions,
          deletions: data.deletions,
          changedFiles: data.changed_files
        }
      };
    } catch (error) {
      console.error(`[GitHubClient] Error getting pull request #${prNumber}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Alle Branches abrufen
   */
  async getBranches() {
    try {
      console.log(`[GitHubClient] Getting branches`);
      
      const { data } = await this.octokit.rest.repos.listBranches({
        owner: this.owner,
        repo: this.repo
      });

      const branches = data.map(branch => ({
        name: branch.name,
        sha: branch.commit.sha,
        protected: branch.protected
      }));

      return {
        success: true,
        branches: branches
      };
    } catch (error) {
      console.error(`[GitHubClient] Error getting branches:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Commits abrufen
   */
  async getCommits(branch = null, limit = 10) {
    try {
      console.log(`[GitHubClient] Getting commits`);
      
      const { data } = await this.octokit.rest.repos.listCommits({
        owner: this.owner,
        repo: this.repo,
        sha: branch || this.defaultBranch,
        per_page: limit
      });

      const commits = data.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author.name,
        date: commit.commit.author.date,
        url: commit.html_url
      }));

      return {
        success: true,
        commits: commits
      };
    } catch (error) {
      console.error(`[GitHubClient] Error getting commits:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🆕 PR Files (Changed Files) abrufen
   */
  async getPullRequestFiles(prNumber) {
    try {
      console.log(`[GitHubClient] Getting files for PR #${prNumber}`);
      
      const { data } = await this.octokit.rest.pulls.listFiles({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber
      });

      const files = data.map(file => ({
        filename: file.filename,
        status: file.status, // 'added', 'removed', 'modified', 'renamed'
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch, // Diff
        blobUrl: file.blob_url,
        rawUrl: file.raw_url
      }));

      return {
        success: true,
        files: files
      };
    } catch (error) {
      console.error(`[GitHubClient] Error getting PR files:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🆕 Kommentar zu PR hinzufügen
   */
  async addPRComment(prNumber, comment) {
    try {
      console.log(`[GitHubClient] Adding comment to PR #${prNumber}`);
      
      const { data } = await this.octokit.rest.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber, // PRs sind Issues in GitHub API
        body: comment
      });

      return {
        success: true,
        comment: {
          id: data.id,
          body: data.body,
          author: data.user.login,
          createdAt: data.created_at,
          url: data.html_url
        }
      };
    } catch (error) {
      console.error(`[GitHubClient] Error adding PR comment:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🆕 PR approven (Review mit approve status)
   */
  async approvePullRequest(prNumber) {
    try {
      console.log(`[GitHubClient] Approving PR #${prNumber}`);
      
      const { data } = await this.octokit.rest.pulls.createReview({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        event: 'APPROVE'
      });

      return {
        success: true,
        review: {
          id: data.id,
          state: data.state,
          submittedAt: data.submitted_at,
          url: data.html_url
        }
      };
    } catch (error) {
      console.error(`[GitHubClient] Error approving PR:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default GitHubClient;
