const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function importProducts() {
  const csvFilePath = path.resolve(__dirname, 'actualizacion_sept25.csv');
  const productsToImport = [];

  // Read and parse the CSV file
  const parser = fs
    .createReadStream(csvFilePath)
    .pipe(parse({
      delimiter: ',',
      from_line: 2, // Skip header row
      relax_column_count: true, // Allow inconsistent column counts
      trim: true,
    }));

  for await (const record of parser) {
    // Assuming important cells are from A1 to F125, so we care about indices 0 to 5
    // COD. INTERNO (0), DESCRIPCION (1), PRECIO USD (2), PRECIO ARS (3), UNIT (4, inferred)
    const internalCode = record[0];
    const description = record[1];
    const priceUSDStr = record[2];
    const priceARSStr = record[3];
    const unit = record[4]; // Inferred from analysis

    // Skip rows that don't have at least internalCode and description
    if (!internalCode || !description || internalCode.startsWith('#')) {
      continue;
    }

    // Clean and convert prices (handle comma as decimal separator)
    const priceUSD = priceUSDStr ? parseFloat(priceUSDStr.replace(',', '.')) : null;
    const priceARS = priceARSStr ? parseFloat(priceARSStr.replace(',', '.')) : null;

    productsToImport.push({
      internalCode,
      description,
      priceUSD,
      priceARS,
      unit: unit || 'un', // Default unit if not provided
    });
  }

  console.log(`Found ${productsToImport.length} products to potentially import.`);

  for (const productData of productsToImport) {
    try {
      await prisma.product.upsert({
        where: { internalCode: productData.internalCode },
        update: {
          description: productData.description,
          priceUSD: productData.priceUSD,
          priceARS: productData.priceARS,
          unit: productData.unit,
        },
        create: {
          internalCode: productData.internalCode,
          description: productData.description,
          unit: productData.unit,
          priceUSD: productData.priceUSD,
          priceARS: productData.priceARS,
          stock: 0,
          lowStockThreshold: 0,
          type: 'RAW_MATERIAL', // Default type
          isClassified: false, // Default to unclassified
        },
      });
      console.log(`Successfully upserted: ${productData.internalCode} - ${productData.description}`);
    } catch (error) {
      console.error(`Error upserting product ${productData.internalCode}:`, error.message);
    }
  }

  console.log('Product import process finished.');
  await prisma.$disconnect();
}

importProducts().catch(e => {
  console.error(e);
  process.exit(1);
});
