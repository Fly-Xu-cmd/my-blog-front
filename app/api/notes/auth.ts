import { headers } from "next/headers";
import crypto from "crypto";

export async function checkAuth(): Promise<boolean> {
  const headersList = await headers();
  const authHeader = headersList.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.substring(7);
  const expectedToken = process.env.SYNC_API_TOKEN || "";

  if (!token || !expectedToken) {
    return false;
  }

  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expectedToken);

  if (tokenBuffer.length !== expectedBuffer.length) {
    // 抵御时序攻击
    crypto.timingSafeEqual(expectedBuffer, expectedBuffer);
    return false;
  }

  return crypto.timingSafeEqual(tokenBuffer, expectedBuffer);
}
