/**
 * Seeds sections and version 1 of every question from the locked Arabic source.
 *
 *     npx tsx scripts/seed-questions.ts
 *
 * Idempotent and non-destructive: it does nothing at all once any question row
 * exists, so it can never overwrite an admin's edits. The app calls the same
 * function on first request, so this script is only needed for a scripted
 * provisioning step that wants the rows in place before any traffic.
 */

import { prisma } from "../src/lib/db.js";
import { seedFromLockedSource } from "../src/lib/questions.js";

async function main() {
  const result = await seedFromLockedSource();

  if (!result.seeded) {
    const live = await prisma.question.count({ where: { status: "live" } });
    console.log(`Nothing to do — questions already exist (${live} live).`);
    return;
  }

  console.log(
    `Seeded ${result.sections} sections and ${result.questions} questions (version 1).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
