import { apiFetch } from './api';

export const clientService = {
  /**
   * Obtiene todos los clientes.
   * @returns {Promise<Array<object>>} - La lista de clientes con sus niveles de precio incluidos.
   */
  getAll() {
    return apiFetch('/clients');
  },

  /**
   * Obtiene un cliente por su ID.
   * @param {string} id - El ID del cliente.
   * @returns {Promise<object>} - El cliente encontrado.
   */
  getById(id) {
    return apiFetch(`/clients/${id}`);
  },

  /**
   * Crea un nuevo cliente.
   * @param {object} clientData - Los datos del cliente (name, address, phone, email, priceTierId).
   * @returns {Promise<object>} - El nuevo cliente creado.
   */
  create(clientData) {
    return apiFetch('/clients', {
      method: 'POST',
      body: JSON.stringify(clientData),
    });
  },

  /**
   * Actualiza un cliente existente.
   * @param {string} id - El ID del cliente.
   * @param {object} clientData - Los nuevos datos del cliente.
   * @returns {Promise<object>} - El cliente actualizado.
   */
  update(id, clientData) {
    return apiFetch(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clientData),
    });
  },

  /**
   * Elimina un cliente.
   * @param {string} id - El ID del cliente a eliminar.
   * @returns {Promise<null>}
   */
  delete(id) {
    return apiFetch(`/clients/${id}`, {
      method: 'DELETE',
    });
  },
};
