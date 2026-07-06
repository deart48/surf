import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const marco = await prisma.chef.create({ data: { name: 'Марко' } });
  const olga = await prisma.chef.create({ data: { name: 'Ольга' } });

  const novice = await prisma.program.create({
    data: { name: 'Простая итальянская кухня', type: 'novice', durationMin: 180 },
  });
  const experienced = await prisma.program.create({
    data: { name: 'Французская выпечка', type: 'experienced', durationMin: 180 },
  });

  const now = new Date();
  const inDays = (days: number, hour: number): Date => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  await prisma.slot.createMany({
    data: [
      {
        programId: novice.id,
        chefId: marco.id,
        startAt: inDays(1, 18),
        totalSeats: 6,
        freeSeats: 4,
        freeRentalSets: 3,
        price: 3500,
        rentalPrice: 500,
        address: 'Санкт-Петербург, наб. Обводного канала, 74, лофт «Шеф-стол»',
        status: 'scheduled',
      },
      {
        programId: experienced.id,
        chefId: olga.id,
        startAt: inDays(2, 19),
        totalSeats: 6,
        freeSeats: 6,
        freeRentalSets: 0,
        price: 4500,
        rentalPrice: 600,
        address: 'Санкт-Петербург, наб. Обводного канала, 74, лофт «Шеф-стол»',
        status: 'scheduled',
      },
      {
        programId: novice.id,
        chefId: olga.id,
        startAt: inDays(5, 12),
        totalSeats: 6,
        freeSeats: 0,
        freeRentalSets: 0,
        price: 3500,
        rentalPrice: 500,
        address: 'Санкт-Петербург, наб. Обводного канала, 74, лофт «Шеф-стол»',
        status: 'scheduled',
      },
    ],
  });

  // eslint-disable-next-line no-console
  console.log('Seed complete: 2 chefs, 2 programs, 3 slots.');
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
