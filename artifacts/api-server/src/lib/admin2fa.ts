import { createHmac, timingSafeEqual } from "node:crypto";
import { TOTP, generateSecret, generateURI } from "otplib";
import qrcode from "qrcode";
import type { Request, Response } from "express";

const TOTP_OPTIONS = { window: 1, step: 30 };

const COOKIE_NAME = "lf_admin_mfa";
const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8h
const ISSUER = "LoanFlow Admin";

function getSecret(): string {
  const s = process.env["SESSION_SECRET"];
  if (!s) throw new Error("SESSION_SECRET is required for admin 2FA");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function safeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export function generateNewSecret(email: string): { secret: string; otpauth: string } {
  const secret = generateSecret(20);
  const otpauth = generateURI({
    accountName: email,
    issuer: ISSUER,
    secret,
    type: "totp",
  });
  return { secret, otpauth };
}

export async function buildQrDataUrl(otpauth: string): Promise<string> {
  return qrcode.toDataURL(otpauth, { errorCorrectionLevel: "M", margin: 1, width: 240 });
}

export function verifyTotp(secret: string, token: string): boolean {
  const clean = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  try {
    return TOTP.verify({ token: clean, secret, options: TOTP_OPTIONS });
  } catch {
    return false;
  }
}

export function setMfaCookie(res: Response, userId: string): void {
  const exp = Date.now() + COOKIE_MAX_AGE_MS;
  const payload = `${userId}.${exp}`;
  const sig = sign(payload);
  const value = `${payload}.${sig}`;
  res.cookie(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    maxAge: COOKIE_MAX_AGE_MS,
    path: "/",
  });
}

export function clearMfaCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function readMfaCookie(req: Request): { userId: string; expires: number } | null {
  const raw = (req as Request & { cookies?: Record<string, string> }).cookies?.[COOKIE_NAME];
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [userId, expStr, sig] = parts as [string, string, string];
  const expectedSig = sign(`${userId}.${expStr}`);
  if (!safeEq(sig, expectedSig)) return null;
  const exp = Number(expStr);
  if (!exp || Number.isNaN(exp) || exp < Date.now()) return null;
  return { userId, expires: exp };
}

export function isAdminEmailRequiringMfa(email: string): boolean {
  const list = (process.env["ADMIN_EMAILS"] ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
