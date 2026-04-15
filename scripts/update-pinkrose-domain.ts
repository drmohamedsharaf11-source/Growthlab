import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const client = await prisma.client.updateMany({
    where: { name: { contains: "Pink", mode: "insensitive" } },
    data: { shopifyDomain: "pukkvw-90.myshopify.com" },
  });
  console.log("Updated", client.count, "client(s)");

  const result = await prisma.client.findFirst({
    where: { name: { contains: "Pink", mode: "insensitive" } },
    select: { id: true, name: true, shopifyDomain: true, shopifyToken: true },
  });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
