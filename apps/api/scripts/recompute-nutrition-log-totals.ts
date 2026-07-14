// One-off: recalcula nutrition_logs.total* multiplicando carbsG/sodiumMg/caffeineMg/kcal
// (valores POR UNIDADE) pela quantity de cada item — bug corrigido em nutrition.service.ts
// que somava os valores brutos sem multiplicar pela quantidade consumida.
//
// Dry-run por padrao (so mostra o diff). Passe --apply para gravar.
import { db } from '../src/lib/db.js';
import * as schema from '../drizzle/schema.js';
import { eq } from 'drizzle-orm';

const apply = process.argv.includes('--apply');

async function main() {
  const logs = await db.query.nutritionLogs.findMany({ with: { items: true } });

  let changed = 0;
  for (const log of logs) {
    let totalCarbsG = 0, totalSodiumMg = 0, totalCaffeineMg = 0, totalKcal = 0;
    for (const item of log.items) {
      const qty = Number(item.quantity ?? 1);
      totalCarbsG += Number(item.carbsG ?? 0) * qty;
      totalSodiumMg += Number(item.sodiumMg ?? 0) * qty;
      totalCaffeineMg += Number(item.caffeineMg ?? 0) * qty;
      totalKcal += Number(item.kcal ?? 0) * qty;
    }

    const before = {
      carbsG: Number(log.totalCarbsG ?? 0),
      sodiumMg: Number(log.totalSodiumMg ?? 0),
      caffeineMg: Number(log.totalCaffeineMg ?? 0),
      kcal: Number(log.totalKcal ?? 0),
    };
    const after = {
      carbsG: Math.round(totalCarbsG * 100) / 100,
      sodiumMg: Math.round(totalSodiumMg * 100) / 100,
      caffeineMg: Math.round(totalCaffeineMg * 100) / 100,
      kcal: Math.round(totalKcal),
    };

    const isDifferent =
      before.carbsG !== after.carbsG ||
      before.sodiumMg !== after.sodiumMg ||
      before.caffeineMg !== after.caffeineMg ||
      before.kcal !== after.kcal;

    if (isDifferent) {
      changed++;
      console.log(`log ${log.id} (activity ${log.activityId}): carb ${before.carbsG}g -> ${after.carbsG}g, sodio ${before.sodiumMg}mg -> ${after.sodiumMg}mg, caf ${before.caffeineMg}mg -> ${after.caffeineMg}mg, kcal ${before.kcal} -> ${after.kcal}`);

      if (apply) {
        await db.update(schema.nutritionLogs).set({
          totalCarbsG: after.carbsG.toFixed(2),
          totalSodiumMg: after.sodiumMg.toFixed(2),
          totalCaffeineMg: after.caffeineMg.toFixed(2),
          totalKcal: after.kcal,
          updatedAt: new Date(),
        }).where(eq(schema.nutritionLogs.id, log.id));
      }
    }
  }

  console.log(`\n${changed}/${logs.length} logs com totais divergentes.${apply ? ' Gravado.' : ' Dry-run (rode com --apply para gravar).'}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
