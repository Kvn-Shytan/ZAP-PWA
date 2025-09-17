# Changelog (Registro de Cambios)

## 2025-09-17 (Continuación)

-   **Frontend (Autenticación):**
    -   Implementado `AuthContext` para gestión global de sesión.
    -   Desarrollada `LoginPage` para inicio de sesión.
    -   Creado `ProtectedRoute` para proteger rutas en el frontend.
    -   Integrado el flujo de autenticación en `main.jsx` y `App.jsx`.
    -   Corregidos componentes de listado (`ProductList`, `CategoryList`, `SupplierList`) para enviar token de autenticación.
    -   Corregido error de visualización de `priceARS` en `ProductList` para `ADMIN`.

## 2025-09-17

-   **Seguridad y Roles (Backend):**
    -   Implementado sistema de autenticación completo basado en JWT (`/login`).
    -   Añadido nuevo rol de usuario `SUPERVISOR`.
    -   Implementado un sistema de autorización granular y a nivel de campo para todos los endpoints de la API, definiendo permisos específicos para los roles `ADMIN`, `SUPERVISOR` y `EMPLOYEE`.
    -   Asegurado que la edición de `stock` es de solo lectura y que la visibilidad/edición de precios está restringida al `ADMIN`.
-   **Entorno y Depuración:**
    -   Solucionados múltiples problemas de configuración de Docker, incluyendo conflictos de puertos, volúmenes duplicados y estados inconsistentes del motor de Docker.
    -   Refactorizada la configuración de `docker-compose.yml` para consistencia y limpieza.
    -   Depurado y corregido error de inicialización en `index.js` (`ReferenceError`) moviendo los middlewares a la parte superior del archivo.
    -   Reemplazado `nodemon` por `node` en el comando de inicio del contenedor del backend para mayor estabilidad.

## 2025-09-15

-   **Backend API:**
    -   Se corrigió el problema de CORS para permitir la comunicación entre el frontend y el backend.
    -   Se corrigió el análisis de IDs enteros en los endpoints de la API para Categorías y Proveedores.
    -   Se completaron los endpoints de la API para proveedores (CRUD).
    -   Se completaron los endpoints de la API para categorías (CRUD).
    -   Se completaron los endpoints de la API para productos (CRUD).

-   **Frontend:**
    -   Se implementó y verificó la visualización de productos en el frontend.
    -   Se implementó y verificó la visualización de categorías en el frontend.
    -   Se implementó y verificó la visualización de proveedores en el frontend.
    -   Se configuró el enrutamiento básico del frontend con `react-router-dom` y se crearon páginas para la gestión de productos, categorías y proveedores.
