import 'dotenv/config';
import { PaymentStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const EPSILON = 0.05;

function money(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseArgs() {
  return {
    dryRun: process.argv.includes('--dry-run'),
  };
}

type UpdateRow = {
  id: number;
  from: PaymentStatus;
  to: PaymentStatus;
};

async function main() {
  const { dryRun } = parseArgs();

  const advances = await prisma.cashAdvance.findMany({
    where: { payments: { some: {} } },
    select: {
      id: true,
      totalPaid: true,
      payments: {
        select: {
          id: true,
          amountPaid: true,
          status: true,
          paymentDate: true,
        },
        orderBy: [{ paymentDate: 'asc' }, { id: 'asc' }],
      },
    },
  });

  const updates: UpdateRow[] = [];
  const nextStatusCounts: Record<PaymentStatus, number> = {
    PENDING: 0,
    APPROVED: 0,
    PAID: 0,
    PARTIAL: 0,
    CANCELLED: 0,
  };

  for (const advance of advances) {
    let remainingPaid = money(advance.totalPaid);

    for (const payment of advance.payments) {
      const amount = money(payment.amountPaid);
      let nextStatus: PaymentStatus;

      if (remainingPaid + EPSILON >= amount) {
        nextStatus = PaymentStatus.PAID;
        remainingPaid -= amount;
      } else if (remainingPaid > EPSILON) {
        nextStatus = PaymentStatus.PARTIAL;
        remainingPaid = 0;
      } else {
        nextStatus = PaymentStatus.PENDING;
      }

      nextStatusCounts[nextStatus] += 1;

      if (payment.status !== nextStatus) {
        updates.push({
          id: payment.id,
          from: payment.status,
          to: nextStatus,
        });
      }
    }
  }

  if (!dryRun) {
    for (const update of updates) {
      await prisma.cashAdvancePayment.update({
        where: { id: update.id },
        data: { status: update.to },
      });
    }
  }

  const byCurrentStatus = await prisma.cashAdvancePayment.groupBy({
    by: ['status'],
    _count: { _all: true },
  });

  console.log(
    JSON.stringify(
      {
        dryRun,
        epsilon: EPSILON,
        advancesChecked: advances.length,
        paymentsChecked: advances.reduce((sum, row) => sum + row.payments.length, 0),
        updatesPlanned: updates.length,
        nextStatusCounts,
        currentStatusCounts: byCurrentStatus.map((row) => ({
          status: row.status,
          count: row._count._all,
        })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
