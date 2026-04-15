import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Updating users and cleaning up demo data...\n");

  // 1. Update admin user
  const adminHash = await bcrypt.hash("sharaf12499", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@growthOS.com" },
    update: {
      name: "Mohamed Sharaf",
      email: "sharaf@growthlab.com",
      password: adminHash,
    },
    create: {
      name: "Mohamed Sharaf",
      email: "sharaf@growthlab.com",
      password: adminHash,
      role: Role.ADMIN,
    },
  });
  console.log("✅ Admin updated:", admin.email);

  // Also handle if email was already updated in a previous run
  const adminByNew = await prisma.user.findUnique({ where: { email: "sharaf@growthlab.com" } });
  if (adminByNew && adminByNew.id !== admin.id) {
    await prisma.user.update({
      where: { id: adminByNew.id },
      data: { name: "Mohamed Sharaf", password: adminHash },
    });
    console.log("✅ Admin (already migrated) updated:", adminByNew.email);
  }

  // 2. Update PinkRose client user
  const clientHash = await bcrypt.hash("pinkrose123456", 12);

  // Find existing client user by old email first, then new email
  const oldClientUser = await prisma.user.findUnique({ where: { email: "client@pinkrose.com" } });
  const newClientUser = await prisma.user.findUnique({ where: { email: "pinkroseeg@growthlab.com" } });

  if (oldClientUser) {
    const updated = await prisma.user.update({
      where: { id: oldClientUser.id },
      data: {
        email: "pinkroseeg@growthlab.com",
        password: clientHash,
      },
    });
    console.log("✅ PinkRose user updated:", updated.email, "| clientId:", updated.clientId);
  } else if (newClientUser) {
    const updated = await prisma.user.update({
      where: { id: newClientUser.id },
      data: { password: clientHash },
    });
    console.log("✅ PinkRose user (already migrated) password updated:", updated.email);
  } else {
    // Find the PinkRose client to link to
    const pinkRoseClient = await prisma.client.findFirst({ where: { name: "PinkRose Egypt" } });
    if (pinkRoseClient) {
      const created = await prisma.user.create({
        data: {
          name: "PinkRose Manager",
          email: "pinkroseeg@growthlab.com",
          password: clientHash,
          role: Role.CLIENT,
          clientId: pinkRoseClient.id,
        },
      });
      console.log("✅ PinkRose user created:", created.email);
    } else {
      console.log("⚠️  PinkRose client not found, skipping client user creation");
    }
  }

  // 3. Delete Demo client and all related data
  const demoClients = await prisma.client.findMany({
    where: {
      OR: [
        { name: { contains: "Demo", mode: "insensitive" } },
        { name: { contains: "demo", mode: "insensitive" } },
      ],
    },
    include: { adAccounts: true },
  });

  if (demoClients.length === 0) {
    console.log("ℹ️  No Demo client found (already deleted or never existed)");
  }

  for (const demoClient of demoClients) {
    console.log(`\nDeleting Demo client: "${demoClient.name}" (${demoClient.id})`);

    // Delete creatives
    for (const account of demoClient.adAccounts) {
      await prisma.creative.deleteMany({ where: { adAccountId: account.id } });
    }
    await prisma.adAccount.deleteMany({ where: { clientId: demoClient.id } });
    await prisma.alert.deleteMany({ where: { clientId: demoClient.id } });

    const products = await prisma.product.findMany({ where: { clientId: demoClient.id } });
    for (const product of products) {
      await prisma.variant.deleteMany({ where: { productId: product.id } });
    }
    await prisma.product.deleteMany({ where: { clientId: demoClient.id } });
    await prisma.user.updateMany({
      where: { clientId: demoClient.id },
      data: { clientId: null },
    });
    await prisma.client.delete({ where: { id: demoClient.id } });
    console.log(`✅ Demo client "${demoClient.name}" deleted`);
  }

  console.log("\n✅ All done!");
  console.log("   Admin:    sharaf@growthlab.com / sharaf12499");
  console.log("   PinkRose: pinkroseeg@growthlab.com / pinkrose123456");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
