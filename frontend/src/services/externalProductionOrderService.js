import { apiFetch } from './api';

export const externalProductionOrderService = {
  /**
   * Crea una nueva orden de producción externa.
   * @param {object} orderData - Los datos de la orden (armadorId, productId, quantity, etc.)
   * @returns {Promise<object>} - La nueva orden creada.
   */
  createOrder(orderData, mode = 'commit') {
    const query = mode === 'dry-run' ? '?mode=dry-run' : '';
    return apiFetch(`/external-production-orders${query}`, {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  /**
   * Obtiene una lista de órdenes de producción externa, con filtros opcionales.
   * @param {object} params - Parámetros de consulta (ej. status).
   * @returns {Promise<Array<object>>} - La lista de órdenes.
   */
  getOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/external-production-orders?${query}`);
  },

  /**
   * Asigna o reasigna una orden a un repartidor.
   * @param {string} orderId - El ID de la orden.
   * @param {string|null} deliveryUserId - El ID del usuario repartidor, o null para desasignar.
   * @returns {Promise<object>} - La orden actualizada.
   */
  assignOrder(orderId, deliveryUserId) {
    return apiFetch(`/external-production-orders/${orderId}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ deliveryUserId }),
    });
  },

  /**
   * Cancela una orden de producción externa.
   * @param {string} orderId - El ID de la orden a cancelar.
   * @returns {Promise<object>} - La orden actualizada con estado CANCELLED.
   */
  cancelOrder(orderId) {
    return apiFetch(`/external-production-orders/${orderId}/cancel`, {
      method: 'POST',
    });
  },
};
