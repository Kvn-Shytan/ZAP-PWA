const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const prisma = new PrismaClient();

async function main() {
  const csvFilePath = path.resolve(__dirname, 'data.csv');
  const productsToCreate = [];
  const categoriesToCreate = new Set();
  let currentCategoryName = 'Sin Categoría'; // Default category

  const categoryRows = {
    4: 'PLASTICOS',
    9: 'HORAS MAQUINA',
    13: 'FLEJES DE CHAPA GALVANIZADA',
    19: 'FLEJES DE LATON',
    22: 'CABLES',
    41: 'CHICOTES',
    59: 'INTERRUPTORES',
    64: 'FERRETERIA',
    72: 'PACKAGING',
    79: 'ARMADO',
    87: 'INYECCION POR PIEZA',
    89: 'TERMINALES DE LATON',
    99: 'FICHAS',
    104: 'CHICOTES ZAP',
    110: 'CABLES ZAP',
  };

  const rowsToSkip = new Set([1, 2, 3, 23, 28, 33, 38]); // CSV is 1-indexed, header is row 1

  let rowNumber = 0;
  fs.createReadStream(csvFilePath)
    .pipe(csv({ headers: false })) // Read without headers, we'll use column index
    .on('data', (row) => {
      rowNumber++;

      if (rowsToSkip.has(rowNumber)) {
        return;
      }

      if (categoryRows[rowNumber]) {
        currentCategoryName = categoryRows[rowNumber];
        categoriesToCreate.add(currentCategoryName);
        return;
      }

      // Assuming columns A-E are relevant: row[0] to row[4]
      const internalCode = row[0] ? String(row[0]).trim() : null;
      const description = row[1] ? String(row[1]).trim() : null;
      let priceUSD = row[2] ? parseFloat(String(row[2]).replace(',', '.')) : null;
      let priceARS = row[3] ? parseFloat(String(row[3]).replace(',', '.')) : null;
      const unit = row[4] ? String(row[4]).trim() : null;

      // Skip rows that are clearly not product data (e.g., empty or just category headers)
      if (!internalCode && !description && !priceUSD && !priceARS && !unit) {
        return;
      }

      // Basic validation for product data
      if (internalCode && description && unit) {
        productsToCreate.push({
          internalCode,
          description,
          priceUSD: priceUSD !== null && !isNaN(priceUSD) ? priceUSD : null,
          priceARS: priceARS !== null && !isNaN(priceARS) ? priceARS : null,
          unit,
          categoryName: currentCategoryName,
        });
      }
    })
    .on('end', async () => {
      console.log('CSV parsing finished. Starting database seeding...');

      // Create categories first
      for (const categoryName of categoriesToCreate) {
        await prisma.category.upsert({
          where: { name: categoryName },
          update: {},
          create: { name: categoryName },
        });
        console.log(`Upserted category: ${categoryName}`);
      }

      // Create products
      for (const product of productsToCreate) {
        try {
          await prisma.product.create({
            data: {
              internalCode: product.internalCode,
              description: product.description,
              unit: product.unit,
              priceUSD: product.priceUSD,
              priceARS: product.priceARS,
              category: {
                connect: { name: product.categoryName },
              },
            },
          });
          console.log(`Created product: ${product.description} (${product.internalCode})`);
        } catch (error) {
          console.error(`Error creating product ${product.internalCode}:`, error.message);
        }
      }

      console.log('Seeding finished.');
      await prisma.$disconnect();
    })
    .on('error', (error) => {
      console.error('Error reading CSV:', error);
    });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
