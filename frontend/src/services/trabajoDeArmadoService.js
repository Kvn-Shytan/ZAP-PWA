import { apiFetch } from './api';

const BASE_URL = '/trabajos-armado';

export const trabajoDeArmadoService = {
  /**
   * Obtiene todos los trabajos de armado.
   * @returns {Promise<Array<object>>}
   */
  getAll() {
    return apiFetch(BASE_URL);
  },

  /**
   * Obtiene un trabajo de armado por su ID.
   * @param {string} id - El ID del trabajo.
   * @returns {Promise<object>}
   */
  getById(id) {
    return apiFetch(`${BASE_URL}/${id}`);
  },

  /**
   * Crea un nuevo trabajo de armado.
   * @param {object} data - { nombre, precio, descripcion }
   * @returns {Promise<object>}
   */
  create(data) {
    return apiFetch(BASE_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Actualiza un trabajo de armado.
   * @param {string} id - El ID del trabajo a actualizar.
   * @param {object} data - { nombre, precio, descripcion }
   * @returns {Promise<object>}
   */
  update(id, data) {
    return apiFetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Elimina un trabajo de armado.
   * @param {string} id - El ID del trabajo a eliminar.
   * @returns {Promise<null>}
   */
  delete(id) {
    return apiFetch(`${BASE_URL}/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Obtiene todos los productos vinculados a un trabajo de armado específico.
   * @param {string} id - El ID del trabajo.
   * @returns {Promise<Array<object>>}
   */
  getLinkedProducts(id) {
    return apiFetch(`${BASE_URL}/${id}/linked-products`);
  },
};
