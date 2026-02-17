interface LoginResponse {
  token: string;
  refreshToken: string;
  user: { userId: string; email: string; role: string };
}

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err: { error?: { message?: string } } = await res.json();
    throw new Error(err.error?.message || 'Login failed');
  }
  const json = await res.json() as { success: boolean; data: LoginResponse };
  return json.data;
}
