import { api } from './client';

export interface Project {
  id: string;
  name: string;
  description?: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
  status?: string;
  files?: FileInfo[];
}

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  type: string;
  modifiedAt: string;
}

export interface ProjectFile {
  path: string;
  content: string;
  name: string;
}

export interface ProjectHistoryEntry {
  id: string;
  message: string;
  timestamp: string;
  changes: number;
}

export interface ProjectLogs {
  stdout: string;
  stderr: string;
  exitCode?: number;
}

export interface GenerateProjectRequest {
  prompt: string;
  framework?: string;
  language?: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  template?: string;
}

export async function listProjects(): Promise<Project[]> {
  return api<Project[]>('/projects');
}

export async function generateProject(data: GenerateProjectRequest): Promise<Project> {
  return api<Project>('/projects/generate', {
    method: 'POST',
    body: JSON.stringify(data),
    noAuth: true,
  });
}

export async function createProject(data: CreateProjectRequest): Promise<Project> {
  return api<Project>('/projects/create', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function runProject(projectId: string): Promise<any> {
  return api(`/projects/${projectId}/run`, {
    method: 'POST',
  });
}

export async function runServer(projectId: string): Promise<any> {
  return api('/projects/run/server', {
    method: 'POST',
    body: JSON.stringify({ projectId }),
  });
}

export async function cloneProject(projectId: string): Promise<Project> {
  return api<Project>(`/projects/${projectId}/clone`, {
    method: 'POST',
  });
}

export async function getProjectFiles(projectId: string): Promise<FileInfo[]> {
  return api<FileInfo[]>(`/projects/${projectId}/files`, { noAuth: true });
}

export async function getProjectFile(projectId: string, filePath: string): Promise<ProjectFile> {
  return api<ProjectFile>(`/projects/${projectId}/files/${encodeURIComponent(filePath)}`, { noAuth: true });
}

export async function updateProjectFile(projectId: string, filePath: string, content: string): Promise<any> {
  return api(`/projects/${projectId}/file`, {
    method: 'PUT',
    body: JSON.stringify({ path: filePath, content }),
  });
}

export async function deleteProjectFile(projectId: string, filePath: string): Promise<any> {
  return api(`/projects/${projectId}/file`, {
    method: 'DELETE',
    body: JSON.stringify({ path: filePath }),
  });
}

export async function commitProject(projectId: string, message: string): Promise<any> {
  return api(`/projects/${projectId}/commit`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function getProjectHistory(projectId: string): Promise<ProjectHistoryEntry[]> {
  return api<ProjectHistoryEntry[]>(`/projects/${projectId}/history`);
}

export async function revertProject(projectId: string, commitId: string): Promise<any> {
  return api(`/projects/${projectId}/revert`, {
    method: 'POST',
    body: JSON.stringify({ commitId }),
  });
}

export async function getProjectLogs(projectId: string): Promise<ProjectLogs> {
  return api<ProjectLogs>(`/projects/${projectId}/logs`, { noAuth: true });
}

export async function searchProject(projectId: string, query: string): Promise<any[]> {
  return api<any[]>(`/projects/${projectId}/search?q=${encodeURIComponent(query)}`, { noAuth: true });
}

export async function deployProject(projectId: string): Promise<any> {
  return api(`/projects/${projectId}/deploy`, {
    method: 'POST',
  });
}

export async function pushToGitHub(projectId: string, repoUrl: string): Promise<any> {
  return api(`/projects/${projectId}/github`, {
    method: 'POST',
    body: JSON.stringify({ repoUrl }),
  });
}

export async function downloadProject(projectId: string): Promise<Blob> {
  const response = await fetch(`/projects/${projectId}/download`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('cf_token') || ''}`,
    },
  });
  return response.blob();
}

export async function importProject(file: File): Promise<Project> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`https://145.223.69.146:8443/projects/import`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('cf_token') || ''}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Import failed' }));
    throw err;
  }
  
  return response.json();
}
