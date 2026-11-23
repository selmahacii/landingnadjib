import crypto from "crypto";

const PAYLOAD_PREFIX = "admin_session";
const COOKIE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function signAdminCookie(): string {
  const secret = process.env.ADMIN_SECRET_KEY;
  if (!secret) {
    throw new Error("ADMIN_SECRET_KEY is not defined");
  }

  const expiry = Date.now() + COOKIE_DURATION_MS;
  const data = `${PAYLOAD_PREFIX}:${expiry}`;
  const hmac = crypto.createHmac("sha256", secret).update(data).digest("hex");
  return `${expiry}.${hmac}`;
}

export function verifyAdminCookie(cookie: string): boolean {
  if (!cookie) return false;
  const secret = process.env.ADMIN_SECRET_KEY;
  if (!secret) return false;

  const parts = cookie.split(".");
  if (parts.length !== 2) return false;

  const [expiryStr, signature] = parts;
  const expiry = Number(expiryStr);
  if (isNaN(expiry) || expiry <= Date.now()) {
    return false;
  }

  const data = `${PAYLOAD_PREFIX}:${expiry}`;
  const expectedHmac = crypto.createHmac("sha256", secret).update(data).digest("hex");

  if (signature.length !== expectedHmac.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedHmac, "hex"));
  } catch {
    return false;
  }
}

interface RateLimitRecord {
  count: number;
  windowStart: number;
}

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const rateLimitMap = new Map<string, RateLimitRecord>();

export function checkPinRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (record.count >= MAX_ATTEMPTS) {
    return false;
  }

  record.count += 1;
  return true;
}

export function _resetRateLimits(): void {
  rateLimitMap.clear();
}
