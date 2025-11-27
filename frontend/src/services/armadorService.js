import { apiFetch } from './api';

export const armadorService = {
  /**
   * Obtiene una lista de todos los armadores.
   * La API aplica seguridad a nivel de campo según el rol del usuario.
   * @returns {Promise<Array<object>>} - La lista de armadores.
   */
  getArmadores() {
    return apiFetch('/assemblers');
  },

  /**
   * Crea un nuevo armador.
   * @param {object} assemblerData - Los datos del nuevo armador.
   * @returns {Promise<object>} - El armador creado.
   */
  create(assemblerData) {
    return apiFetch('/assemblers', {
      method: 'POST',
      body: JSON.stringify(assemblerData),
    });
  },

  /**
   * Actualiza un armador existente.
   * @param {string} id - El ID del armador a actualizar.
   * @param {object} assemblerData - Los datos actualizados del armador.
   * @returns {Promise<object>} - El armador actualizado.
   */
  update(id, assemblerData) {
    return apiFetch(`/assemblers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(assemblerData),
    });
  },

  /**
   * Elimina un armador existente.
   * @param {string} id - El ID del armador a eliminar.
   * @returns {Promise<void>} - Promesa que resuelve cuando el armador es eliminado.
   */
  delete(id) {
    return apiFetch(`/assemblers/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Obtiene el historial de pagos a armadores.
   * @param {URLSearchParams} queryParams - Los parámetros de consulta para filtrar y paginar.
   * @returns {Promise<object>} - Un objeto con los datos de los pagos y la paginación.
   */
  getPaymentHistory(queryParams) {
    return apiFetch(`/assemblers/payments?${queryParams.toString()}`);
  },
};
