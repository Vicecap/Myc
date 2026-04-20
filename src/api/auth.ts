import { api, setToken, clearToken } from './client';

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  createdAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await api<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (response.token) {
    setToken(response.token);
  }
  return response;
}

export async function register(data: RegisterRequest): Promise<LoginResponse> {
  const response = await api<LoginResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (response.token) {
    setToken(response.token);
  }
  return response;
}

export async function logout(): Promise<void> {
  try {
    await api('/auth/logout', { method: 'POST' });
  } finally {
    clearToken();
  }
}

export async function getMe(): Promise<User> {
  return api<User>('/auth/me');
}
