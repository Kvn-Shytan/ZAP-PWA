import { apiFetch } from './api';

export const supplierService = {
  /**
   * Obtiene todos los proveedores.
   * @returns {Promise<Array<object>>} - Una lista de proveedores.
   */
  getSuppliers() {
    return apiFetch('/suppliers');
  },

  /**
   * Crea un nuevo proveedor.
   * @param {object} supplierData - Los datos del proveedor.
   * @returns {Promise<object>} - El nuevo proveedor creado.
   */
  createSupplier(supplierData) {
    return apiFetch('/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplierData),
    });
  },

  /**
   * Actualiza un proveedor existente.
   * @param {number} id - El ID del proveedor.
   * @param {object} supplierData - Los nuevos datos.
   * @returns {Promise<object>} - El proveedor actualizado.
   */
  updateSupplier(id, supplierData) {
    return apiFetch(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(supplierData),
    });
  },

  /**
   * Elimina un proveedor.
   * @param {number} id - El ID del proveedor.
   * @returns {Promise<null>}
   */
  deleteSupplier(id) {
    return apiFetch(`/suppliers/${id}`, {
      method: 'DELETE',
    });
  },
};
