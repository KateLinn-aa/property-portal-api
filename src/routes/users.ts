import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/me/listings", requireAuth, async (req, res) => {
  const listings = await prisma.listing.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
    include: { photos: true },
  });

  return res.json(listings);
});

export default router;
