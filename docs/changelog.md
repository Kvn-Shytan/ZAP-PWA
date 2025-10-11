# Changelog (Registro de Cambios)

## 2025-10-11
-   **[TEST] Implementación del Entorno de Pruebas de Integración:**
    -   Instalado y configurado `Jest` y `Supertest` para el backend.
    -   Añadido un servicio `postgres-test` en `docker-compose` para una base de datos de pruebas aislada.
    -   Creado un script `npm test` que prepara la base de datos de prueba (aplicando migraciones) y ejecuta los tests.
    -   Implementado el primer test para `GET /api/products` y verificado el funcionamiento de todo el flujo.
-   **[FIX] Refactorización de `PrismaClient` y `authMiddleware`:**
    -   Corregida la implementación del singleton de `PrismaClient` en `prisma/client.js` para prevenir la creación de múltiples instancias.
    -   Solucionado un error en el mock del middleware de autenticación en los tests para soportar `authorizeRole`.
    -   Corregidas importaciones faltantes de rutas en `index.js` descubiertas gracias a los tests.

## 2025-10-09
-   **[FEAT] Panel de Logística - Asignación de Órdenes:**
    -   Implementado un modal para asignar, reasignar y desasignar órdenes a repartidores.
    -   La lista de asignación ahora incluye roles `EMPLOYEE` y `SUPERVISOR`.
    -   Corregido un bug crítico que enviaba el ID de usuario como texto en lugar de número.
-   **[UX] Creación de Órdenes - Mejoras de Usabilidad:**
    -   Solucionado un problema en el campo "Cantidad" que impedía borrar el valor por defecto. Ahora el campo puede dejarse vacío temporalmente.
    -   Añadido un diálogo de confirmación (`window.confirm`) antes de crear una orden para prevenir envíos accidentales.
    -   Mejorada la simulación del plan de producción: ahora siempre se muestra, incluso si la cantidad es cero o si el stock es insuficiente.
-   **[FEAT] Creación de Órdenes - Visualización de Stock Insuficiente:**
    -   **Backend:** La API ahora devuelve el plan de producción junto con una lista de materiales con stock insuficiente, en lugar de devolver un error.
    -   **Frontend:** La interfaz ahora muestra una advertencia clara, resalta en rojo los materiales faltantes en el plan y especifica la cantidad necesaria vs. la disponible.
-   **[FIX] Historial de Inventario - Anulación de Movimientos:**
    -   Solucionado un bug crítico que permitía la duplicación de stock al anular movimientos generados por el sistema.
    -   Se deshabilitó el botón "Anular" para cualquier movimiento que sea parte de un evento (ej: creación/cancelación de órdenes), previniendo inconsistencias.
    -   Los movimientos generados por el sistema ahora se muestran en un color distinto para fácil identificación.

## 2025-10-08
-   **[FIX] Errores de `authFetch` y Refactorización a `apiFetch`:**
    -   Se corrigieron múltiples errores de `authFetch is not a function` en varias páginas del frontend.
    -   Se refactorizaron las siguientes páginas para utilizar la nueva función `apiFetch` centralizada:
        -   `PurchaseOrderPage.jsx` (Registrar Compra de Materia Prima)
        -   `InventoryHistoryPage.jsx` (Historial de Movimientos)
        -   `ProductionOrderPage.jsx` (Orden de Producción Interna)
        -   `UserManagementPage.jsx` (Gestión de Usuarios)
        -   `OverheadCostPage.jsx` (Gestionar Costos Indirectos)
        -   `ChangePasswordPage.jsx` (Cambiar Contraseña)
    -   Se corrigieron errores de compilación relacionados con rutas de importación y declaraciones duplicadas de estados durante el proceso de refactorización.
-   **[FIX] Módulo de Armadores - Funcionalidad CRUD:**
    -   Se corrigió el error `armadorService.create is not a function`.
    -   Se extendió `frontend/src/services/armadorService.js` para incluir los métodos `create`, `update` y `delete`, permitiendo la gestión completa de armadores.

## 2025-10-08
-   **[FEAT] Módulo de Armadores - Rediseño y Funcionalidad Central:**
    -   **Rediseño de DB:** `TrabajoDeArmado` transformado en catálogo genérico; creación de `ProductoTrabajoArmado` para relación N:M con `Product`.
    -   **Backend:**
        -   Endpoints CRUD para `TrabajoDeArmado` implementados.
        -   Endpoints para gestionar la asignación de `TrabajoDeArmado` a `Product` (receta de armado).
        -   Endpoints para listar, asignar y cancelar órdenes de producción externa.
        -   Lógica de "Producción Anidada Inteligente" implementada en el endpoint de creación de órdenes (`dry-run` y `commit`).
    -   **Frontend:**
        -   Servicios (`armadorService`, `trabajoDeArmadoService`, `externalProductionOrderService`) creados/actualizados.
        -   UI para gestionar el catálogo `TrabajoDeArmado` (CRUD).
        -   UI para crear órdenes de producción externa, incluyendo la visualización del "Plan de Producción Anidado".
-   **[REFACTOR] Modularización del Backend:**
    -   Endpoints de `Armador` movidos de `index.js` a `armadores.routes.js`.
-   **[CHORE] Documentación:**
    -   `Roadmap.md` actualizado con el flujo de trabajo detallado y las decisiones de diseño.


## 2025-10-07
-   **[REFACTOR] Modernización de Módulos Principales:**
    -   Se refactorizó por completo la arquitectura de los módulos de **Productos, Categorías y Proveedores**.
    -   **Backend:** Se modularizaron las rutas, moviéndolas desde el `index.js` monolítico a archivos dedicados (ej. `products.routes.js`).
    -   **Frontend:** Se implementó una nueva **capa de servicios** (`api.js`, `productService.js`, etc.), eliminando el antiguo hook `authFetch` y centralizando la lógica de llamadas a la API.
-   **[FEAT] Nuevas Funcionalidades de Usabilidad:**
    -   **Vista "Utilizado En":** Se implementó una nueva sección en la gestión de componentes que permite ver en qué recetas se utiliza una materia prima o un sub-ensamble.
    -   **Navegación Recursiva:** Se mejoró la página de gestión de componentes para permitir "bucear" en las recetas, convirtiendo los componentes en enlaces navegables.
-   **[FIX] Corrección de Bugs Críticos:**
    -   Solucionado el bug que impedía **crear nuevos productos** debido a un error de validación de datos nulos en el backend (`zod`).
    -   Solucionado el bug que impedía **cargar la página de gestión de componentes** ("Error al cargar la receta del producto").
    -   Solucionado el error de duplicación de rutas `/api/api/`.
-   **[CHORE] Mejoras Generales:**
    -   Se mejoró el mensaje de error al intentar eliminar un producto que es componente de otro, especificando la causa.
    -   Se corrigió la lógica de visualización del botón "Gestionar Componentes" para que sea accesible desde materias primas.

## 2025-10-05
-   **[FIX] Búsqueda de Componentes Crítica:**
    -   Corregido un bug crítico en la página "Gestionar Componentes" que impedía encontrar y añadir materias primas a la receta de un producto.
    -   La causa raíz era que la búsqueda se realizaba en una lista paginada e incompleta de solo 25 productos.
-   **[FEAT] Refactorización de Búsqueda a Nivel de Servidor:**
    -   Se refactorizó la página "Gestionar Componentes" para implementar una búsqueda dinámica y paginada del lado del servidor.
    -   La nueva interfaz ahora permite buscar en todo el catálogo de materias primas y productos pre-ensamblados de forma escalable, mejorando significativamente la experiencia de usuario y la robustez del sistema.
-   **[CHORE] Mantenimiento de Código y Datos:**
    -   Verificada y completada la migración de todos los campos monetarios y de cantidad a `Decimal` en la base de datos y el backend.
    -   Creado el script `export_products.js` para generar un archivo CSV maestro de productos desde la base de datos.

## 2025-10-01
-   **[FEAT] CRUD Completo de Armadores:**
    -   Implementada la página de "Gestión de Armadores" con funcionalidad completa de Crear, Leer, Actualizar y Eliminar (CRUD).
    -   Añadida lógica de permisos para que los `EMPLOYEE` solo puedan ver datos de contacto, mientras que `ADMIN` y `SUPERVISOR` tienen acceso a la gestión completa.
-   **[FEAT] Nueva Arquitectura de Costos:**
    -   Diseñada e implementada una nueva arquitectura para manejar costos no-físicos.
    -   Añadidos los modelos `TrabajoDeArmado`, `CostoIndirecto` y `ProductoCostoIndirecto` a la base de datos para permitir un cálculo de costos de producción más preciso y escalable.
-   **[FIX] Corrección de Múltiples Errores:**
    -   Solucionado error "Error desconocido" en la sección de Armadores (GET, POST, PUT, DELETE) causado por una duplicación del prefijo `/api/` en las llamadas del frontend.
    -   Implementado el endpoint `PUT /api/users/:id/reset-password` que faltaba en el backend, solucionando el error en la función de reseteo de contraseña de administrador.
-   **[CHORE] Mantenimiento de la Base de Datos y Datos:**
    -   Solucionado un estado de "deriva de migración" (migration drift) reseteando la base de datos y generando un historial de migración limpio y unificado.
    -   Implementado y ejecutado un script para actualizar y añadir productos masivamente desde un archivo CSV (`actualizacion_sept25.csv`) usando una estrategia `upsert`.

## 2025-09-27
-   **[FEAT] Nueva Página de Registro de Compras:**
    -   Creada la nueva sección "Registrar Compra" (`/purchase-order`), accesible para roles `ADMIN` y `SUPERVISOR`.
    -   La página permite registrar el ingreso de materia prima, actualizando el stock del producto correspondiente de forma atómica.
-   **[FIX] Corrección General de Llamadas a la API:**
    -   Refactorizadas las páginas `PurchaseOrderPage` y `ProductComponentsPage` para usar el hook centralizado `authFetch`, solucionando errores de carga de datos.
    -   Corregido el filtro por categoría en la lista de productos, que no se estaba aplicando en el backend.
    -   Arreglado un error en el texto del diálogo de confirmación de compra que mostraba `undefined` en lugar del código del producto.
-   **[UX] Mejoras en la Página de Compras:**
    -   El botón "Registrar Compra" ahora cambia de color a verde cuando está habilitado, mejorando la retroalimentación visual.
    -   Se añadió un diálogo de confirmación para prevenir registros accidentales.
    -   Al seleccionar un producto, ahora se muestra su unidad de medida (ej: "unidades", "mts") junto al campo de cantidad.

## 2025-09-26
-   **[FIX] Estabilización de la Aplicación:**
    -   Resolución de errores de duplicación de rutas `/api/api/` en llamadas del frontend (`ProductList.jsx`, `InventoryHistoryPage.jsx`, `ProductEditPage.jsx`, `ProductionOrderPage.jsx`).
    -   Corrección de `ReferenceError: paginationStyle is not defined` en `ProductList.jsx`.
    -   Manejo correcto de datos paginados de productos en `InventoryHistoryPage.jsx` y `ProductEditPage.jsx`.
-   **[FEAT] Mejoras en la Página de Órdenes de Producción (`ProductionOrderPage.jsx`):**
    -   Tabla de productos fabricables mejorada: ahora muestra "Código", "Descripción", "Tipo" y "Stock".
    -   Implementación de verificación dinámica de stock de componentes:
        -   Advertencia para productos sin componentes definidos.
        -   Resaltado en rojo de componentes con stock insuficiente.
        -   Habilitación condicional del botón "Registrar Producción" según disponibilidad de stock.

## 2025-09-21
-   **Gestión de Lista de Materiales (Recetas):**
    -   Añadida nueva sección "Lista de componentes" en la página de edición de productos, visible solo para productos pre-ensamblados o finales.
    -   Implementada la funcionalidad completa (Backend y Frontend) para añadir y quitar componentes de la lista, respetando los permisos por rol.
    -   Corregido un error en el campo de cantidad para que solo acepte números enteros.

## 2025-09-20
-   **Gestión de Productos y Filtros (UI):**
    -   Implementada una interfaz de usuario completa para la gestión de productos (CRUD).
    -   Añadido formulario para crear y editar productos, incluyendo los nuevos campos `type` y `lowStockThreshold`.
    -   Añadida la funcionalidad para eliminar productos (restringido a `ADMIN`) desde la página de edición.
    -   Incorporados filtros dinámicos por texto (código/descripción) y por categoría en la lista de productos.
    -   Refactorizado el componente `ProductList` para un código más limpio y mantenible.

## 2025-09-19
-   **Módulo de Inventario Avanzado (Backend):**
    -   Actualizado el esquema de la base de datos para soportar tipos de producto, listas de materiales y movimientos de inventario detallados.
    -   Implementado endpoint `POST /inventory/production` para registrar órdenes de producción de forma atómica.
    -   Implementado endpoint `POST /inventory/purchase` para registrar compras a proveedores.
    -   Implementado endpoint `POST /inventory/sale` para registrar ventas.
    -   Implementado endpoint `POST /inventory/reversal` para anular movimientos mediante contra-asientos.
    -   Implementado endpoint `GET /inventory/low-stock` para obtener productos con bajo stock.
    -   Implementado endpoint `PUT /inventory/low-stock-threshold` para configurar umbrales de alerta.
-   **Funcionalidades de Usuario:**
    -   Implementada gestión completa de usuarios (CRUD) en el frontend y backend.
    -   Corregida la creación de usuarios sin rol (ahora por defecto `NO_ROLE`).
    -   Implementada funcionalidad de reinicio de contraseña por Admin (`zap123` por defecto).
    -   Implementada funcionalidad de cambio de contraseña por el propio usuario.
-   **Estabilidad y Corrección de Errores:**
    -   Solucionado el error `JWT_SECRET not defined` en el backend (configuración de `.env` y `docker-compose`).
    -   Corregido el error de `Router` anidado en el frontend (`App.jsx`).
    -   Solucionado el problema de pantalla en blanco y contenido no mostrado (corrección de `ProtectedRoute.jsx`).
    -   Corregida regresión de UI en página de Login (eliminación de cabecera no deseada).
    -   Optimizada la carga de variables de entorno en Docker Compose.
    -   Mejorada la fiabilidad del middleware de autenticación (`authenticateToken`).

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
