import { Router } from "express";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { updateListingSchema, listingQuerySchema } from "../schemas/listing.schema";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const router = Router();

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

const OWNER_SELECT = { id: true, name: true, email: true } as const;

const adminListingQuerySchema = listingQuerySchema.extend({
  status: z.preprocess(
    (val) => (typeof val === "string" ? val.toUpperCase() : val),
    z.enum(["ACTIVE", "INACTIVE"])
  ).optional(),
});

// ---------- GET /admin/listings ----------
router.get("/listings", requireAuth, requireAdmin, async (req, res) => {
  const parsed = adminListingQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params", details: parsed.error.flatten() });
  }

  const { city, listing_type, property_type, min_price, max_price, bedrooms, q, sort, page, limit, status } =
    parsed.data;

  const where: Prisma.ListingWhereInput = {};

  if (status) where.status = status;
  if (city) where.city = city;
  if (listing_type) where.listingType = listing_type;
  if (property_type) where.propertyType = property_type;
  if (bedrooms !== undefined) where.bedrooms = { gte: bedrooms };

  if (min_price !== undefined || max_price !== undefined) {
    where.priceMmk = {};
    if (min_price !== undefined) where.priceMmk.gte = min_price;
    if (max_price !== undefined) where.priceMmk.lte = max_price;
  }

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
    ];
  }

  let orderBy: Prisma.ListingOrderByWithRelationInput = { createdAt: "desc" };
  if (sort === "price_asc") orderBy = { priceMmk: "asc" };
  if (sort === "price_desc") orderBy = { priceMmk: "desc" };

  const skip = (page - 1) * limit;

  const [total, listings] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: { photos: true, user: { select: OWNER_SELECT } },
    }),
  ]);

  return res.json({
    data: listings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

// ---------- PUT /admin/listings/:id ----------
router.put("/listings/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid listing id" });
  }

  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: "Listing not found" });
  }

  const parsed = updateListingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  const listing = await prisma.listing.update({
    where: { id },
    data: parsed.data,
    include: { photos: true, user: { select: OWNER_SELECT } },
  });

  return res.json(listing);
});

// ---------- DELETE /admin/listings/:id ----------
router.delete("/listings/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid listing id" });
  }

  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: "Listing not found" });
  }

  const photos = await prisma.listingPhoto.findMany({ where: { listingId: id } });

  await prisma.listingPhoto.deleteMany({ where: { listingId: id } });
  await prisma.listing.delete({ where: { id } });

  // Best-effort local file cleanup (only for locally-uploaded photos)
  for (const photo of photos) {
    if (photo.url.startsWith("/uploads/")) {
      const filePath = path.join(UPLOADS_DIR, path.basename(photo.url));
      fs.unlink(filePath, () => {
        /* ignore errors (file may not exist, e.g. seeded remote URLs) */
      });
    }
  }

  return res.status(204).send();
});

// ---------- GET /admin/users ----------
router.get("/users", requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      _count: { select: { listings: true } },
    },
  });

  const data = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    createdAt: u.createdAt,
    listingCount: u._count.listings,
  }));

  return res.json(data);
});

export default router;
