import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = "karant"; // your plain password
  const hashedPassword = await bcrypt.hash(password, 10); // 10 salt rounds

  const user = await prisma.user.upsert({
    where: { email: "s@gmail.com" },
    update: {},
    create: {
      email: "x@gmail.com",
      name: "karan",
      password: hashedPassword,
      role: "USER",
      image: null,
      emailVerified: new Date(),
    },
  });

  console.log("Seeded user:", user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
