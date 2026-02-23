import { db } from '../src/lib/db.js';
import * as schema from '../drizzle/schema.js';

const products = [
  // ── Géis ──
  { name: 'GO Isotonic Energy Gel', brand: 'SiS', category: 'gel', servingSize: '1 sachet (60ml)', carbsG: '22.00', sodiumMg: '0.00', caffeineMg: '0.00', kcal: 87 },
  { name: 'GO Isotonic Energy Gel + Caffeine', brand: 'SiS', category: 'gel', servingSize: '1 sachet (60ml)', carbsG: '22.00', sodiumMg: '0.00', caffeineMg: '75.00', kcal: 87 },
  { name: 'Beta Fuel Gel', brand: 'SiS', category: 'gel', servingSize: '1 sachet (60ml)', carbsG: '40.00', sodiumMg: '0.00', caffeineMg: '0.00', kcal: 160 },
  { name: 'Beta Fuel Gel + Nootropics', brand: 'SiS', category: 'gel', servingSize: '1 sachet (60ml)', carbsG: '40.00', sodiumMg: '0.00', caffeineMg: '200.00', kcal: 160 },
  { name: 'Roctane Energy Gel', brand: 'GU', category: 'gel', servingSize: '1 sachet (32g)', carbsG: '21.00', sodiumMg: '125.00', caffeineMg: '35.00', kcal: 100 },
  { name: 'Energy Gel', brand: 'GU', category: 'gel', servingSize: '1 sachet (32g)', carbsG: '21.00', sodiumMg: '55.00', caffeineMg: '0.00', kcal: 100 },
  { name: 'Energy Gel Caffeine', brand: 'GU', category: 'gel', servingSize: '1 sachet (32g)', carbsG: '21.00', sodiumMg: '55.00', caffeineMg: '40.00', kcal: 100 },
  { name: 'Gel 100', brand: 'Maurten', category: 'gel', servingSize: '1 sachet (40g)', carbsG: '25.00', sodiumMg: '0.00', caffeineMg: '0.00', kcal: 100 },
  { name: 'Gel 100 Caf 100', brand: 'Maurten', category: 'gel', servingSize: '1 sachet (40g)', carbsG: '25.00', sodiumMg: '0.00', caffeineMg: '100.00', kcal: 100 },
  { name: 'Gel 160', brand: 'Maurten', category: 'gel', servingSize: '1 sachet (65g)', carbsG: '40.00', sodiumMg: '0.00', caffeineMg: '0.00', kcal: 160 },
  { name: 'PF 30 Gel', brand: 'Precision Fuel & Hydration', category: 'gel', servingSize: '1 sachet (51g)', carbsG: '30.00', sodiumMg: '250.00', caffeineMg: '0.00', kcal: 120 },
  { name: 'PF 30 Gel Caffeine', brand: 'Precision Fuel & Hydration', category: 'gel', servingSize: '1 sachet (51g)', carbsG: '30.00', sodiumMg: '250.00', caffeineMg: '100.00', kcal: 120 },
  { name: 'Endurance Fuel Gel', brand: 'Tailwind', category: 'gel', servingSize: '1 sachet (55g)', carbsG: '25.00', sodiumMg: '105.00', caffeineMg: '0.00', kcal: 100 },
  { name: 'Endurance Fuel Gel Caffeinated', brand: 'Tailwind', category: 'gel', servingSize: '1 sachet (55g)', carbsG: '25.00', sodiumMg: '105.00', caffeineMg: '35.00', kcal: 100 },
  { name: 'Energy Gel', brand: 'Hammer', category: 'gel', servingSize: '1 sachet (33g)', carbsG: '23.00', sodiumMg: '20.00', caffeineMg: '0.00', kcal: 90 },
  { name: 'Mag-on Energy Gel', brand: 'Mag-on', category: 'gel', servingSize: '1 sachet (41g)', carbsG: '25.00', sodiumMg: '50.00', caffeineMg: '25.00', kcal: 120 },
  { name: 'VO2 Energy Gel', brand: 'IntegralMedica', category: 'gel', servingSize: '1 sachet (30g)', carbsG: '20.00', sodiumMg: '46.00', caffeineMg: '0.00', kcal: 80 },
  { name: 'VO2 Energy Gel Caffeine', brand: 'IntegralMedica', category: 'gel', servingSize: '1 sachet (30g)', carbsG: '20.00', sodiumMg: '46.00', caffeineMg: '30.00', kcal: 80 },
  { name: 'Carbogel', brand: 'Probiotica', category: 'gel', servingSize: '1 sachet (33g)', carbsG: '25.00', sodiumMg: '40.00', caffeineMg: '0.00', kcal: 100 },
  { name: 'Energy Gel', brand: 'Exceed', category: 'gel', servingSize: '1 sachet (30g)', carbsG: '20.00', sodiumMg: '50.00', caffeineMg: '0.00', kcal: 84 },
  { name: 'Energy Gel Caffeine', brand: 'Exceed', category: 'gel', servingSize: '1 sachet (30g)', carbsG: '20.00', sodiumMg: '50.00', caffeineMg: '30.00', kcal: 84 },
  { name: 'Speed Gel', brand: 'Z2N', category: 'gel', servingSize: '1 sachet (30g)', carbsG: '22.00', sodiumMg: '30.00', caffeineMg: '0.00', kcal: 88 },

  // ── Isotônicos / Bebidas ──
  { name: 'Beta Fuel 80 Drink Mix', brand: 'SiS', category: 'isotonic', servingSize: '1 scoop (82g)', carbsG: '80.00', sodiumMg: '500.00', caffeineMg: '0.00', kcal: 320 },
  { name: 'GO Electrolyte', brand: 'SiS', category: 'isotonic', servingSize: '1 scoop (40g)', carbsG: '36.00', sodiumMg: '300.00', caffeineMg: '0.00', kcal: 144 },
  { name: 'GO Hydro Tab', brand: 'SiS', category: 'isotonic', servingSize: '1 tab (4.2g)', carbsG: '0.00', sodiumMg: '350.00', caffeineMg: '0.00', kcal: 10 },
  { name: 'Drink Mix 160', brand: 'Maurten', category: 'isotonic', servingSize: '1 sachet (40g)', carbsG: '39.00', sodiumMg: '220.00', caffeineMg: '0.00', kcal: 156 },
  { name: 'Drink Mix 320', brand: 'Maurten', category: 'isotonic', servingSize: '1 sachet (80g)', carbsG: '79.00', sodiumMg: '440.00', caffeineMg: '0.00', kcal: 316 },
  { name: 'Drink Mix 320 Caf 100', brand: 'Maurten', category: 'isotonic', servingSize: '1 sachet (83g)', carbsG: '79.00', sodiumMg: '440.00', caffeineMg: '100.00', kcal: 316 },
  { name: 'PH 1000', brand: 'Precision Fuel & Hydration', category: 'isotonic', servingSize: '1 tab', carbsG: '0.00', sodiumMg: '1000.00', caffeineMg: '0.00', kcal: 6 },
  { name: 'PH 1500', brand: 'Precision Fuel & Hydration', category: 'isotonic', servingSize: '1 tab', carbsG: '0.00', sodiumMg: '1500.00', caffeineMg: '0.00', kcal: 8 },
  { name: 'Endurance Fuel Drink Mix', brand: 'Tailwind', category: 'isotonic', servingSize: '1 scoop (27g)', carbsG: '25.00', sodiumMg: '303.00', caffeineMg: '0.00', kcal: 100 },
  { name: 'Endurance Fuel Drink Mix Caffeinated', brand: 'Tailwind', category: 'isotonic', servingSize: '1 scoop (27g)', carbsG: '25.00', sodiumMg: '303.00', caffeineMg: '35.00', kcal: 100 },
  { name: 'Gatorade Endurance', brand: 'Gatorade', category: 'isotonic', servingSize: '1 scoop (49g)', carbsG: '37.00', sodiumMg: '430.00', caffeineMg: '0.00', kcal: 160 },
  { name: 'Sport Hydration Mix', brand: 'Skratch Labs', category: 'isotonic', servingSize: '1 scoop (22g)', carbsG: '19.00', sodiumMg: '380.00', caffeineMg: '0.00', kcal: 80 },
  { name: 'Hydra 10 Isotonic', brand: 'Exceed', category: 'isotonic', servingSize: '1 sachet (30g)', carbsG: '27.00', sodiumMg: '200.00', caffeineMg: '0.00', kcal: 108 },
  { name: 'Isotonic Sports Drink', brand: 'Probiotica', category: 'isotonic', servingSize: '1 scoop (30g)', carbsG: '25.00', sodiumMg: '180.00', caffeineMg: '0.00', kcal: 100 },
  { name: 'HEED Sports Drink', brand: 'Hammer', category: 'isotonic', servingSize: '1 scoop (29g)', carbsG: '26.00', sodiumMg: '40.00', caffeineMg: '0.00', kcal: 106 },

  // ── Barras ──
  { name: 'GO Energy Bar', brand: 'SiS', category: 'bar', servingSize: '1 bar (40g)', carbsG: '26.00', sodiumMg: '30.00', caffeineMg: '0.00', kcal: 148 },
  { name: 'Solid 225', brand: 'Maurten', category: 'bar', servingSize: '1 bar (60g)', carbsG: '56.00', sodiumMg: '100.00', caffeineMg: '0.00', kcal: 225 },
  { name: 'Solid 160', brand: 'Maurten', category: 'bar', servingSize: '1 bar (47g)', carbsG: '39.00', sodiumMg: '70.00', caffeineMg: '0.00', kcal: 160 },
  { name: 'Energy Stroopwafel', brand: 'GU', category: 'bar', servingSize: '1 waffle (32g)', carbsG: '21.00', sodiumMg: '40.00', caffeineMg: '0.00', kcal: 150 },
  { name: 'Clif Bar', brand: 'Clif', category: 'bar', servingSize: '1 bar (68g)', carbsG: '45.00', sodiumMg: '200.00', caffeineMg: '0.00', kcal: 260 },
  { name: 'Clif Bloks', brand: 'Clif', category: 'bar', servingSize: '3 blocos (33g)', carbsG: '24.00', sodiumMg: '70.00', caffeineMg: '0.00', kcal: 100 },
  { name: 'Clif Bloks Caffeine', brand: 'Clif', category: 'bar', servingSize: '3 blocos (33g)', carbsG: '24.00', sodiumMg: '70.00', caffeineMg: '50.00', kcal: 100 },
  { name: 'Exceed Energy Bar', brand: 'Exceed', category: 'bar', servingSize: '1 bar (40g)', carbsG: '28.00', sodiumMg: '40.00', caffeineMg: '0.00', kcal: 140 },
  { name: 'Perpetuem Bar', brand: 'Hammer', category: 'bar', servingSize: '1 bar (65g)', carbsG: '29.00', sodiumMg: '120.00', caffeineMg: '0.00', kcal: 270 },

  // ── Cápsulas de Sal ──
  { name: 'Endurolyte Capsules', brand: 'Hammer', category: 'salt_capsule', servingSize: '1 capsule', carbsG: '0.00', sodiumMg: '40.00', caffeineMg: '0.00', kcal: 0 },
  { name: 'S!Caps', brand: 'SaltStick', category: 'salt_capsule', servingSize: '1 capsule', carbsG: '0.00', sodiumMg: '215.00', caffeineMg: '0.00', kcal: 0 },
  { name: 'SaltStick Fastchews', brand: 'SaltStick', category: 'salt_capsule', servingSize: '2 tabs', carbsG: '1.00', sodiumMg: '200.00', caffeineMg: '0.00', kcal: 5 },
  { name: 'Enduralyte Salt Caps', brand: 'Enduralyte', category: 'salt_capsule', servingSize: '1 capsule', carbsG: '0.00', sodiumMg: '200.00', caffeineMg: '0.00', kcal: 0 },
  { name: 'Precision Fuel Capsules', brand: 'Precision Fuel & Hydration', category: 'salt_capsule', servingSize: '1 capsule', carbsG: '0.00', sodiumMg: '250.00', caffeineMg: '0.00', kcal: 0 },
  { name: 'BASE Salt', brand: 'BASE Performance', category: 'salt_capsule', servingSize: '1 capsule', carbsG: '0.00', sodiumMg: '200.00', caffeineMg: '0.00', kcal: 0 },
  { name: 'Saltstick Vitassium', brand: 'SaltStick', category: 'salt_capsule', servingSize: '1 capsule', carbsG: '0.00', sodiumMg: '100.00', caffeineMg: '0.00', kcal: 0 },

  // ── Cafeína ──
  { name: 'Caffeine Bullet', brand: 'Caffeine Bullet', category: 'caffeine', servingSize: '1 gum', carbsG: '0.00', sodiumMg: '0.00', caffeineMg: '100.00', kcal: 2 },
  { name: 'No-Doz', brand: 'No-Doz', category: 'caffeine', servingSize: '1 tab', carbsG: '0.00', sodiumMg: '0.00', caffeineMg: '100.00', kcal: 0 },
  { name: 'Cafeina Caps 200mg', brand: 'Max Titanium', category: 'caffeine', servingSize: '1 capsule', carbsG: '0.00', sodiumMg: '0.00', caffeineMg: '200.00', kcal: 0 },
  { name: 'Cafeina Caps 210mg', brand: 'IntegralMedica', category: 'caffeine', servingSize: '1 capsule', carbsG: '0.00', sodiumMg: '0.00', caffeineMg: '210.00', kcal: 0 },
  { name: 'Caffeine 200mg', brand: 'Probiotica', category: 'caffeine', servingSize: '1 capsule', carbsG: '0.00', sodiumMg: '0.00', caffeineMg: '200.00', kcal: 0 },
];

async function seed() {
  console.log(`Inserindo ${products.length} produtos no catalogo...`);

  for (const product of products) {
    await db
      .insert(schema.productCatalog)
      .values(product)
      .onConflictDoNothing();
  }

  console.log('Seed concluido com sucesso!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Erro ao executar seed:', err);
  process.exit(1);
});
