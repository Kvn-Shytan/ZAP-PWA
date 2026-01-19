import { apiFetch } from './api';

const BASE_URL = '/assembly-jobs';

export const assemblyJobService = {
  /**
   * Fetches all assembly jobs.
   * @returns {Promise<Array<object>>}
   */
  getAll() {
    return apiFetch(BASE_URL);
  },

  /**
   * Fetches an assembly job by its ID.
   * @param {string} id - The ID of the assembly job.
   * @returns {Promise<object>}
   */
  getById(id) {
    return apiFetch(`${BASE_URL}/${id}`);
  },

  /**
   * Creates a new assembly job.
   * @param {object} data - { name, price, description }
   * @returns {Promise<object>}
   */
  create(data) {
    return apiFetch(BASE_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Updates an existing assembly job.
   * @param {string} id - The ID of the assembly job to update.
   * @param {object} data - { name, price, description }
   * @returns {Promise<object>}
   */
  update(id, data) {
    return apiFetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Deletes an assembly job.
   * @param {string} id - The ID of the assembly job to delete.
   * @returns {Promise<null>}
   */
  delete(id) {
    return apiFetch(`${BASE_URL}/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Fetches all products linked to a specific assembly job.
   * @param {string} id - The ID of the assembly job.
   * @returns {Promise<Array<object>>}
   */
  getLinkedProducts(id) {
    return apiFetch(`${BASE_URL}/${id}/linked-products`);
  },
};