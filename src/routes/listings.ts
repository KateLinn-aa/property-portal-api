import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import {
  createListingSchema,
  updateListingSchema,
  listingQuerySchema,
} from "../schemas/listing.schema";
import type { Prisma } from "@prisma/client";

const router = Router();

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${ext}`);
  },
});

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image uploads (jpeg, png, webp, gif) are allowed"));
    }
  },
});

// ---------- GET /listings ----------
router.get("/", async (req, res) => {
  const parsed = listingQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params", details: parsed.error.flatten() });
  }

  const { city, listing_type, property_type, min_price, max_price, bedrooms, q, sort, page, limit } =
    parsed.data;

  const where: Prisma.ListingWhereInput = {
    status: "ACTIVE",
  };

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
      include: { photos: true },
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

// ---------- GET /listings/:id ----------
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid listing id" });
  }

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { sortOrder: "asc" } },
      user: { select: { id: true, name: true, phone: true, email: true } },
    },
  });

  if (!listing) {
    return res.status(404).json({ error: "Listing not found" });
  }

  return res.json(listing);
});

// ---------- POST /listings ----------
router.post("/", requireAuth, async (req, res) => {
  const parsed = createListingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  const data = parsed.data;

  const listing = await prisma.listing.create({
    data: {
      userId: req.userId!,
      title: data.title,
      description: data.description,
      listingType: data.listingType,
      propertyType: data.propertyType,
      city: data.city,
      township: data.township,
      address: data.address,
      priceMmk: data.priceMmk,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      areaSqft: data.areaSqft,
      status: data.status ?? "ACTIVE",
    },
    include: { photos: true },
  });

  return res.status(201).json(listing);
});

// ---------- PUT /listings/:id ----------
router.put("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid listing id" });
  }

  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: "Listing not found" });
  }
  if (existing.userId !== req.userId) {
    return res.status(403).json({ error: "You do not have permission to modify this listing" });
  }

  const parsed = updateListingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  const listing = await prisma.listing.update({
    where: { id },
    data: parsed.data,
    include: { photos: true },
  });

  return res.json(listing);
});

// ---------- DELETE /listings/:id ----------
router.delete("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid listing id" });
  }

  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: "Listing not found" });
  }
  if (existing.userId !== req.userId) {
    return res.status(403).json({ error: "You do not have permission to delete this listing" });
  }

  await prisma.listingPhoto.deleteMany({ where: { listingId: id } });
  await prisma.listing.delete({ where: { id } });

  return res.status(204).send();
});

// ---------- POST /listings/:id/photos ----------
router.post("/:id/photos", requireAuth, upload.array("photos", 10), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid listing id" });
  }

  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: "Listing not found" });
  }
  if (existing.userId !== req.userId) {
    return res.status(403).json({ error: "You do not have permission to modify this listing" });
  }

  const files = (req.files as Express.Multer.File[]) ?? [];
  if (files.length === 0) {
    return res.status(400).json({ error: "No files uploaded. Use multipart field name 'photos'." });
  }

  const existingCount = await prisma.listingPhoto.count({ where: { listingId: id } });

  const created = await prisma.$transaction(
    files.map((file, idx) =>
      prisma.listingPhoto.create({
        data: {
          listingId: id,
          url: `/uploads/${file.filename}`,
          sortOrder: existingCount + idx,
        },
      })
    )
  );

  return res.status(201).json(created);
});

// ---------- DELETE /listings/:id/photos/:photoId ----------
router.delete("/:id/photos/:photoId", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const photoId = Number(req.params.photoId);
  if (!Number.isInteger(id) || !Number.isInteger(photoId)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: "Listing not found" });
  }
  if (existing.userId !== req.userId) {
    return res.status(403).json({ error: "You do not have permission to modify this listing" });
  }

  const photo = await prisma.listingPhoto.findUnique({ where: { id: photoId } });
  if (!photo || photo.listingId !== id) {
    return res.status(404).json({ error: "Photo not found" });
  }

  await prisma.listingPhoto.delete({ where: { id: photoId } });

  // Best-effort local file cleanup (only for locally-uploaded photos)
  if (photo.url.startsWith("/uploads/")) {
    const filePath = path.join(UPLOADS_DIR, path.basename(photo.url));
    fs.unlink(filePath, () => {
      /* ignore errors (file may not exist, e.g. seeded remote URLs) */
    });
  }

  return res.status(204).send();
});

export default router;
