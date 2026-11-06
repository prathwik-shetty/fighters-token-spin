import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Fighters Token Spin database seed...");

  const demoEmail = process.env.DEMO_ADMIN_EMAIL || "gamingnig308@gmail.com";
  const demoPassword = process.env.DEMO_ADMIN_PASSWORD || "shettybrand";
  const demoTotpSecret = process.env.DEMO_ADMIN_TOTP_SECRET || "JBSWY3DPEHPK3PXP";

  const passwordHash = await bcrypt.hash(demoPassword, 10);

  const admin = await prisma.admin.upsert({
    where: { email: demoEmail },
    update: {
      passwordHash,
      totpSecret: demoTotpSecret,
      totpEnabled: true,
      name: "Fighters Admin",
    },
    create: {
      email: demoEmail,
      name: "Fighters Admin",
      passwordHash,
      totpSecret: demoTotpSecret,
      totpEnabled: true,
    },
  });

  console.log(`✅ Demo Admin created / updated:`);
  console.log(`   Email:        ${admin.email}`);
  console.log(`   Password:     ${demoPassword}`);
  console.log(`   TOTP Secret:  ${demoTotpSecret}`);
  console.log(`   (You can add '${demoTotpSecret}' to Google Authenticator / Authy or enter it during login)`);

  // Create an initial sample round if none exists
  const existingRound = await prisma.round.findFirst({
    where: { name: "Token Draw Round 1" },
  });

  if (!existingRound) {
    const round = await prisma.round.create({
      data: {
        name: "Token Draw Round 1",
        rangeStart: 1,
        rangeEnd: 80,
        winnersCount: 1,
        isTestRound: false,
        status: "WAITING",
        createdByAdminId: admin.id,
        exclusions: {
          create: [{ number: 7 }, { number: 13 }, { number: 42 }],
        },
      },
    });

    console.log(`✅ Sample Round created:`);
    console.log(`   ID:           ${round.id}`);
    console.log(`   Name:         ${round.name}`);
    console.log(`   Range:        ${round.rangeStart} - ${round.rangeEnd}`);
    console.log(`   Excluded:     7, 13, 42`);
  }

  // Create an initial Audit Log
  await prisma.auditLog.create({
    data: {
      adminId: admin.id,
      adminEmail: admin.email,
      action: "DATABASE_SEEDED",
      detailsJson: JSON.stringify({ message: "Initial database seed executed successfully" }),
    },
  });

  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
