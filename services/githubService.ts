import { AppData, GitHubConfig } from '../types';
import { getCurrentEthiopianDate } from './ethiopianDate';

export const getGitHubConfig = (): GitHubConfig => {
  const stored = localStorage.getItem('arms_github_config');
  return stored ? JSON.parse(stored) : { token: '', owner: '', repo: '', path: 'arms_db.json', enabled: false };
};

export const isGitHubConfigured = (config?: GitHubConfig): boolean => {
  const cfg = config || getGitHubConfig();
  return Boolean(cfg && cfg.enabled && cfg.token?.trim() && cfg.owner?.trim() && cfg.repo?.trim() && cfg.path?.trim());
};

export const saveGitHubConfig = (config: GitHubConfig) => {
  localStorage.setItem('arms_github_config', JSON.stringify(config));
};

// --- UTF-8 Safe Base64 Encoders ---
function toBase64(str: string) {
    const bytes = new TextEncoder().encode(str);
    const binString = Array.from(bytes, (byte) =>
        String.fromCodePoint(byte)
    ).join("");
    return btoa(binString);
}

function fromBase64(base64: string) {
    const binString = atob(base64);
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
    return new TextDecoder().decode(bytes);
}

/**
 * Maps Ethiopian Month Number to English Month Name for GitHub Folder Naming
 */
export const getFolderName = (year: string, month: string): string => {
  const monthMap: Record<string, string> = {
    "01": "september", "1": "september",
    "02": "october", "2": "october",
    "03": "november", "3": "november",
    "04": "december", "4": "december",
    "05": "january", "5": "january",
    "06": "february", "6": "february",
    "07": "march", "7": "march",
    "08": "april", "8": "april",
    "09": "may", "9": "may",
    "10": "june",
    "11": "july",
    "12": "august",
    "13": "pagume"
  };
  const mName = monthMap[month] || `month_${month}`;
  return `${mName}${year}`;
};

const checkIfNewUser = (): boolean => {
  const adminCust = localStorage.getItem('arms_admin_customized');
  const userCust = localStorage.getItem('arms_user_customized');
  const adminHash = localStorage.getItem('arms_admin_password_hash');
  const userHash = localStorage.getItem('arms_user_password_hash');
  const DEFAULT_ADMIN_PASSWORD_HASH = '89950db85e13d5cf42017fe7003c4a243fe614b6bc6be869fbf793c9d7494f6f';
  const DEFAULT_USER_PASSWORD_HASH = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';

  const hasChangedAdmin = (adminCust === 'true') || (adminHash && adminHash !== DEFAULT_ADMIN_PASSWORD_HASH);
  const hasChangedUser = (userCust === 'true') || (userHash && userHash !== DEFAULT_USER_PASSWORD_HASH);

  return !(hasChangedAdmin || hasChangedUser);
};

/**
 * Dynamically resolves the current backup folder and filename.
 * Implements the auto-allocation sequence (arms001.json, arms002.json, etc.).
 */
export const getActiveFolderAndFile = async (customConfig?: GitHubConfig): Promise<{ folder: string, filename: string }> => {
  const selectedMonth = localStorage.getItem('arms_selected_month');
  const selectedYear = localStorage.getItem('arms_selected_year');
  
  let m = selectedMonth;
  let y = selectedYear;
  
  if (!m || !y) {
    const currentEth = getCurrentEthiopianDate(); // e.g. "2018-11-15"
    const parts = currentEth.split('-');
    y = parts[0];
    m = parts[1];
  }
  
  const folder = getFolderName(y, m);
  
  // Try to read cached assignment for this specific folder
  const savedFolder = localStorage.getItem('arms_assigned_filename_folder');
  const savedFile = localStorage.getItem('arms_assigned_filename');
  
  if (savedFolder === folder && savedFile && !customConfig) {
    return { folder, filename: savedFile };
  }
  
  // No file assigned for this folder/month yet, scan GitHub directory to allocate next sequence number
  const config = customConfig || getGitHubConfig();
  if (!config.token || !config.owner || !config.repo) {
    return { folder, filename: 'arms001.json' };
  }
  
  try {
    const listUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${folder}`;
    const response = await fetch(listUrl, {
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    let filename = 'arms001.json';
    
    if (response.ok) {
      const files = await response.json();
      if (Array.isArray(files)) {
        let maxNum = 0;
        files.forEach(f => {
          const match = f.name.match(/^arms(\d+)\.json$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) {
              maxNum = num;
            }
          }
        });
        
        const isNew = checkIfNewUser();
        if (isNew) {
          filename = `arms${String(maxNum + 1).padStart(3, '0')}.json`;
        } else {
          filename = `arms${String(maxNum > 0 ? maxNum : 1).padStart(3, '0')}.json`;
        }
      }
    } else if (response.status === 404) {
      // Folder does not exist, start with arms001.json
      filename = 'arms001.json';
    }
    
    if (!customConfig) {
      // Save assignment cache to prevent subsequent re-allocation
      localStorage.setItem('arms_assigned_filename_folder', folder);
      localStorage.setItem('arms_assigned_filename', filename);
    }
    
    return { folder, filename };
  } catch (err) {
    console.error("Failed to dynamically allocate backup filename from GitHub. Falling back:", err);
    return { folder, filename: 'arms001.json' };
  }
};

/**
 * Auto-detects/generates the correct folder and file path on GitHub for a given set of credentials.
 */
export const autoDetectGitHubPath = async (owner: string, repo: string, token: string): Promise<string> => {
  const selectedMonth = localStorage.getItem('arms_selected_month');
  const selectedYear = localStorage.getItem('arms_selected_year');
  
  let m = selectedMonth;
  let y = selectedYear;
  
  if (!m || !y) {
    const currentEth = getCurrentEthiopianDate(); // e.g. "2018-11-15"
    const parts = currentEth.split('-');
    y = parts[0];
    m = parts[1];
  }
  
  const folder = getFolderName(y, m);
  
  try {
    const listUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${folder}`;
    const response = await fetch(listUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    let filename = 'arms001.json';
    
    if (response.ok) {
      const files = await response.json();
      if (Array.isArray(files)) {
        let maxNum = 0;
        files.forEach(f => {
          const match = f.name.match(/^arms(\d+)\.json$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) {
              maxNum = num;
            }
          }
        });
        
        const isNew = checkIfNewUser();
        if (isNew) {
          filename = `arms${String(maxNum + 1).padStart(3, '0')}.json`;
        } else {
          filename = `arms${String(maxNum > 0 ? maxNum : 1).padStart(3, '0')}.json`;
        }
      }
    }
    
    return `${folder}/${filename}`;
  } catch (err) {
    console.error("Auto-detect path failed:", err);
    return `${folder}/arms001.json`;
  }
};

export const fetchFromGitHub = async (customPath?: string, force: boolean = false): Promise<{ data: AppData | null, sha: string | null, error: string | null }> => {
  const config = getGitHubConfig();
  if ((!config.enabled && !force) || !config.token || !config.owner || !config.repo) {
    return { data: null, sha: null, error: 'GitHub Sync not configured' };
  }

  try {
    // 1. Verify repository access first to differentiate between "empty repo/new file" and "wrong repo/invalid token"
    const repoUrl = `https://api.github.com/repos/${config.owner}/${config.repo}`;
    const repoResponse = await fetch(repoUrl, {
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!repoResponse.ok) {
      if (repoResponse.status === 401 || repoResponse.status === 403) {
        throw new Error('Invalid GitHub token or insufficient permissions (check repository access/scopes).');
      } else if (repoResponse.status === 404) {
        throw new Error('Repository not found. Double check repository owner, repository name, and token scopes.');
      } else {
        throw new Error(`GitHub API Error verifying repository: ${repoResponse.statusText}`);
      }
    }

    // Determine target path dynamically if not specified
    let targetPath = customPath || config.path;
    if (!targetPath || targetPath === 'arms_db.json') {
      const { folder, filename } = await getActiveFolderAndFile();
      targetPath = `${folder}/${filename}`;
    }

    // 2. Fetch file contents.
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${targetPath}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
          // File doesn't exist yet, not an error per se, just needs initial push
          return { data: null, sha: null, error: null }; 
      }
      throw new Error(`GitHub API Error: ${response.statusText}`);
    }

    const json = await response.json();
    const content = fromBase64(json.content);
    const data = JSON.parse(content) as AppData;
    
    // Update local config with SHA if it matches the main config path (backwards compatibility)
    if (targetPath === config.path) {
      saveGitHubConfig({ ...config, sha: json.sha });
    }

    return { data, sha: json.sha, error: null };
  } catch (error) {
    return { data: null, sha: null, error: error instanceof Error ? error.message : String(error) };
  }
};

export const pushToGitHub = async (data: AppData, customPath?: string, force: boolean = false): Promise<{ success: boolean, error: string | null }> => {
  const config = getGitHubConfig();
  if ((!config.enabled && !force) || !config.token || !config.owner || !config.repo) {
    return { success: false, error: 'GitHub Sync not configured' };
  }

  // Determine target path dynamically if not specified
  let targetPath = customPath || config.path;
  if (!targetPath || targetPath === 'arms_db.json') {
    const { folder, filename } = await getActiveFolderAndFile();
    targetPath = `${folder}/${filename}`;
  }

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${targetPath}`;
  const content = toBase64(JSON.stringify(data, null, 2));

  // Helper to perform the PUT request
  const performPut = async (sha?: string) => {
      const body: any = {
        message: `ARMS Auto-Sync [${targetPath}]: ${new Date().toISOString()}`,
        content: content,
      };
      if (sha) body.sha = sha;

      return fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${config.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(body)
      });
  };

  try {
    // 1. Verify repository access first
    const repoUrl = `https://api.github.com/repos/${config.owner}/${config.repo}`;
    const repoResponse = await fetch(repoUrl, {
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!repoResponse.ok) {
      if (repoResponse.status === 401 || repoResponse.status === 403) {
        throw new Error('Invalid GitHub token or insufficient permissions.');
      } else if (repoResponse.status === 404) {
        throw new Error('Repository not found. Double check repository details.');
      } else {
        throw new Error(`GitHub API Error: ${repoResponse.statusText}`);
      }
    }

    // For dynamic files, we first attempt to fetch the file to get its remote SHA (prevent conflicts)
    let currentSha: string | undefined = undefined;
    const checkRes = await fetch(url, {
      headers: { 
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (checkRes.ok) {
      const checkJson = await checkRes.json();
      currentSha = checkJson.sha;
    }

    // Try with detected SHA
    let response = await performPut(currentSha);

    // Exponential backoff retry loop for Conflict (409) or Unprocessable Entity / SHA mismatch (422)
    const MAX_RETRIES = 3;
    let attempt = 0;

    while ((response.status === 409 || response.status === 422) && attempt < MAX_RETRIES) {
      attempt++;
      const backoffDelay = Math.pow(2, attempt) * 250 + Math.floor(Math.random() * 100);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));

      const getRes = await fetch(url, {
        headers: { 
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      let freshSha: string | undefined = undefined;
      if (getRes.ok) {
        const getJson = await getRes.json();
        freshSha = getJson.sha;
      }
      
      response = await performPut(freshSha);
    }

    if (!response.ok) {
         const errText = await response.text();
         let errMsg = `GitHub Error ${response.status}: `;
         try {
           const parsed = JSON.parse(errText);
           errMsg += parsed.message || errText;
         } catch {
           errMsg += errText || response.statusText;
         }
         throw new Error(errMsg);
    }

    const json = await response.json();
    if (targetPath === config.path) {
      saveGitHubConfig({ ...config, sha: json.content.sha });
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
};

export const deleteFromGitHub = async (customPath?: string, force: boolean = false): Promise<{ success: boolean, error: string | null }> => {
  const config = getGitHubConfig();
  if ((!config.enabled && !force) || !config.token || !config.owner || !config.repo) {
    return { success: false, error: 'GitHub Sync not configured' };
  }

  let targetPath = customPath || config.path;
  if (!targetPath || targetPath === 'arms_db.json') {
    const { folder, filename } = await getActiveFolderAndFile();
    targetPath = `${folder}/${filename}`;
  }

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${targetPath}`;

  try {
    const checkRes = await fetch(url, {
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!checkRes.ok) {
      if (checkRes.status === 404) {
        return { success: true, error: null };
      }
      throw new Error(`GitHub API Error: ${checkRes.statusText}`);
    }

    const checkJson = await checkRes.json();
    const sha = checkJson.sha;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${config.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: `ARMS Factory Reset Delete [${targetPath}]: ${new Date().toISOString()}`,
        sha: sha
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = `GitHub Error ${response.status}: `;
      try {
        const parsed = JSON.parse(errText);
        errMsg += parsed.message || errText;
      } catch {
        errMsg += errText || response.statusText;
      }
      throw new Error(errMsg);
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
};

export interface GitHubUserBackup {
  filename: string;
  folder: string;
  path: string;
  sha: string;
  size: number;
}

/**
 * Scans a folder in GitHub to list all registered user backup JSON files.
 */
export const listUserBackups = async (folderName: string): Promise<{ backups: GitHubUserBackup[], error: string | null }> => {
  const config = getGitHubConfig();
  if (!config.enabled || !config.token || !config.owner || !config.repo) {
    return { backups: [], error: 'GitHub Sync not configured' };
  }

  try {
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${folderName}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { backups: [], error: null }; // Folder doesn't exist yet (no users have saved)
      }
      throw new Error(`GitHub API Error: ${response.statusText}`);
    }

    const files = await response.json();
    if (!Array.isArray(files)) {
      return { backups: [], error: 'Target path is not a folder.' };
    }

    const backups: GitHubUserBackup[] = [];
    files.forEach(f => {
      if (f.name.match(/^arms\d+\.json$/)) {
        backups.push({
          filename: f.name,
          folder: folderName,
          path: f.path,
          sha: f.sha,
          size: f.size
        });
      }
    });

    return { backups, error: null };
  } catch (error) {
    return { backups: [], error: error instanceof Error ? error.message : String(error) };
  }
};

export interface RepoFileDetail {
  path: string;
  name: string;
  folder: string;
}

export const listAllRepositoryBackups = async (): Promise<{ files: RepoFileDetail[], error: string | null }> => {
  const config = getGitHubConfig();
  if (!config.enabled || !config.token || !config.owner || !config.repo) {
    return { files: [], error: 'GitHub Sync not configured' };
  }

  try {
    const rootUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/`;
    const response = await fetch(rootUrl, {
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.statusText}`);
    }

    const rootItems = await response.json();
    if (!Array.isArray(rootItems)) {
      return { files: [], error: 'Root is not a directory.' };
    }

    const filesList: RepoFileDetail[] = [];
    const folderPromises: Promise<any>[] = [];

    for (const item of rootItems) {
      if (item.type === 'dir') {
        const folderName = item.name;
        const folderUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${folderName}`;
        const folderPromise = fetch(folderUrl, {
          headers: {
            'Authorization': `token ${config.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }).then(async (res) => {
          if (res.ok) {
            const subItems = await res.json();
            if (Array.isArray(subItems)) {
              subItems.forEach((sub) => {
                if (sub.type === 'file' && sub.name.endsWith('.json')) {
                  filesList.push({
                    path: sub.path,
                    name: sub.name,
                    folder: folderName
                  });
                }
              });
            }
          }
        }).catch((err) => {
          console.error(`Error scanning folder ${folderName}:`, err);
        });
        folderPromises.push(folderPromise);
      } else if (item.type === 'file' && item.name.endsWith('.json')) {
        filesList.push({
          path: item.path,
          name: item.name,
          folder: 'root'
        });
      }
    }

    await Promise.all(folderPromises);
    filesList.sort((a, b) => a.path.localeCompare(b.path));

    return { files: filesList, error: null };
  } catch (error) {
    return { files: [], error: error instanceof Error ? error.message : String(error) };
  }
};

/**
 * Searches all files in the repository to find those that contain the given secret key.
 */
export const findFilesBySecretKey = async (secretKey: string): Promise<{ paths: string[], error: string | null }> => {
  const config = getGitHubConfig();
  if (!config.enabled || !config.token || !config.owner || !config.repo) {
    return { paths: [], error: 'GitHub Sync not configured' };
  }

  try {
    const { files, error } = await listAllRepositoryBackups();
    if (error) {
      return { paths: [], error };
    }

    const matchingPaths: string[] = [];
    
    // Fetch and check files in batches or in parallel with a concurrency limit
    const checkFile = async (filePath: string): Promise<string | null> => {
      try {
        const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${filePath}`;
        const res = await fetch(url, {
          headers: {
            'Authorization': `token ${config.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        if (res.ok) {
          const json = await res.json();
          const content = fromBase64(json.content);
          const parsed = JSON.parse(content);
          
          // Check for secret key at the top level or inside securityCredentials
          const fileKey = parsed.secretKey || parsed.securityCredentials?.secretKey;
          if (fileKey && fileKey.trim() === secretKey.trim()) {
            return filePath;
          }
        }
      } catch (e) {
        console.error(`Error verifying secret key in file ${filePath}:`, e);
      }
      return null;
    };

    // Run checks in parallel
    const results = await Promise.all(files.map(f => checkFile(f.path)));
    results.forEach(path => {
      if (path) matchingPaths.push(path);
    });

    return { paths: matchingPaths, error: null };
  } catch (err) {
    return { paths: [], error: err instanceof Error ? err.message : String(err) };
  }
};


