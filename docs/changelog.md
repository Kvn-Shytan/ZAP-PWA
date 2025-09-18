# Changelog (Registro de Cambios)

## 2025-09-18
-   **UI/UX - Página de Login:**
    -   Se movió la carpeta `assets` a `frontend/src/assets` para una mejor organización.
    -   Se actualizó la ruta de importación del logo en `LoginPage.jsx`.
    -   Se implementó la imagen de fondo (`Fondo login PWA.png`) y el nuevo logo (`LogoZap - login PWA.png`) en la página de Login.
    -   Se corrigió el nombre del archivo del logo para coincidir con la importación.
    -   Se ajustó el tamaño del logo para que sea adaptable y mantenga su proporción (`width: 80%, maxWidth: 450px, height: auto`).
    -   Se refactorizó el layout de `LoginPage.jsx` utilizando la técnica del espaciador flexible (`flex-grow: 1`) para asegurar que todo el contenido (logo, título, formulario) sea visible en pantalla sin scroll, adaptándose a diferentes tamaños de pantalla.
    -   Se movió la leyenda "Iniciar Sesión" para que quede justo encima del formulario.
    -   Se neutralizó la regla `#root` en `App.css` para evitar conflictos de layout globales, asegurando que la aplicación ocupe el 100% del ancho y alto disponible sin padding ni márgenes externos.

## 2025-09-17 (Continuación)

-   **Frontend (Autenticación):**
    -   Implementado `AuthContext` para gestión global de sesión.
    -   Desarrollada `LoginPage` para inicio de sesión.
    -   Creado `ProtectedRoute` para proteger rutas en el frontend.
    -   Integrado el flujo de autenticación en `main.jsx` y `App.jsx`.
    -   Corregidos componentes de listado (`ProductList`, `CategoryList`, `SupplierList`) para enviar token de autenticación.
    -   Corregido error de visualización de `priceARS` en `ProductList` para `ADMIN`.
-   **UI/UX y Diseño del Sistema:**
    -   Análisis de activos de marca ZAP (PDF de bolsas, logos JPG) para definir la estética.
    -   Implementación de variables CSS para la paleta de colores y escala de espaciado en `frontend/src/index.css`.
    -   Aplicación de estilos iniciales y logo ZAP en `frontend/src/pages/LoginPage.jsx`.
    -   **PENDIENTE:** Verificación de la nueva UI de la página de Login.
-   **Gestión de Usuarios (Frontend):**
    -   Se añadió el enlace de navegación "Usuarios" en `App.jsx`, visible para roles `ADMIN` y `SUPERVISOR`.
    -   Se creó la ruta `/users` en `App.jsx` para la página de gestión de usuarios.
    -   Se creó un componente placeholder `UserManagementPage.jsx` para la gestión de usuarios.

## 2025-09-17
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
