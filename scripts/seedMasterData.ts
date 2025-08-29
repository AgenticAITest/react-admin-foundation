import { seedMasterData } from '../src/server/lib/db/seed/masterData';

async function main() {
  try {
    await seedMasterData();
    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

main();