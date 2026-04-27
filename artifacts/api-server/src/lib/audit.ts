import type { Request } from "express";
import { db, adminAuditLogTable } from "@workspace/db";

export async function logAdminAction(
  req: Request,
  params: {
    action: string;
    success?: boolean;
    details?: string;
    userIdOverride?: string | null;
    emailOverride?: string | null;
  },
): Promise<void> {
  try {
    await db.insert(adminAuditLogTable).values({
      userId: params.userIdOverride ?? req.currentUser?.id ?? null,
      email: params.emailOverride ?? req.currentUser?.email ?? null,
      action: params.action,
      success: (params.success ?? true) ? "true" : "false",
      ipAddress:
        (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
        req.ip ??
        null,
      userAgent: req.headers["user-agent"] ?? null,
      details: params.details ?? null,
    });
  } catch (err) {
    req.log.warn({ err }, "Failed to write admin audit log");
  }
}
