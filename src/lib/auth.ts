import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { authenticator } from "otplib";

const SESSION_COOKIE_NAME = "fighters_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || "fallback-secret-at-least-32-chars-long-fighters-draw";
  return new TextEncoder().encode(secret);
}

export interface AdminSessionPayload {
  adminId: string;
  email: string;
  name: string;
}

/**
 * Verify TOTP code against the base32 secret.
 * Allows a +/- 1 step window (30 seconds margin) to tolerate slight clock drift.
 */
export function verifyTotpToken(code: string, secret: string): boolean {
  try {
    authenticator.options = { window: 1 };
    return authenticator.check(code, secret);
  } catch (error) {
    console.error("TOTP verification error:", error);
    return false;
  }
}

/**
 * Generate a new TOTP secret (base32) and OTP Auth URI for QR code.
 */
export function generateTotpSetup(email: string, appName: string = "Fighters Token Spin") {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(email, appName, secret);
  return { secret, otpauth };
}

/**
 * Create a signed JWT session token.
 */
export async function createSessionToken(payload: AdminSessionPayload): Promise<string> {
  const key = getSecretKey();
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(key);
}

/**
 * Verify and decode the JWT session token.
 */
export async function verifySessionToken(token: string): Promise<AdminSessionPayload | null> {
  try {
    const key = getSecretKey();
    const { payload } = await jwtVerify(token, key);
    if (!payload.adminId || !payload.email) {
      return null;
    }
    return {
      adminId: payload.adminId as string,
      email: payload.email as string,
      name: (payload.name as string) || "Admin",
    };
  } catch {
    return null;
  }
}

/**
 * Read and verify session from cookies in Server Components or API Routes.
 */
export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }
    return await verifySessionToken(sessionCookie.value);
  } catch {
    return null;
  }
}

/**
 * Set the session cookie on a response.
 */
export function getSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    maxAge: SESSION_MAX_AGE_SECONDS,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}
