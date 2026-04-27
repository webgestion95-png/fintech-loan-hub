import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, adminTwoFactorTable } from "@workspace/db";
import { requireAdminPreMfa } from "../middlewares/auth";
import {
  generateNewSecret,
  buildQrDataUrl,
  verifyTotp,
  setMfaCookie,
  clearMfaCookie,
  readMfaCookie,
  isAdminEmailRequiringMfa,
} from "../lib/admin2fa";
import { logAdminAction } from "../lib/audit";

const router: IRouter = Router();

router.get("/admin/2fa/status", requireAdminPreMfa, async (req, res): Promise<void> => {
  const user = req.currentUser!;
  const required = isAdminEmailRequiringMfa(user.email);
  const setup = (
    await db.select().from(adminTwoFactorTable).where(eq(adminTwoFactorTable.userId, user.id))
  )[0];
  const cookie = readMfaCookie(req);
  res.json({
    required,
    enabled: !!setup?.enabledAt,
    verified: !!cookie && cookie.userId === user.id,
    expiresAt: cookie?.expires ? new Date(cookie.expires).toISOString() : null,
  });
});

router.post("/admin/2fa/setup", requireAdminPreMfa, async (req, res): Promise<void> => {
  const user = req.currentUser!;
  if (!isAdminEmailRequiringMfa(user.email)) {
    res.status(403).json({ error: "2FA non requis pour ce compte" });
    return;
  }
  const existing = (
    await db.select().from(adminTwoFactorTable).where(eq(adminTwoFactorTable.userId, user.id))
  )[0];
  if (existing?.enabledAt) {
    res.status(400).json({ error: "2FA déjà configuré. Réinitialisez-le pour repartir." });
    return;
  }
  const { secret, otpauth } = generateNewSecret(user.email);
  const qrCodeDataUrl = await buildQrDataUrl(otpauth);

  if (existing) {
    await db
      .update(adminTwoFactorTable)
      .set({ secret })
      .where(eq(adminTwoFactorTable.userId, user.id));
  } else {
    await db.insert(adminTwoFactorTable).values({ userId: user.id, secret });
  }
  await logAdminAction(req, { action: "2FA_SETUP_INITIATED" });
  res.json({ otpauth, qrCodeDataUrl, secret });
});

router.post("/admin/2fa/enable", requireAdminPreMfa, async (req, res): Promise<void> => {
  const user = req.currentUser!;
  const code = String((req.body as { code?: unknown })?.code ?? "");
  const setup = (
    await db.select().from(adminTwoFactorTable).where(eq(adminTwoFactorTable.userId, user.id))
  )[0];
  if (!setup) {
    res.status(400).json({ error: "Aucune configuration 2FA en attente" });
    return;
  }
  if (setup.enabledAt) {
    res.status(400).json({ error: "2FA déjà activé" });
    return;
  }
  if (!verifyTotp(setup.secret, code)) {
    await logAdminAction(req, { action: "2FA_ENABLE", success: false });
    res.status(400).json({ error: "Code invalide. Veuillez réessayer." });
    return;
  }
  const now = new Date();
  await db
    .update(adminTwoFactorTable)
    .set({ enabledAt: now, lastVerifiedAt: now })
    .where(eq(adminTwoFactorTable.userId, user.id));
  setMfaCookie(res, user.id);
  await logAdminAction(req, { action: "2FA_ENABLED" });
  res.json({ success: true });
});

router.post("/admin/2fa/verify", requireAdminPreMfa, async (req, res): Promise<void> => {
  const user = req.currentUser!;
  const code = String((req.body as { code?: unknown })?.code ?? "");
  const setup = (
    await db.select().from(adminTwoFactorTable).where(eq(adminTwoFactorTable.userId, user.id))
  )[0];
  if (!setup?.enabledAt) {
    res.status(400).json({ error: "2FA non configuré" });
    return;
  }
  if (!verifyTotp(setup.secret, code)) {
    await logAdminAction(req, { action: "2FA_VERIFY", success: false });
    res.status(400).json({ error: "Code invalide" });
    return;
  }
  const now = new Date();
  await db
    .update(adminTwoFactorTable)
    .set({ lastVerifiedAt: now })
    .where(eq(adminTwoFactorTable.userId, user.id));
  setMfaCookie(res, user.id);
  await logAdminAction(req, { action: "2FA_VERIFY" });
  res.json({ success: true });
});

router.post("/admin/2fa/logout", requireAdminPreMfa, async (req, res): Promise<void> => {
  clearMfaCookie(res);
  await logAdminAction(req, { action: "2FA_LOGOUT" });
  res.json({ success: true });
});

export default router;
