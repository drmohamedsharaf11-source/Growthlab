import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const [products, creatives, adAccounts] = await Promise.all([
    prisma.product.count(),
    prisma.creative.count(),
    prisma.adAccount.count(),
  ]);
  console.log({ products, creatives, adAccounts });
}
main().catch(console.error).finally(() => prisma.$disconnect());
