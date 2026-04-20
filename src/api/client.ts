const BASE_URL = 'https://145.223.69.146:8443';

export { BASE_URL };

export interface ApiOptions extends RequestInit {
  noAuth?: boolean;
}

export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

function getToken(): string | null {
  return localStorage.getItem('cf_token');
}

function setToken(token: string): void {
  localStorage.setItem('cf_token', token);
}

function clearToken(): void {
  localStorage.removeItem('cf_token');
}

export async function api<T = any>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { noAuth, headers: customHeaders, ...restOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string> || {}),
  };

  if (!noAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...restOptions,
    headers,
    credentials: 'same-origin',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    const apiError: ApiError = {
      error: errorData.error || 'Request failed',
      message: errorData.message || '',
      statusCode: response.status,
    };
    throw apiError;
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  }

  return response.text() as unknown as T;
}

export async function apiStream(
  endpoint: string,
  body: any,
  onChunk: (text: string) => void,
  onComplete?: () => void,
  onError?: (error: string) => void
): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Stream failed' }));
      onError?.(err.error || 'Stream request failed');
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError?.('Streaming not supported');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            onComplete?.();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const text = parsed.choices?.[0]?.delta?.content ||
                         parsed.choices?.[0]?.text ||
                         parsed.content ||
                         parsed.text ||
                         parsed.response ||
                         parsed.delta?.content ||
                         '';
            if (text) onChunk(text);
          } catch {
            onChunk(data);
          }
        } else if (trimmed && trimmed.startsWith('{')) {
          try {
            const parsed = JSON.parse(trimmed);
            const text = parsed.choices?.[0]?.delta?.content ||
                         parsed.choices?.[0]?.text ||
                         parsed.content ||
                         parsed.text ||
                         parsed.response ||
                         '';
            if (text) onChunk(text);
          } catch {
            onChunk(trimmed);
          }
        }
      }
    }
    onComplete?.();
  } catch (err: any) {
    onError?.(err.message || 'Stream connection failed');
  }
}

export { getToken, setToken, clearToken };
