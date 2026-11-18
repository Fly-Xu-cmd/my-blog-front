import { ApiError, body, endpoint, json } from '@/lib/api';
import { isValidVisitorId, touchHeartbeat } from '@/lib/analytics';
import { rateLimit, siteTotals } from '@/lib/analytics-cache';
export const POST = endpoint(async (req: Request) => {
  await rateLimit(req, 'heartbeat');
  const data = await body(req);
  if (typeof data.visitorId !== 'string' || !isValidVisitorId(data.visitorId))
    throw new ApiError(400, 'INVALID_VISITOR');
  const [online, totals] = await Promise.all([touchHeartbeat(data.visitorId), siteTotals()]);
  return json({ ...totals, online });
});
