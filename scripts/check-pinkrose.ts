import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      shopifyDomain: true,
      shopifyToken: true,
      metaAccountId: true,
      tiktokAccountId: true,
      status: true,
    },
  });
  console.log(JSON.stringify(clients, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
