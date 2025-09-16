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
    -   [ ] Implementar lógica de control de stock (aumentar/disminuir). **(Se abordará después de la gestión de usuarios)**

-   **Fase 3: Módulo de Personal (En Progreso)**
    -   [ ] Crear API para la gestión de colaboradores (usuarios). **(Próxima tarea)**
    -   [ ] Implementar sistema de autenticación y roles.
    -   [ ] Desarrollar interfaz para la gestión de personal.

-   **Fase 4: Funcionalidad Offline y PWA**
    -   [ ] Implementar Service Workers para el funcionamiento offline.
    -   [ ] Asegurar que la aplicación sea instalable en dispositivos móviles y de escritorio.

-   **Fase 5: Despliegue y Pruebas**
    -   [ ] Desplegar la aplicación en un entorno de producción.
    -   [ ] Realizar pruebas con los colaboradores y recoger feedback.

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