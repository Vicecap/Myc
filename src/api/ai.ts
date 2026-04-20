import { api, apiStream } from './client';

export interface AIModel {
  id: string;
  name: string;
  provider?: string;
  type?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionRequest {
  model?: string;
  messages: ChatMessage[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
}

export interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
}

export interface AIPromptRequest {
  prompt: string;
  model?: string;
  context?: string;
  system?: string;
}

export interface AIImproveRequest {
  code: string;
  language?: string;
  instructions?: string;
}

export interface AIExplainRequest {
  code: string;
  language?: string;
}

export interface AIDebugRequest {
  code: string;
  error?: string;
  language?: string;
}

export interface AIFromProjectRequest {
  projectId: string;
  prompt: string;
  filePath?: string;
}

export async function getModels(): Promise<AIModel[]> {
  return api<AIModel[]>('/ai/models', { noAuth: true });
}

export async function aiPrompt(data: AIPromptRequest): Promise<{ response: string }> {
  return api<{ response: string }>('/ai', {
    method: 'POST',
    body: JSON.stringify(data),
    noAuth: true,
  });
}

export async function aiStreamPrompt(
  data: AIPromptRequest,
  onChunk: (text: string) => void,
  onComplete?: () => void,
  onError?: (error: string) => void
): Promise<void> {
  return apiStream('/ai/stream', data, onChunk, onComplete, onError);
}

export async function chatCompletion(data: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  return api<ChatCompletionResponse>('/ai/chat/completions', {
    method: 'POST',
    body: JSON.stringify(data),
    noAuth: true,
  });
}

export async function aiImprove(data: AIImproveRequest): Promise<{ response: string; improvedCode: string }> {
  return api<{ response: string; improvedCode: string }>('/ai/improve', {
    method: 'POST',
    body: JSON.stringify(data),
    noAuth: true,
  });
}

export async function aiExplain(data: AIExplainRequest): Promise<{ response: string }> {
  return api<{ response: string }>('/ai/explain', {
    method: 'POST',
    body: JSON.stringify(data),
    noAuth: true,
  });
}

export async function aiDebug(data: AIDebugRequest): Promise<{ response: string; fix: string }> {
  return api<{ response: string; fix: string }>('/ai/debug', {
    method: 'POST',
    body: JSON.stringify(data),
    noAuth: true,
  });
}

export async function aiFromProject(data: AIFromProjectRequest): Promise<{ response: string }> {
  return api<{ response: string }>('/ai/from-project', {
    method: 'POST',
    body: JSON.stringify(data),
    noAuth: true,
  });
}

export async function generateImage(prompt: string, model?: string): Promise<{ url: string }> {
  return api<{ url: string }>('/images/generations', {
    method: 'POST',
    body: JSON.stringify({ prompt, model }),
  });
}

export async function generateVideo(prompt: string): Promise<{ url: string }> {
  return api<{ url: string }>('/videos/generations', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
}

export async function runSandbox(code: string, language?: string): Promise<any> {
  return api('/sandbox/run', {
    method: 'POST',
    body: JSON.stringify({ code, language }),
  });
}
