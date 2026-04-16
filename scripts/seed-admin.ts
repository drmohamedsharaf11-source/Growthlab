import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "drmohamedsharaf11@gmail.com";
const WRONG_EMAIL = "drmohamedsharaf@gmail.com";
const PLACEHOLDER_PASSWORD = "ChangeMe123!";

async function main() {
  // Clean up the incorrectly-seeded user (no clientId, wrong email)
  const wrong = await prisma.user.findUnique({ where: { email: WRONG_EMAIL } });
  if (wrong) {
    await prisma.user.delete({ where: { email: WRONG_EMAIL } });
    console.log(`✓ Deleted wrong admin user: ${WRONG_EMAIL}`);
  }

  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existing) {
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { role: Role.ADMIN, clientId: null },
    });
    console.log(`✓ Updated existing user [${ADMIN_EMAIL}] → role: ADMIN, clientId: null`);
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
