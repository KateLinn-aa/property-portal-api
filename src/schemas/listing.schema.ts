import { z } from "zod";

export const listingTypeEnum = z.enum(["SALE", "RENT"]);
export const propertyTypeEnum = z.enum(["CONDO", "APARTMENT", "HOUSE", "LAND"]);
export const cityEnum = z.enum(["YANGON", "MANDALAY", "BAGO"]);
export const listingStatusEnum = z.enum(["ACTIVE", "INACTIVE"]);

// Case-insensitive helper: accepts "sale", "Sale", "SALE" etc, uppercases before validating.
function upper<T extends z.ZodTypeAny>(schema: T): z.ZodType<z.infer<T>> {
  return z.preprocess((val) => (typeof val === "string" ? val.toUpperCase() : val), schema) as z.ZodType<z.infer<T>>;
}

export const createListingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  listingType: upper(listingTypeEnum),
  propertyType: upper(propertyTypeEnum),
  city: upper(cityEnum),
  township: z.string().optional(),
  address: z.string().optional(),
  priceMmk: z.coerce.number().int().positive("priceMmk must be a positive integer"),
  bedrooms: z.coerce.number().int().nonnegative().optional(),
  bathrooms: z.coerce.number().int().nonnegative().optional(),
  areaSqft: z.coerce.number().int().positive().optional(),
  status: upper(listingStatusEnum).optional(),
});

export const updateListingSchema = createListingSchema.partial();

export const listingQuerySchema = z.object({
  city: upper(cityEnum).optional(),
  listing_type: upper(listingTypeEnum).optional(),
  property_type: upper(propertyTypeEnum).optional(),
  min_price: z.coerce.number().nonnegative().optional(),
  max_price: z.coerce.number().nonnegative().optional(),
  bedrooms: z.coerce.number().int().nonnegative().optional(),
  q: z.string().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).optional().default("newest"),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type ListingQueryInput = z.infer<typeof listingQuerySchema>;
