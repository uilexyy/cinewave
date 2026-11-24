import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);
  await prisma.user.upsert({
    where: { email: "demo@cinewave.app" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@cinewave.app",
      passwordHash,
    },
  });
  console.log("Seed complete: demo@cinewave.app / password123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
