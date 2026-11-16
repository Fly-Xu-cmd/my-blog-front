import jwt from 'jsonwebtoken';
import { ApiError, body, booleanField, endpoint, json, textField } from '@/lib/api';
export const POST = endpoint(async (req: Request) => {
  const data = await body(req);
  const username = textField(data.username, 255, true);
  const password = textField(data.password, 512, true);
  const remember = booleanField(data.remember) ?? false;
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET)
    throw new ApiError(503, 'AUTH_UNAVAILABLE');
  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD)
    throw new ApiError(401, 'INVALID_CREDENTIALS', '用户名或密码错误');
  const token = jwt.sign({ username }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: remember ? '7d' : '1h',
  });
  return json({ ok: true, data: { token } });
});
