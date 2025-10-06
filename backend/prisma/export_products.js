const { PrismaClient } = require('@prisma/client');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando exportación de productos a CSV...');

  const products = await prisma.product.findMany({
    include: {
      category: true,
      supplier: true,
    },
    orderBy: {
      id: 'asc',
    },
  });

  console.log(`${products.length} productos encontrados.`);

  const csvWriter = createCsvWriter({
    path: path.join(__dirname, 'productos_maestros.csv'),
    header: [
      { id: 'id', title: 'ID' },
      { id: 'sku', title: 'SKU' },
      { id: 'name', title: 'Nombre' },
      { id: 'type', title: 'Tipo' },
      { id: 'stock', title: 'Stock' },
      { id: 'priceARS', title: 'PrecioARS' },
      { id: 'priceUSD', title: 'PrecioUSD' },
      { id: 'category', title: 'Categoria' },
      { id: 'supplier', title: 'Proveedor' },
      { id: 'lowStockThreshold', title: 'UmbralBajoStock' },
    ],
  });

  const records = products.map(product => ({
    id: product.id,
    sku: product.sku,
    name: product.name,
    type: product.type,
    stock: product.stock,
    priceARS: product.priceARS,
    priceUSD: product.priceUSD,
    category: product.category ? product.category.name : 'N/A',
    supplier: product.supplier ? product.supplier.name : 'N/A',
    lowStockThreshold: product.lowStockThreshold,
  }));

  await csvWriter.writeRecords(records);

  console.log('¡Éxito! La exportación se ha completado.');
  console.log('El archivo se guardó en: backend/prisma/productos_maestros.csv');
}

main()
  .catch(e => {
    console.error('Ocurrió un error durante la exportación:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
