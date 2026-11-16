import { json } from '@/lib/api';
export async function POST() {
  return json({ ok: false, error: '请使用 /api/auth/me 和 Authorization header' }, 410);
}
