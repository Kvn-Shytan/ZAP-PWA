// frontend/src/services/db.js
import Dexie from 'dexie';

// Define the database
export const db = new Dexie('zapPwaDb');

// Define the schema
// Version 1: Initial schema for core logistics data
db.version(1).stores({
  externalProductionOrders: '++id, status, deliveryUserId, orderNumber, &externalProductionOrderId, updatedAt',
  clients: '++id, name, &clientId',
  assemblers: '++id, name, &assemblerId',
  products: '++id, name, code, &productId',
  // Note: '++id' means auto-incrementing primary key.
  // '&fieldName' means unique index.
  // 'fieldName' means non-unique index.
  // 'updatedAt' will be crucial for delta synchronization.
});

// For better debugging and visibility
db.on('populate', () => {
  console.log("Database populated for the first time.");
});

db.on('ready', () => {
  console.log("Database ready.");
});

db.open().catch((err) => {
  console.error(`Open failed: ${err.stack || err}`);
});

// Example: Utility function to clear and repopulate for testing or full re-sync
export async function clearAndRepopulateDb() {
  await db.externalProductionOrders.clear();
  await db.clients.clear();
  await db.assemblers.clear();
  await db.products.clear();
  // In a real scenario, you'd fetch initial data here and add it.
  console.log("Local database cleared and ready for fresh sync.");
}
