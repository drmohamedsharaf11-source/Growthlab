import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "drmohamedsharaf@gmail.com";
const PLACEHOLDER_PASSWORD = "ChangeMe123!";

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existing) {
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { role: Role.ADMIN },
    });
    console.log(`✓ Updated existing user [${ADMIN_EMAIL}] → role: ADMIN`);
    console.log(`  Password was NOT changed.`);
  } else {
    const hashed = await bcrypt.hash(PLACEHOLDER_PASSWORD, 12);
    await prisma.user.create({
      data: {
        name: "Admin",
        email: ADMIN_EMAIL,
        password: hashed,
        role: Role.ADMIN,
      },
    });
    console.log(`✓ Created new admin user: ${ADMIN_EMAIL}`);
    console.log(`⚠️  Temporary password: ${PLACEHOLDER_PASSWORD}`);
    console.log(`   Change it immediately after first login.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
