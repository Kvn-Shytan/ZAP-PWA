const { PrismaClient, Role } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedUsers() {
  console.log(`Start seeding users...`);
  const saltRounds = 10;
  const password = 'zap123';
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  await prisma.user.upsert({
    where: { email: 'admin@zap.com' },
    update: { password: hashedPassword },
    create: {
      email: 'admin@zap.com',
      name: 'Admin ZAP',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });
  console.log('Default admin user created/updated: admin@zap.com');
}

async function seedProductsAndCategories() {
  console.log(`Start seeding products and categories...`);
  const csvFilePath = path.resolve(__dirname, 'data.csv');
  const productsToCreate = [];
  const categoriesToCreate = new Set();
  let currentCategoryName = 'Sin Categoría';

  const categoryRows = {
    4: 'PLASTICOS', 9: 'HORAS MAQUINA', 13: 'FLEJES DE CHAPA GALVANIZADA', 19: 'FLEJES DE LATON', 22: 'CABLES', 41: 'CHICOTES', 59: 'INTERRUPTORES', 64: 'FERRETERIA', 72: 'PACKAGING', 79: 'ARMADO', 87: 'INYECCION POR PIEZA', 89: 'TERMINALES DE LATON', 99: 'FICHAS', 104: 'CHICOTES ZAP', 110: 'CABLES ZAP',
  };
  const rowsToSkip = new Set([1, 2, 3, 23, 28, 33, 38]);

  return new Promise((resolve, reject) => {
    let rowNumber = 0;
    fs.createReadStream(csvFilePath)
      .pipe(csv({ headers: false }))
      .on('data', (row) => {
        rowNumber++;
        if (rowsToSkip.has(rowNumber)) return;
        if (categoryRows[rowNumber]) {
          currentCategoryName = categoryRows[rowNumber];
          categoriesToCreate.add(currentCategoryName);
          return;
        }
        const [internalCode, description, priceUSDStr, priceARSStr, unit] = [row[0], row[1], row[2], row[3], row[4]];
        if (internalCode && description && unit) {
          productsToCreate.push({
            internalCode: internalCode.trim(),
            description: description.trim(),
            priceUSD: parseFloat(String(priceUSDStr || '0').replace(',', '.')) || null,
            priceARS: parseFloat(String(priceARSStr || '0').replace(',', '.')) || null,
            unit: unit.trim(),
            categoryName: currentCategoryName,
          });
        }
      })
      .on('end', async () => {
        console.log('CSV parsing finished.');
        for (const categoryName of categoriesToCreate) {
          await prisma.category.upsert({ where: { name: categoryName }, update: {}, create: { name: categoryName } });
          console.log(`Upserted category: ${categoryName}`);
        }
        for (const product of productsToCreate) {
          const { categoryName, ...productData } = product;
          await prisma.product.upsert({
            where: { internalCode: product.internalCode },
            update: {
              ...productData,
              category: { connect: { name: categoryName } },
            },
            create: {
              ...productData,
              category: { connect: { name: categoryName } },
            },
          });
          console.log(`Upserted product: ${product.description}`);
        }
        resolve();
      })
      .on('error', reject);
  });
}

async function seedMovements() {
  console.log('Start seeding movements...');

  // 1. Clean slate for idempotency
  console.log('Resetting current stock and movements...');
  await prisma.inventoryMovement.deleteMany({});
  await prisma.productComponent.deleteMany({});
  await prisma.product.updateMany({ data: { stock: 0 } });

  // 2. Get required data
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@zap.com' } });
  const tornillo = await prisma.product.findUnique({ where: { internalCode: 'TRN-DT01' } });
  const bornera = await prisma.product.findUnique({ where: { internalCode: 'BRN-DT01' } });
  const armadoZAP4 = await prisma.product.findUnique({ where: { internalCode: 'AR-ZP401' } });

  if (!adminUser || !tornillo || !bornera || !armadoZAP4) {
    console.error('Could not find required users or products for movement seeding. Aborting.');
    return;
  }

  // 3. Define Bill of Materials for "Armado ZAP4"
  console.log('Defining Bill of Materials...');
  await prisma.productComponent.create({
    data: { productId: armadoZAP4.id, componentId: tornillo.id, quantity: 1 },
  });
  await prisma.productComponent.create({
    data: { productId: armadoZAP4.id, componentId: bornera.id, quantity: 1 },
  });

  // 4. Create movements in a single transaction
  console.log('Creating sample movements...');
  await prisma.$transaction(async (tx) => {
    // Compra
    await tx.inventoryMovement.create({ data: { productId: tornillo.id, type: 'PURCHASE', quantity: 500, userId: adminUser.id, notes: 'Seed data' } });
    await tx.product.update({ where: { id: tornillo.id }, data: { stock: { increment: 500 } } });
    await tx.inventoryMovement.create({ data: { productId: bornera.id, type: 'PURCHASE', quantity: 500, userId: adminUser.id, notes: 'Seed data' } });
    await tx.product.update({ where: { id: bornera.id }, data: { stock: { increment: 500 } } });
    console.log('  - Created PURCHASE movements.');

    // Fabricación
    await tx.inventoryMovement.create({ data: { productId: armadoZAP4.id, type: 'PRODUCTION_IN', quantity: 10, userId: adminUser.id, notes: 'Seed data' } });
    await tx.product.update({ where: { id: armadoZAP4.id }, data: { stock: { increment: 10 } } });
    await tx.inventoryMovement.create({ data: { productId: tornillo.id, type: 'PRODUCTION_OUT', quantity: 10, userId: adminUser.id, notes: 'Seed data' } });
    await tx.product.update({ where: { id: tornillo.id }, data: { stock: { decrement: 10 } } });
    await tx.inventoryMovement.create({ data: { productId: bornera.id, type: 'PRODUCTION_OUT', quantity: 10, userId: adminUser.id, notes: 'Seed data' } });
    await tx.product.update({ where: { id: bornera.id }, data: { stock: { decrement: 10 } } });
    console.log('  - Created PRODUCTION movements.');

    // Venta
    await tx.inventoryMovement.create({ data: { productId: armadoZAP4.id, type: 'SALE', quantity: 3, userId: adminUser.id, notes: 'Seed data' } });
    await tx.product.update({ where: { id: armadoZAP4.id }, data: { stock: { decrement: 3 } } });
    console.log('  - Created SALE movement.');
  });
}

async function main() {
  await seedUsers();
  await seedProductsAndCategories();
  await seedMovements();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
