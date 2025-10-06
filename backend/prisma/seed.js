const { PrismaClient, Prisma, Role } = require('@prisma/client');
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
  console.log(`Start seeding products and categories programmatically...`);

  const categories = [
    'PLASTICOS', 'HORAS MAQUINA', 'FLEJES DE CHAPA GALVANIZADA', 'CABLES', 'CHICOTES', 'FERRETERIA'
  ];

  for (const categoryName of categories) {
    await prisma.category.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName }
    });
    console.log(`Upserted category: ${categoryName}`);
  }

  // Sample products
  const sampleProducts = [
    {
      internalCode: 'PROD-001',
      description: 'Materia Prima Ejemplo 1',
      unit: 'un',
      priceUSD: new Prisma.Decimal('1.50'),
      priceARS: new Prisma.Decimal('1500.00'),
      stock: 100,
      lowStockThreshold: 10,
      type: 'RAW_MATERIAL',
      isClassified: true,
      categoryName: 'PLASTICOS'
    },
    {
      internalCode: 'PROD-002',
      description: 'Producto Pre-ensamblado Ejemplo',
      unit: 'un',
      priceUSD: new Prisma.Decimal('5.00'),
      priceARS: new Prisma.Decimal('5000.00'),
      stock: 50,
      lowStockThreshold: 5,
      type: 'PRE_ASSEMBLED',
      isClassified: true,
      categoryName: 'HORAS MAQUINA'
    },
    {
      internalCode: 'PROD-003',
      description: 'Producto Terminado Ejemplo',
      unit: 'un',
      priceUSD: new Prisma.Decimal('10.00'),
      priceARS: new Prisma.Decimal('10000.00'),
      stock: 20,
      lowStockThreshold: 2,
      type: 'FINISHED',
      isClassified: true,
      categoryName: 'CABLES'
    }
  ];

  for (const product of sampleProducts) {
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
  const tornillo = await prisma.product.findUnique({ where: { internalCode: 'PROD-001' } }); // Use new sample product
  const bornera = await prisma.product.findUnique({ where: { internalCode: 'PROD-002' } }); // Use new sample product
  const armadoZAP4 = await prisma.product.findUnique({ where: { internalCode: 'PROD-003' } }); // Use new sample product

  if (!adminUser || !tornillo || !bornera || !armadoZAP4) {
    console.error('Could not find required users or products for movement seeding. Aborting.');
    return;
  }

  // 3. Define Bill of Materials for "Armado ZAP4" (now PROD-003)
  console.log('Defining Bill of Materials...');
  await prisma.productComponent.create({
    data: { productId: armadoZAP4.id, componentId: tornillo.id, quantity: new Prisma.Decimal('1') },
  });
  await prisma.productComponent.create({
    data: { productId: armadoZAP4.id, componentId: bornera.id, quantity: new Prisma.Decimal('1') },
  });

  // 4. Create movements in a single transaction
  console.log('Creating sample movements...');
  await prisma.$transaction(async (tx) => {
    // Compra
    await tx.inventoryMovement.create({ data: { productId: tornillo.id, type: 'PURCHASE', quantity: new Prisma.Decimal('500'), userId: adminUser.id, notes: 'Seed data' } });
    await tx.product.update({ where: { id: tornillo.id }, data: { stock: { increment: new Prisma.Decimal('500') } } });
    await tx.inventoryMovement.create({ data: { productId: bornera.id, type: 'PURCHASE', quantity: new Prisma.Decimal('500'), userId: adminUser.id, notes: 'Seed data' } });
    await tx.product.update({ where: { id: bornera.id }, data: { stock: { increment: new Prisma.Decimal('500') } } });
    console.log('  - Created PURCHASE movements.');

    // Fabricación
    await tx.inventoryMovement.create({ data: { productId: armadoZAP4.id, type: 'PRODUCTION_IN', quantity: new Prisma.Decimal('10'), userId: adminUser.id, notes: 'Seed data' } });
    await tx.product.update({ where: { id: armadoZAP4.id }, data: { stock: { increment: new Prisma.Decimal('10') } } });
    await tx.inventoryMovement.create({ data: { productId: tornillo.id, type: 'PRODUCTION_OUT', quantity: new Prisma.Decimal('10'), userId: adminUser.id, notes: 'Seed data' } });
    await tx.product.update({ where: { id: tornillo.id }, data: { stock: { decrement: new Prisma.Decimal('10') } } });
    await tx.inventoryMovement.create({ data: { productId: bornera.id, type: 'PRODUCTION_OUT', quantity: new Prisma.Decimal('10'), userId: adminUser.id, notes: 'Seed data' } });
    await tx.product.update({ where: { id: bornera.id }, data: { stock: { decrement: new Prisma.Decimal('10') } } });
    console.log('  - Created PRODUCTION movements.');

    // Venta
    await tx.inventoryMovement.create({ data: { productId: armadoZAP4.id, type: 'SALE', quantity: new Prisma.Decimal('3'), userId: adminUser.id, notes: 'Seed data' } });
    await tx.product.update({ where: { id: armadoZAP4.id }, data: { stock: { decrement: new Prisma.Decimal('3') } } });
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
