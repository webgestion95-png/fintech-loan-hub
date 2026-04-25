import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const user = req.currentUser!;
  res.json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    walletBalance: Number(user.walletBalance),
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
