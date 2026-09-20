import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const stations = [
  { code: 'VS-01', name: '43" + Steering', rate: 200, tag: 'RACING', description: 'Wheel-ready setup for racing & simulator sessions.' },
  { code: 'VS-02', name: '55" Gaming Station', rate: 150, tag: 'MULTIPLAYER', description: 'Immersive big-screen PS5 setup for competitive play.' },
  { code: 'VS-03', name: '75" Giant Screen', rate: 200, tag: 'PREMIUM', description: 'The ultimate screen for football, WWE and squad battles.' }
];

for (const station of stations) {
  await prisma.station.upsert({ where: { code: station.code }, update: station, create: station });
}

console.log('VS Gaming Arena stations seeded.');
await prisma.$disconnect();
