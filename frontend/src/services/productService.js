import { apiFetch } from './api';

export const productService = {
  /**
   * Obtiene una lista paginada de productos.
   * @param {object} params - Parámetros de consulta como page, pageSize, search, etc.
   * @returns {Promise<object>} - La respuesta de la API con productos, total, etc.
   */
  getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/products?${query}`);
  },

  /**
   * Obtiene un único producto por su ID.
   * @param {string} id - El ID del producto.
   * @returns {Promise<object>} - El producto encontrado.
   */
  getProductById(id) {
    return apiFetch(`/product-design/${id}`);
  },

  /**
   * Crea un nuevo producto.
   * @param {object} productData - Los datos del producto a crear.
   * @returns {Promise<object>} - El nuevo producto creado.
   */
  createProduct(productData) {
    return apiFetch('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  /**
   * Actualiza un producto existente.
   * @param {string} id - El ID del producto a actualizar.
   * @param {object} productData - Los nuevos datos del producto.
   * @returns {Promise<object>} - El producto actualizado.
   */
  updateProduct(id, productData) {
    return apiFetch(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  },

  /**
   * Elimina un producto.
   * @param {string} id - El ID del producto a eliminar.
   * @returns {Promise<null>} - No devuelve contenido.
   */
  deleteProduct(id) {
    return apiFetch(`/products/${id}`, {
      method: 'DELETE',
    });
  },

  // --- Component (Recipe) Management ---

  /**
   * Obtiene la lista de componentes (receta) de un producto.
   * @param {string} productId - El ID del producto padre.
   * @returns {Promise<Array<object>>} - La lista de componentes.
   */
  getComponents(productId) {
    return apiFetch(`/products/${productId}/components`);
  },

  /**
   * Añade un componente a la receta de un producto.
   * @param {string} productId - El ID del producto padre.
   * @param {string} componentId - El ID del producto que será el componente.
   * @param {number} quantity - La cantidad necesaria.
   * @returns {Promise<object>} - La nueva relación de componente creada.
   */
  addComponent(productId, { componentId, quantity }) {
    return apiFetch(`/products/${productId}/components`, {
      method: 'POST',
      body: JSON.stringify({ componentId, quantity }),
    });
  },

  /**
   * Elimina un componente de la receta de un producto.
   * @param {string} productId - El ID del producto padre.
   * @param {string} componentId - El ID del componente a eliminar.
   * @returns {Promise<null>}
   */
  removeComponent(productId, componentId) {
    return apiFetch(`/products/${productId}/components/${componentId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Obtiene una lista de todos los productos padre que usan un producto como componente.
   * @param {string} productId - El ID del producto componente.
   * @returns {Promise<Array<object>>} - Una lista de productos padre.
   */
  getWhereUsed(productId) {
    return apiFetch(`/products/${productId}/where-used`);
  },

  // --- Assembly (Recipe) Management ---

  /**
   * Gets the list of assembly jobs (assembly recipe) for a product.
   * @param {string} productId - The ID of the product.
   * @returns {Promise<Array<object>>} - The list of assigned assembly jobs.
   */
  getAssemblyJobs(productId) {
    return apiFetch(`/products/${productId}/assembly-jobs`);
  },
};
