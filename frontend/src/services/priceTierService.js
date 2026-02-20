import { apiFetch } from './api';

export const priceTierService = {
  /**
   * Obtiene todos los niveles de precio.
   * @returns {Promise<Array<object>>} - La lista de niveles de precio.
   */
  getAll() {
    return apiFetch('/price-tiers');
  },

  /**
   * Obtiene un nivel de precio por su ID.
   * @param {string} id - El ID del nivel de precio.
   * @returns {Promise<object>} - El nivel de precio encontrado.
   */
  getById(id) {
    return apiFetch(`/price-tiers/${id}`);
  },

  /**
   * Crea un nuevo nivel de precio.
   * @param {object} priceTierData - Los datos del nivel (name, description, discountPercentage).
   * @returns {Promise<object>} - El nuevo nivel de precio creado.
   */
  create(priceTierData) {
    return apiFetch('/price-tiers', {
      method: 'POST',
      body: JSON.stringify(priceTierData),
    });
  },

  /**
   * Actualiza un nivel de precio existente.
   * @param {string} id - El ID del nivel de precio.
   * @param {object} priceTierData - Los nuevos datos del nivel.
   * @returns {Promise<object>} - El nivel de precio actualizado.
   */
  update(id, priceTierData) {
    return apiFetch(`/price-tiers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(priceTierData),
    });
  },

  /**
   * Elimina un nivel de precio.
   * @param {string} id - El ID del nivel de precio a eliminar.
   * @returns {Promise<null>}
   */
  delete(id) {
    return apiFetch(`/price-tiers/${id}`, {
      method: 'DELETE',
    });
  },
};
