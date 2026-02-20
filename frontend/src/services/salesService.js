import { apiFetch } from './api';

export const salesService = {
  /**
   * Crea una nueva orden de venta.
   * @param {object} salesData - Datos de la orden (clientId, salesPlatform, notes, items, paymentStatus).
   * @returns {Promise<object>} - La orden de venta creada.
   */
  createSalesOrder(salesData) {
    return apiFetch('/sales', {
      method: 'POST',
      body: JSON.stringify(salesData),
    });
  },

  /**
   * Obtiene una orden de venta por su ID con todos los detalles.
   * @param {string} id - ID de la orden de venta.
   * @returns {Promise<object>} - La orden de venta.
   */
  getSalesOrderById(id) {
    return apiFetch(`/sales/${id}`);
  },

  /**
   * Obtiene el historial de ventas (opcional para reportes futuros).
   * @returns {Promise<Array<object>>}
   */
  getSalesHistory() {
    return apiFetch('/sales');
  }
};
