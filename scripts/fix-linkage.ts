import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pinkRoseClient = await prisma.client.findFirst({
    where: { name: { contains: "Pink", mode: "insensitive" } },
  });

  if (!pinkRoseClient) {
    console.error("No PinkRose client found!");
    process.exit(1);
  }

  console.log("PinkRose client:", pinkRoseClient.id, pinkRoseClient.name);

  const updated = await prisma.user.update({
    where: { email: "pinkroseeg@growthlab.com" },
    data: { clientId: pinkRoseClient.id },
  });

  console.log("✅ Linked:", updated.email, "->", updated.clientId);

  const users = await prisma.user.findMany({
    select: { email: true, role: true, clientId: true },
  });
  console.log("\nFinal users:");
  users.forEach((u) => console.log(" ", u.email, u.role, u.clientId));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
