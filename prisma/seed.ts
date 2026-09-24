import "dotenv/config";
import { PrismaClient, City, ListingType, PropertyType } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcrypt";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 10;

// Real, working Unsplash photo URLs (real-estate / interior / exterior photography)
const PHOTO_POOL = [
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c",
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994",
  "https://images.unsplash.com/photo-1598928506311-c55ded91a20c",
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688",
  "https://images.unsplash.com/photo-1523217582562-09d0def993a6",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858",
  "https://images.unsplash.com/photo-1560184897-ae75f418493e",
  "https://images.unsplash.com/photo-1560185127-6ed189bf02f4",
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be",
  "https://images.unsplash.com/photo-1505843513577-22bb7d21e455",
  "https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e",
  "https://images.unsplash.com/photo-1494526585095-c41746248156",
  "https://images.unsplash.com/photo-1556909212-d5b604d0c90d",
  "https://images.unsplash.com/photo-1571939228382-b2f2b585ce15",
  "https://images.unsplash.com/photo-1572120360610-d971b9d7767c",
  "https://images.unsplash.com/photo-1554995207-c18c203602cb",
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36",
  "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd",
];

function photoUrl(seedIndex: number, w = 1200, h = 800) {
  const base = PHOTO_POOL[seedIndex % PHOTO_POOL.length];
  return `${base}?auto=format&fit=crop&w=${w}&q=80`;
}

function pick<T>(arr: T[], idx: number): T {
  return arr[idx % arr.length];
}

const TOWNSHIPS: Record<City, string[]> = {
  YANGON: ["Bahan", "Sanchaung", "Kamayut", "Hlaing", "Mayangone", "Dagon"],
  MANDALAY: ["Chan Aye Thar San", "Aung Myay Thar Zan", "Mahar Aung Myay", "Chan Mya Tharsi"],
  BAGO: ["Bago Township", "Pyay Road Area", "Oakpho"],
};

const USERS = [
  { name: "Aung Kyaw", email: "aung.kyaw@example.com", phone: "+959111111111" },
  { name: "Su Su Hlaing", email: "susu.hlaing@example.com", phone: "+959222222222" },
  { name: "Min Thu", email: "min.thu@example.com", phone: "+959333333333" },
  { name: "Ei Ei Phyo", email: "eiei.phyo@example.com", phone: "+959444444444" },
  { name: "Zaw Win", email: "zaw.win@example.com", phone: "+959555555555" },
];

const DEFAULT_PASSWORD = "password123";
const DEMO_PASSWORD = "DemoPass123!";

const DEMO_OWNER = {
  name: "Demo Owner",
  email: "demo.owner@example.com",
  phone: "+959666666666",
};

const DEMO_ADMIN = {
  name: "Demo Admin",
  email: "demo.admin@example.com",
  phone: "+959777777777",
};

const DEMO_OWNER_LISTINGS: ListingSeed[] = [
  {
    title: "Demo Owner's 2BR Condo in Bahan",
    description:
      "Sample listing owned by the demo account, used to showcase the 'My Listings' page. Bright condo unit with balcony and secure parking.",
    listingType: "RENT",
    propertyType: "CONDO",
    city: "YANGON",
    priceMmk: 850000,
    bedrooms: 2,
    bathrooms: 2,
    areaSqft: 1050,
  },
  {
    title: "Demo Owner's House for Sale, Mandalay",
    description:
      "Sample listing owned by the demo account. Spacious single-story house with a fenced yard, close to the city center.",
    listingType: "SALE",
    propertyType: "HOUSE",
    city: "MANDALAY",
    priceMmk: 420000000,
    bedrooms: 3,
    bathrooms: 2,
    areaSqft: 1900,
  },
  {
    title: "Demo Owner's Land Plot, Bago",
    description:
      "Sample listing owned by the demo account. Flat, road-facing land plot suitable for residential development.",
    listingType: "SALE",
    propertyType: "LAND",
    city: "BAGO",
    priceMmk: 110000000,
    areaSqft: 3500,
  },
];

type ListingSeed = {
  title: string;
  description: string;
  listingType: ListingType;
  propertyType: PropertyType;
  city: City;
  priceMmk: number;
  bedrooms?: number;
  bathrooms?: number;
  areaSqft?: number;
};

const LISTING_TEMPLATES: ListingSeed[] = [
  {
    title: "Modern 2BR Condo near Junction City",
    description:
      "Bright and spacious 2-bedroom condo unit with city views, modern kitchen, and 24-hour security. Walking distance to shopping and restaurants.",
    listingType: "RENT",
    propertyType: "CONDO",
    city: "YANGON",
    priceMmk: 900000,
    bedrooms: 2,
    bathrooms: 2,
    areaSqft: 1100,
  },
  {
    title: "Cozy 1BR Apartment in Sanchaung",
    description:
      "Compact and affordable apartment, recently renovated, close to public transport and local markets. Great for young professionals.",
    listingType: "RENT",
    propertyType: "APARTMENT",
    city: "YANGON",
    priceMmk: 350000,
    bedrooms: 1,
    bathrooms: 1,
    areaSqft: 600,
  },
  {
    title: "Spacious Family House with Garden, Bahan",
    description:
      "Two-story house with a private garden, 4 bedrooms, and a garage. Quiet residential neighborhood close to international schools.",
    listingType: "SALE",
    propertyType: "HOUSE",
    city: "YANGON",
    priceMmk: 1850000000,
    bedrooms: 4,
    bathrooms: 3,
    areaSqft: 3200,
  },
  {
    title: "Prime Commercial Land Plot, Hlaing",
    description:
      "Rectangular land plot suitable for commercial development, fronting a main road with excellent visibility and access.",
    listingType: "SALE",
    propertyType: "LAND",
    city: "YANGON",
    priceMmk: 2400000000,
    areaSqft: 5000,
  },
  {
    title: "Luxury 3BR Condo with River View",
    description:
      "High-floor luxury condo with panoramic river views, premium finishes, swimming pool, and gym access in the building.",
    listingType: "SALE",
    propertyType: "CONDO",
    city: "YANGON",
    priceMmk: 980000000,
    bedrooms: 3,
    bathrooms: 3,
    areaSqft: 1800,
  },
  {
    title: "Budget Studio Apartment, Mayangone",
    description:
      "Small and efficient studio apartment, ideal for a single tenant or student. Includes basic furniture and appliances.",
    listingType: "RENT",
    propertyType: "APARTMENT",
    city: "YANGON",
    priceMmk: 220000,
    bedrooms: 1,
    bathrooms: 1,
    areaSqft: 400,
  },
  {
    title: "Charming Townhouse in Dagon",
    description:
      "Three-bedroom townhouse with a small courtyard, recently painted, close to schools and the local market.",
    listingType: "SALE",
    propertyType: "HOUSE",
    city: "YANGON",
    priceMmk: 1200000000,
    bedrooms: 3,
    bathrooms: 2,
    areaSqft: 2100,
  },
  {
    title: "Traditional House near Mandalay Palace",
    description:
      "Well-maintained traditional-style house near the Mandalay Palace moat, with a spacious compound and mature trees.",
    listingType: "SALE",
    propertyType: "HOUSE",
    city: "MANDALAY",
    priceMmk: 650000000,
    bedrooms: 3,
    bathrooms: 2,
    areaSqft: 2600,
  },
  {
    title: "Modern Apartment in Chan Aye Thar San",
    description:
      "Newly built apartment with modern amenities, elevator access, and secure parking. Close to the city center.",
    listingType: "RENT",
    propertyType: "APARTMENT",
    city: "MANDALAY",
    priceMmk: 300000,
    bedrooms: 2,
    bathrooms: 1,
    areaSqft: 850,
  },
  {
    title: "Riverside Land Plot, Mandalay",
    description:
      "Scenic land plot near the Irrawaddy riverside, suitable for a private residence or guesthouse development.",
    listingType: "SALE",
    propertyType: "LAND",
    city: "MANDALAY",
    priceMmk: 480000000,
    areaSqft: 4200,
  },
  {
    title: "Affordable Condo Unit, Aung Myay Thar Zan",
    description:
      "Well-priced condo unit with a functional layout, ideal for first-time buyers or small families.",
    listingType: "SALE",
    propertyType: "CONDO",
    city: "MANDALAY",
    priceMmk: 320000000,
    bedrooms: 2,
    bathrooms: 1,
    areaSqft: 950,
  },
  {
    title: "Spacious Rental House, Mahar Aung Myay",
    description:
      "Large single-story house with a fenced compound, great for families with children and pets.",
    listingType: "RENT",
    propertyType: "HOUSE",
    city: "MANDALAY",
    priceMmk: 500000,
    bedrooms: 3,
    bathrooms: 2,
    areaSqft: 2000,
  },
  {
    title: "Quiet Apartment near Bago Train Station",
    description:
      "Convenient apartment close to the Bago train station and central market, ideal for commuters.",
    listingType: "RENT",
    propertyType: "APARTMENT",
    city: "BAGO",
    priceMmk: 180000,
    bedrooms: 1,
    bathrooms: 1,
    areaSqft: 550,
  },
  {
    title: "Family House with Orchard, Bago",
    description:
      "Rural family house set on a generous plot with a small fruit orchard, peaceful surroundings.",
    listingType: "SALE",
    propertyType: "HOUSE",
    city: "BAGO",
    priceMmk: 320000000,
    bedrooms: 4,
    bathrooms: 2,
    areaSqft: 3000,
  },
  {
    title: "Agricultural Land Plot near Bago",
    description:
      "Flat agricultural land plot with road access, suitable for farming or future development.",
    listingType: "SALE",
    propertyType: "LAND",
    city: "BAGO",
    priceMmk: 150000000,
    areaSqft: 8000,
  },
  {
    title: "New Condo Development, Bago",
    description:
      "Unit in a newly completed condo building with parking, security, and shared green space.",
    listingType: "SALE",
    propertyType: "CONDO",
    city: "BAGO",
    priceMmk: 210000000,
    bedrooms: 2,
    bathrooms: 1,
    areaSqft: 900,
  },
  {
    title: "Renovated 2BR Apartment, Kamayut",
    description:
      "Fully renovated apartment with new fittings, close to universities and local dining options.",
    listingType: "RENT",
    propertyType: "APARTMENT",
    city: "YANGON",
    priceMmk: 420000,
    bedrooms: 2,
    bathrooms: 1,
    areaSqft: 750,
  },
  {
    title: "Executive Condo with Pool Access",
    description:
      "Upscale condo unit in a well-managed building with a rooftop pool, gym, and 24/7 concierge service.",
    listingType: "RENT",
    propertyType: "CONDO",
    city: "YANGON",
    priceMmk: 1500000,
    bedrooms: 3,
    bathrooms: 2,
    areaSqft: 1600,
  },
  {
    title: "Compact House for Sale, Chan Mya Tharsi",
    description:
      "Compact and easy-to-maintain house, good starter home close to local schools and clinics.",
    listingType: "SALE",
    propertyType: "HOUSE",
    city: "MANDALAY",
    priceMmk: 280000000,
    bedrooms: 2,
    bathrooms: 1,
    areaSqft: 1400,
  },
  {
    title: "Corner Land Plot, Pyay Road Area, Bago",
    description:
      "Corner land plot with dual road frontage, good potential for a shophouse or small business.",
    listingType: "SALE",
    propertyType: "LAND",
    city: "BAGO",
    priceMmk: 95000000,
    areaSqft: 3000,
  },
];

async function main() {
  console.log("Seeding database...");

  // --- Users ---
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  const createdUsers = [];
  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        phone: u.phone,
        passwordHash,
      },
    });
    createdUsers.push(user);
  }
  console.log(`Created/verified ${createdUsers.length} users (password for all: "${DEFAULT_PASSWORD}")`);

  // --- Fixed-credential demo accounts (for manual testing of each role) ---
  const demoPasswordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

  const demoOwner = await prisma.user.upsert({
    where: { email: DEMO_OWNER.email },
    update: { name: DEMO_OWNER.name, phone: DEMO_OWNER.phone, passwordHash: demoPasswordHash, role: "USER" },
    create: {
      name: DEMO_OWNER.name,
      email: DEMO_OWNER.email,
      phone: DEMO_OWNER.phone,
      passwordHash: demoPasswordHash,
      role: "USER",
    },
  });

  const demoAdmin = await prisma.user.upsert({
    where: { email: DEMO_ADMIN.email },
    update: { name: DEMO_ADMIN.name, phone: DEMO_ADMIN.phone, passwordHash: demoPasswordHash, role: "ADMIN" },
    create: {
      name: DEMO_ADMIN.name,
      email: DEMO_ADMIN.email,
      phone: DEMO_ADMIN.phone,
      passwordHash: demoPasswordHash,
      role: "ADMIN",
    },
  });

  console.log(
    `Created/verified demo accounts: ${demoOwner.email} (USER), ${demoAdmin.email} (ADMIN) — password: "${DEMO_PASSWORD}"`
  );

  // --- Clear existing listings/photos so seeding is idempotent ---
  await prisma.listingPhoto.deleteMany({});
  await prisma.listing.deleteMany({});

  // --- Listings + Photos ---
  let photoSeedIndex = 0;
  for (let i = 0; i < LISTING_TEMPLATES.length; i++) {
    const template = LISTING_TEMPLATES[i];
    const owner = createdUsers[i % createdUsers.length];
    const townshipList = TOWNSHIPS[template.city];
    const township = pick(townshipList, i);

    const listing = await prisma.listing.create({
      data: {
        userId: owner.id,
        title: template.title,
        description: template.description,
        listingType: template.listingType,
        propertyType: template.propertyType,
        city: template.city,
        township,
        address: `${township}, ${template.city.charAt(0)}${template.city.slice(1).toLowerCase()}`,
        priceMmk: template.priceMmk,
        bedrooms: template.bedrooms,
        bathrooms: template.bathrooms,
        areaSqft: template.areaSqft,
        status: "ACTIVE",
      },
    });

    const photoCount = 3 + (i % 3); // 3, 4, or 5 photos
    for (let p = 0; p < photoCount; p++) {
      await prisma.listingPhoto.create({
        data: {
          listingId: listing.id,
          url: photoUrl(photoSeedIndex),
          sortOrder: p,
        },
      });
      photoSeedIndex++;
    }
  }

  console.log(`Created ${LISTING_TEMPLATES.length} listings with photos.`);

  // --- Demo owner's own listings (so "My Listings" has content when testing as this user) ---
  for (let i = 0; i < DEMO_OWNER_LISTINGS.length; i++) {
    const template = DEMO_OWNER_LISTINGS[i];
    const townshipList = TOWNSHIPS[template.city];
    const township = pick(townshipList, i);

    const listing = await prisma.listing.create({
      data: {
        userId: demoOwner.id,
        title: template.title,
        description: template.description,
        listingType: template.listingType,
        propertyType: template.propertyType,
        city: template.city,
        township,
        address: `${township}, ${template.city.charAt(0)}${template.city.slice(1).toLowerCase()}`,
        priceMmk: template.priceMmk,
        bedrooms: template.bedrooms,
        bathrooms: template.bathrooms,
        areaSqft: template.areaSqft,
        status: "ACTIVE",
      },
    });

    const photoCount = 3 + (i % 3); // 3, 4, or 5 photos
    for (let p = 0; p < photoCount; p++) {
      await prisma.listingPhoto.create({
        data: {
          listingId: listing.id,
          url: photoUrl(photoSeedIndex),
          sortOrder: p,
        },
      });
      photoSeedIndex++;
    }
  }

  console.log(`Created ${DEMO_OWNER_LISTINGS.length} listings for ${demoOwner.email}.`);
  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
