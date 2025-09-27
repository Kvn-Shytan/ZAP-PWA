# Roadmap del Proyecto: ZAP PWA

Este documento traza el plan de desarrollo para la PWA interna de ZAP y registra todos los cambios y decisiones importantes.

## 1. Fases del Proyecto

-   **Fase 1: Fundación y Modelo de Datos (Completada)**
    -   [x] Configuración inicial del entorno (Backend, Frontend, Docker).
    -   [x] Definición del esquema de la base de datos a partir de la información existente (`data.csv`).
    -   [x] Configuración completa del entorno de desarrollo con `docker-compose`.

-   **Fase 2: Módulo de Productos e Inventario**
    -   **Crear API para productos (CRUD):**
    -   [x] `POST /products` - Crear un nuevo producto.
    -   [x] `GET /products` - Obtener una lista de todos los productos.
    -   [x] `GET /products/:id` - Obtener un solo producto por su ID.
    -   [x] `PUT /products/:id` - Actualizar un producto.
    -   [x] `DELETE /products/:id` - Eliminar un producto.
    -   **Crear API para categorías (CRUD):**
    -   [x] `POST /categories` - Crear una nueva categoría.
    -   [x] `GET /categories` - Obtener una lista de todas las categorías.
    -   [x] `GET /categories/:id` - Obtener una sola categoría por su ID.
    -   [x] `PUT /categories/:id` - Actualizar una categoría.
    -   [x] `DELETE /categories/:id` - Eliminar una categoría.
    -   **Crear API para proveedores (CRUD):**
    -   [x] `POST /suppliers` - Crear un nuevo proveedor.
    -   [x] `GET /suppliers` - Obtener una lista de todos los proveedores.
    -   [x] `GET /suppliers/:id` - Obtener un solo proveedor por su ID.
    -   [x] `PUT /suppliers/:id` - Actualizar un proveedor.
    -   [x] `DELETE /suppliers/:id` - Eliminar un proveedor.
    -   [x] Desarrollar interfaz de usuario para la gestión de productos (enrutamiento básico y páginas placeholder).
    -   [x] Implementar y verificar la visualización de productos en el frontend.
    -   [x] Implementar y verificar la visualización de categorías en el frontend.
    -   [x] Implementar y verificar la visualización de proveedores en el frontend.
    -   [x] Lógica de control de stock definida y planificada.

-   **Fase 3: Módulo de Personal y Seguridad (Completada)**
    -   [x] Crear API para la gestión de colaboradores (usuarios) (CRUD).
    -   [x] Implementar sistema de autenticación y roles (JWT).
    -   [x] Definir y aplicar matriz de permisos granulares para todos los endpoints.
    -   [x] Desarrollar interfaz para la gestión de personal (Login, Protección de Rutas, Gestión de Usuarios, Cambio de Contraseña).
    -   [x] Implementar gestión completa de usuarios (CRUD, reinicio de contraseña por Admin, cambio de contraseña por usuario).

-   **Fase 3.5: Mejora de UI/UX y Diseño del Sistema (Completada)**
    -   [x] Análisis de activos de marca ZAP (PDF de bolsas, logos JPG).
    -   [x] Propuesta de sistema de diseño UI/UX (paleta de colores, tipografía, espaciado).
    -   [x] Implementación de variables CSS para el sistema de diseño.
    -   [x] Aplicación de estilos iniciales y logo ZAP en la página de Login.
    -   [x] Verificación de la nueva UI de la página de Login.
    -   [x] Corregir regresiones de UI en página de Login y navegación.

-   **Fase 4: Módulo de Inventario Avanzado y Alertas (En Progreso)**
    -   **4.1. Actualización del Modelo de Datos (Backend)**
        -   [x] En `schema.prisma`, añadir el campo `type` (RAW_MATERIAL, PRE_ASSEMBLED, FINISHED) al modelo `Product`.
        -   [x] En `schema.prisma`, añadir el campo `lowStockThreshold` al modelo `Product`.
        -   [x] En `schema.prisma`, crear el modelo `ProductComponent` para la "Lista de Materiales".
        -   [x] En `schema.prisma`, refinar el modelo `InventoryMovement` con un `enum MovementType`.
        -   [x] Ejecutar la migración de la base de datos para aplicar los cambios.
        -   [ ] **(Nuevo)** Crear una herramienta o script para asignar masivamente el `ProductType` a los productos existentes.
    -   **4.2. Lógica de Negocio y API (Backend)**
        -   [x] Crear endpoint para registrar "Órdenes de Producción" (gestionando `PRODUCTION_IN` y `PRODUCTION_OUT`).
        -   [x] Crear endpoints para registrar `COMPRAS` y `VENTAS` (restringidos por rol).
        -   [x] Crear endpoint para "Anular" movimientos (lógica de contra-asiento).
        -   [x] Crear endpoint para obtener la lista de productos con bajo stock.
        -   [x] Crear endpoint para que el Admin actualice el `lowStockThreshold` de un producto.
        -   [x] **(Nuevo)** Crear endpoints para gestionar la Lista de Materiales (Añadir, Actualizar, Quitar).
    -   **4.3. Interfaz de Usuario (Frontend)**
        -   [x] **(Nuevo)** Crear página "Historial de Movimientos" para ver, filtrar y buscar en todos los movimientos de inventario.
        -   [x] **(Nuevo)** En el historial, implementar el botón "Anular" (visible según rol).
        -   [x] **(Nuevo)** En el historial, resaltar en rojo los movimientos de anulación/corrección.
        -   [x] **(Nuevo)** Añadir filtros por búsqueda y categoría a la lista de productos.
        -   [x] Actualizar UI de creación/edición de Productos para incluir `type` y `lowStockThreshold`.
        -   [x] **(Nuevo)** Implementar la funcionalidad de Eliminar un producto en la UI (restringido a ADMIN).
        -   [x] **(Nuevo)** Desarrollar UI para gestionar la "Lista de Materiales" de un producto (añadir/quitar componentes).

    -   **4.4. Interfaces de Gestión de Inventario (Nuevo)**
        -   [x] **Prioridad 1:** Crear UI para registrar "Órdenes de Producción Interna" (con verificación dinámica de stock de componentes, alertas de insuficiencia y validación de disponibilidad).
        -   [x] **Prioridad 2:** Crear UI para registrar "Compras a Proveedores" (Ingreso de Materia Prima).

-   **Fase 5: Módulo de Armadores (Pendiente)**
    -   [ ] **Prioridad 3:** Diseñar e implementar el flujo completo de "Producción Externa" (modelos de datos, API y UI para Envíos y Recepciones).
    -   [ ] Gestionar pagos a armadores con cierres quincenales.

-   **Fase 6: Funcionalidad Offline y PWA (Pendiente)**
    -   [ ] Implementar Service Workers para el funcionamiento offline.
    -   [ ] Asegurar que la aplicación sea instalable en dispositivos móviles y de escritorio.

-   **Fase 7: Despliegue y Pruebas (Pendiente)**
    -   [ ] Desplegar la aplicación en un entorno de producción.
    -   [ ] Realizar pruebas con los colaboradores y recoger feedback.

-   **Fase 8: Mejoras Futuras y Escalabilidad (Pendiente)**
    -   [ ] Implementar Registro de Auditoría (Audit Trail) para todas las modificaciones de datos.
    -   [ ] Opcional: Desarrollar UI para la gestión dinámica de permisos por rol.

---

## 2. Changelog (Registro de Cambios)

-   **2025-09-15:**
    -   Se actualizó el roadmap para priorizar la gestión de usuarios antes de la lógica de stock.
    -   Se completó la importación inicial de datos (productos y categorías) a través del script de seeding de Prisma.
    -   Se verificó la visualización de productos y categorías en el frontend.
    -   Se implementó y verificó la visualización de proveedores en el frontend.
    -   Se corrigió el problema de CORS para permitir la comunicación entre el frontend y el backend.
    -   Se corrigió el análisis de IDs enteros en los endpoints de la API para Categorías y Proveedores.
    -   Se completaron los endpoints de la API para proveedores (CRUD).
    -   Se completaron los endpoints de la API para categorías (CRUD).
    -   Se completaron los endpoints de la API para actualizar (`PUT /products/:id`) y eliminar (`DELETE /products/:id`) productos.

-   **2025-09-15:**
    -   Se configuró el enrutamiento básico del frontend con `react-router-dom` y se crearon páginas placeholder para la gestión de productos.

-   **2025-09-15:**
    -   Se analizó el archivo `data.csv` y se diseñó un nuevo modelo de datos relacional.
    -   Se actualizó el `schema.prisma` con los nuevos modelos (`Product`, `Category`, `Supplier`, `User`, `InventoryMovement`).
    -   Se ejecutó la migración inicial de la base de datos para crear las tablas.

-   **2025-09-14:**
    -   Se estableció la estructura inicial del proyecto con directorios para `frontend` y `backend`.
    -   Se configuró `docker-compose` con el servicio de base de datos (PostgreSQL).
    -   Se discutió la necesidad de un modelo de datos profesional.
    -   El usuario proporcionó la base de datos existente en formato `data.csv`.
    -   Se acordó crear este `Roadmap.md` para documentar el progreso.
    -   Se movió la estructura del proyecto al directorio `PWA ZAP`.