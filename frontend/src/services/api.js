const API_URL = 'http://localhost:3001/api';

// Función wrapper para fetch que centraliza la lógica de autenticación y errores.
export const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  // Si la sesión es inválida, deslogueamos al usuario.
  // Nota: Esto es una simplificación. En una app más compleja, se usaría un interceptor
  // que maneje el refresh token o un evento global para desloguear.
  if (response.status === 401) {
    // Dispara el evento global para que AuthContext maneje el logout.
    window.dispatchEvent(new CustomEvent('logout-request'));
    // Rechaza la promesa para detener la ejecución actual.
    throw new Error('Sesión expirada.');
  }

  if (response.status === 403) {
    // Lanza un error específico para que el componente que llama pueda manejarlo.
    const errorBody = await response.json().catch(() => ({ error: 'Acceso denegado.' }));
    throw new Error(errorBody.error || 'No tienes permiso para realizar esta acción.');
  }

  if (!response.ok) {
    // Intentar parsear el cuerpo del error, si falla, usar el texto de estado.
    const errorBody = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorBody.error || 'Ocurrió un error desconocido en la petición.');
  }

  // Si la respuesta no tiene contenido (ej. DELETE exitoso), devolver null.
  if (response.status === 204) {
    return null;
  }

  // De lo contrario, devolver el JSON.
  return response.json();
};
