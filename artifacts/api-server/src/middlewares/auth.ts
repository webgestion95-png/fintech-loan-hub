import { type Request, type Response, type NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      currentUser?: User;
    }
  }
}

const ADMIN_EMAILS = (process.env["ADMIN_EMAILS"] ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function computeRole(email: string, publicMetadata: unknown): "ADMIN" | "USER" {
  const metaRole = (publicMetadata as { role?: string } | undefined)?.role;
  if (ADMIN_EMAILS.includes(email.toLowerCase())) return "ADMIN";
  if (metaRole === "ADMIN") return "ADMIN";
  return "USER";
}

export async function ensureUser(clerkUserId: string): Promise<User> {
  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    "";
  const fullName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
  const expectedRole = computeRole(email, clerkUser.publicMetadata);

  const existing = (
    await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, clerkUserId))
  )[0];

  if (existing) {
    if (
      existing.role !== expectedRole ||
      existing.email !== email ||
      existing.fullName !== fullName
    ) {
      const [updated] = await db
        .update(usersTable)
        .set({ role: expectedRole, email, fullName })
        .where(eq(usersTable.clerkUserId, clerkUserId))
        .returning();
      return updated!;
    }
    return existing;
  }

  const [created] = await db
    .insert(usersTable)
    .values({
      clerkUserId,
      email,
      fullName,
      role: expectedRole,
    })
    .returning();
  return created!;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const user = await ensureUser(clerkUserId);
    req.currentUser = user;
    next();
  } catch (err) {
    req.log.error({ err }, "Failed to ensure user");
    res.status(500).json({ error: "Failed to load user" });
  }
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await requireAuth(req, res, () => {
    if (req.currentUser?.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  });
}
