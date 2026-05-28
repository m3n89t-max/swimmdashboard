import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const lanes = await prisma.lane.findMany({ where: { record: { not: null } } });
let fixed = 0;

for (const lane of lanes) {
  if (!lane.record) continue;
  const normalized = lane.record.replace(/^(\d{1,2}:\d{2}):(\d{2})$/, '$1.$2');
  if (normalized !== lane.record) {
    await prisma.lane.update({ where: { id: lane.id }, data: { record: normalized } });
    console.log(`${lane.record} → ${normalized}`);
    fixed++;
  }
}

console.log(`정규화 완료: ${fixed}건`);
await prisma.$disconnect();
