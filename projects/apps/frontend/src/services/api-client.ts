import type { ApiResponse } from '@smaste/shared';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export async function apiClient<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const body = (await response.json()) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(body.message);
  }

  return body;
}
