import { endpoint, json } from '@/lib/api';
import { getOnlineCount } from '@/lib/analytics';
import { siteTotals } from '@/lib/analytics-cache';
export const GET = endpoint(async () => {
  const [online, totals] = await Promise.all([getOnlineCount(), siteTotals()]);
  return json({ ...totals, online });
});
