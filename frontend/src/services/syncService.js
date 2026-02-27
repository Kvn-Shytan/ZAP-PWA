// frontend/src/services/syncService.js
import { db } from './db';
import { apiFetch } from './api';

const SYNC_INTERVAL = 60 * 1000; // 1 minute for active orders, can be adjusted

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.syncIntervalId = null;
  }

  async initialSync(token) {
    if (this.isSyncing) return;
    this.isSyncing = true;
    console.log('Starting initial sync...');

    try {
      // 1. Fetch Clients
      const clients = await apiFetch('/clients', { headers: { Authorization: `Bearer ${token}` } });
      await db.clients.clear();
      await db.clients.bulkPut(clients);
      console.log(`Synced ${clients.length} clients.`);

      // 2. Fetch Assemblers
      const assemblers = await apiFetch('/assemblers', { headers: { Authorization: `Bearer ${token}` } });
      await db.assemblers.clear();
      await db.assemblers.bulkPut(assemblers);
      console.log(`Synced ${assemblers.length} assemblers.`);

      // 3. Fetch Products (all types, for details and lookup)
      // Potentially filter by relevant products only, e.g., only those used in orders
      const products = await apiFetch('/products?all=true', { headers: { Authorization: `Bearer ${token}` } }); // Assuming an /products?all=true endpoint
      await db.products.clear();
      await db.products.bulkPut(products);
      console.log(`Synced ${products.length} products.`);

      // 4. Fetch Active External Production Orders
      // Fetching orders that are in active states for the logistics dashboard
      const activeOrders = await apiFetch('/external-production-orders/active', { headers: { Authorization: `Bearer ${token}` } }); // Assuming new endpoint for active orders
      await db.externalProductionOrders.clear();
      await db.externalProductionOrders.bulkPut(activeOrders);
      console.log(`Synced ${activeOrders.length} active external production orders.`);

      console.log('Initial sync completed successfully.');
    } catch (error) {
      console.error('Error during initial sync:', error);
      // Depending on error type, might want to clear DB or show user a message
    } finally {
      this.isSyncing = false;
    }
  }

  // Delta Sync (future implementation for continuous updates)
  async deltaSync(token) {
    if (this.isSyncing) return;
    this.isSyncing = true;
    console.log('Starting delta sync...');

    try {
      // For each table, get the latest updatedAt timestamp from local DB
      // Then call API with this timestamp to get only newer/modified records
      // Example for orders:
      const latestOrder = await db.externalProductionOrders.orderBy('updatedAt').last();
      const lastSyncTimestamp = latestOrder ? latestOrder.updatedAt : null;

      // Assuming an API endpoint that takes a 'since' timestamp
      const changedOrders = await apiFetch(`/external-production-orders/changes?since=${lastSyncTimestamp || ''}`, { headers: { Authorization: `Bearer ${token}` } });
      if (changedOrders && changedOrders.length > 0) {
        await db.externalProductionOrders.bulkPut(changedOrders);
        console.log(`Delta synced ${changedOrders.length} external production orders.`);
      } else {
        console.log('No new external production order changes.');
      }

      // Repeat for clients, assemblers, products if they can change often

    } catch (error) {
      console.error('Error during delta sync:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  startContinuousSync(token) {
    // Clear any existing interval to prevent duplicates
    this.stopContinuousSync(); 
    this.syncIntervalId = setInterval(() => this.deltaSync(token), SYNC_INTERVAL);
    console.log('Continuous delta sync started.');
  }

  stopContinuousSync() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      console.log('Continuous delta sync stopped.');
    }
  }

  // Utility to clear local data
  async clearLocalData() {
    await db.externalProductionOrders.clear();
    await db.clients.clear();
    await db.assemblers.clear();
    await db.products.clear();
    console.log('All local data cleared.');
  }
}

export const syncService = new SyncService();
