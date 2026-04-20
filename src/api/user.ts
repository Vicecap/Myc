import { api } from './client';

export interface UsageStats {
  requestsToday: number;
  requestsTotal: number;
  tokensUsed: number;
  projectsCreated: number;
  storageUsed: number;
  limit?: {
    requests: number;
    storage: number;
    projects: number;
  };
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
}

export async function getUsage(): Promise<UsageStats> {
  return api<UsageStats>('/user/usage');
}

export async function getApiKeys(): Promise<ApiKey[]> {
  return api<ApiKey[]>('/user/keys');
}

export async function createApiKey(name: string): Promise<ApiKey> {
  return api<ApiKey>('/user/keys', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function deleteApiKey(keyId: string): Promise<void> {
  return api(`/user/keys/${keyId}`, { method: 'DELETE' });
}
