import { apiFetch } from './api';

export const categoryService = {
  /**
   * Obtiene todas las categorías.
   * @returns {Promise<Array<object>>} - Una lista de categorías.
   */
  getCategories() {
    return apiFetch('/categories');
  },

  /**
   * Crea una nueva categoría.
   * @param {object} categoryData - Los datos de la categoría (ej. { name: 'Nueva Cat' }).
   * @returns {Promise<object>} - La nueva categoría creada.
   */
  createCategory(categoryData) {
    return apiFetch('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  },

  /**
   * Actualiza una categoría existente.
   * @param {number} id - El ID de la categoría.
   * @param {object} categoryData - Los nuevos datos.
   * @returns {Promise<object>} - La categoría actualizada.
   */
  updateCategory(id, categoryData) {
    return apiFetch(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
  },

  /**
   * Elimina una categoría.
   * @param {number} id - El ID de la categoría.
   * @returns {Promise<null>}
   */
  deleteCategory(id) {
    return apiFetch(`/categories/${id}`, {
      method: 'DELETE',
    });
  },
};
