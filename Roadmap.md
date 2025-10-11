# Roadmap del Proyecto: ZAP PWA

Este documento traza el plan de desarrollo para la PWA interna de ZAP y registra todos los cambios y decisiones importantes.

## 1. Fases del Proyecto

-   **Fase 1: Fundación y Modelo de Datos (Completada)**
    -   [x] Configuración inicial del entorno (Backend, Frontend, Docker).
    -   [x] Definición del esquema de la base de datos a partir de la información existente (`data.csv`).
    -   [x] Configuración completa del entorno de desarrollo con `docker-compose`.

-   **Fase 2: Módulo de Productos e Inventario (Completada)**
    -   [x] APIs CRUD para productos, categorías y proveedores.
    -   [x] Interfaces de usuario básicas para la gestión de productos, categorías y proveedores.
    -   [x] Lógica de control de stock definida.

-   **Fase 3: Módulo de Personal y Seguridad (Completada)**
    -   [x] API para la gestión de usuarios (CRUD).
    -   [x] Sistema de autenticación y roles (JWT).
    -   [x] Interfaz para la gestión de personal y seguridad.

-   **Fase 3.5: Mejora de UI/UX y Diseño del Sistema (Completada)**
    -   [x] Propuesta e implementación de un sistema de diseño básico (colores, tipografía).
    -   [x] Aplicación de estilos a la página de Login.

-   **Fase 3.6: Refactorización y Estabilización Técnica (Post-Auditoría - EN CURSO)**
    > *Esta fase se enfoca en resolver las deudas técnicas y los problemas arquitectónicos identificados durante la auditoría integral para asegurar una base de código robusta y escalable.*

    *   **Sub-fase 3.6.1: Corrección Crítica del Modelo de Datos y Backend**
        *   `[x]` **Acción (DB):** Migrar todos los campos monetarios y de cantidad (ej. `priceARS`, `stock`) de `Float` a `Decimal` en `schema.prisma` para garantizar la precisión financiera.
        *   `[x]` **Acción (DB):** Crear y ejecutar una nueva migración de base de datos para aplicar los cambios.
        *   `[x]` **Acción (Backend):** Actualizar el código del backend (API y scripts) que usa `parseFloat` para que sea compatible con el tipo `Decimal`.
        *   `[x]` **(NUEVO)** **Acción (DB):** Crear un script `export_products.js` para generar un `productos_maestros.csv` limpio desde la base de datos, estableciendo una nueva "fuente de verdad" para los datos de productos.

    *   **Sub-fase 3.6.2: Refactorización Arquitectónica del Backend (Completada)**
        *   `[x]` **Acción (Backend):** Reestructurar el archivo monolítico `index.js` en un directorio `routes/` con un archivo por cada recurso (`products.routes.js`, `users.routes.js`, etc.).
        *   `[x]` **Acción (Backend):** Implementar validación de `req.body` en todos los endpoints `POST` y `PUT` usando una librería como `zod`.

    *   **Sub-fase 3.6.3: Corrección y Refactorización del Frontend (Completada)**
        *   `[x]` **Acción (Frontend):** Corregir el uso de `authFetch` en `OverheadCostPage.jsx` y otros componentes para manejar la respuesta ya procesada, refactorizando a `apiFetch` en todas las páginas afectadas.
        *   `[x]` **Acción (Frontend):** Crear una capa de servicios (ej. `src/services/`) para centralizar todas las llamadas a la API.

-   **Fase 4: Módulo de Inventario Avanzado y Alertas (En Progreso)**
    -   [x] **Actualización del Modelo de Datos:** `type`, `lowStockThreshold`, `ProductComponent`, `InventoryMovement`.
    -   [x] **Lógica de Negocio y API:** Endpoints para Órdenes de Producción, Compras, Ventas, Anulaciones, y gestión de Lista de Materiales.
    -   [x] **Panel de Administración y Herramientas:**
        -   `[x]` Página base del Panel de Administración.
        -   `[x]` Herramienta de "Clasificación de Tipos de Producto".
        -   `[x]` **(Casi Completo)** Herramienta de "Gestión de Costos Indirectos".
            -   La funcionalidad está implementada. La tarea final para completarla es el bugfix de `authFetch` definido en la **Fase 3.6.3**.
    -   [x] **Interfaz de Usuario:** Historial de Movimientos, gestión de Lista de Materiales, UI para Órdenes de Producción y Compras.
    -   `[x]` **(NUEVO)** Implementar vista "Utilizado En" en la página de gestión de componentes.
    -   `[x]` **(NUEVO)** Implementar navegación recursiva (drill-down) en las recetas.

-   **Fase 5: Módulo de Armadores (Diseño Detallado)**
    > **Filosofía:** Gestionar el ciclo de vida completo de la producción externa con trazabilidad total y simplicidad para el operario.

    *   **5.1: Modelos de Datos y API Core (Rediseño Aprobado)**
        *   `[x]` **(REDISEÑO)** Modificar `schema.prisma`: `TrabajoDeArmado` pasa a ser un catálogo genérico y se crea la tabla intermedia `ProductoTrabajoArmado` (muchos a muchos).
        *   `[x]` Generar y ejecutar la nueva migración de base de datos.
        *   `[x]` **(REFACTOR)** Mover endpoints de `Armador` a su propio archivo de rutas para consistencia arquitectónica.
        *   `[x]` Implementar endpoints CRUD para el nuevo modelo `TrabajoDeArmado` (el "catálogo de trabajos").
        *   `[x]` Implementar endpoints para gestionar la asignación de trabajos a productos (la "receta de armado").

    *   **5.2: Flujo de Producción Externa y Lógica de Negocio**
        *   `[x]` **Creación de Orden (`SUPERVISOR`):**
            *   `[x]` El backend soporta modo "simulación" (`dry-run`) para calcular el plan de producción anidado sin afectar el inventario.
            *   `[x]` El backend soporta modo "confirmación" (`commit`) para ejecutar la transacción real de la orden.
            *   `[x]` La UI consulta al backend en modo "simulación" y muestra el "Plan de Producción Anidado" (materiales base, pasos de ensamblaje, costos).
            *   `[x]` La UI permite confirmar la orden, enviando la solicitud al backend en modo "confirmación".
            *   `[x]` El backend realiza un movimiento de inventario atómico (`SENT_TO_ASSEMBLER`) al confirmar la orden.
        *   `[x]` **Gestión de Errores (`SUPERVISOR`):**
            *   `[x]` (Backend) Permitir "Reasignar" una orden en estado `OUT_FOR_DELIVERY`.
            *   `[x]` (Backend) Permitir "Cancelar" una orden en estado `PENDING_DELIVERY`, lo que debe disparar una reversión automática del movimiento de inventario.
            *   `[x]` (UI) Implementar interfaz para "Reasignar" (modal de selección de empleado).
            *   `[x]` (UI) Implementar confirmación para "Cancelar" orden.
        *   `[ ]` **Recepción de Mercadería (`EMPLOYEE`):**
            *   La UI debe permitir al empleado registrar la cantidad *real* recibida.
            *   El backend debe incrementar el stock del producto terminado (`RECEIVED_FROM_ASSEMBLER`).
        *   `[ ]` **Liquidación de Pagos (`ADMIN`/`SUPERVISOR`):**
            *   La UI debe calcular automáticamente el monto a pagar a un armador basado en la cantidad de trabajos *recibidos* y sus precios.

    *   **5.3: Interfaz de Usuario y Experiencia por Rol**
        *   `[ ]` **`EMPLOYEE` (Repartidor):**
            *   UI móvil simple con "Mis Tareas" (Entregas/Recolecciones).
            *   Vista de detalle tipo checklist con botones de confirmación claros ("Entrega Completada", "No se pudo entregar").
        *   `[x]` **`SUPERVISOR` (Logística):**
            *   Panel de "Producción Externa" para monitorear órdenes en tiempo real.
            *   Filtros por estado (ej. "Pendiente de Entrega", "En Reparto", "Entrega Fallida").
            *   `[x]` Acciones directas (Asignar Reparto, Reasignar, Cancelar) integradas con la lógica de backend.
        *   `[ ]` **`ADMIN` (Finanzas):**
            *   `[x]` UI para gestionar el catálogo `TrabajoDeArmado`.
            *   UI para visualizar y registrar liquidaciones de pago.

-   **Fase 6: Funcionalidad Offline y PWA (Pendiente)**
    -   `[ ]` Implementar Service Workers para el funcionamiento offline.
    -   `[ ]` Asegurar que la aplicación sea instalable en dispositivos móviles y de escritorio.

-   **Fase 7: Despliegue y Pruebas (Pendiente)**
    -   `[ ]` **(NUEVO - Auditoría)** Reescribir `backend/Dockerfile` y `frontend/Dockerfile` usando builds multi-etapa para producción.
    -   `[ ]` **(NUEVO - Auditoría)** Crear un archivo `docker-compose.prod.yml` para despliegue.
    -   `[ ]` Desplegar la aplicación en un entorno de producción.
    -   `[ ]` Realizar pruebas con los colaboradores y recoger feedback.

-   **Fase 8: Mejoras Futuras y Escalabilidad (Pendiente)**
    -   `[ ]` **(NUEVO - Auditoría)** Mejorar la robustez de los CSV de importación añadiendo columnas explícitas de `Categoría` y `Tipo` para eliminar la lógica frágil basada en números de línea.
    -   `[ ]` **(NUEVO - Auditoría)** Implementar un sistema de notificaciones "toast" para mejorar el feedback al usuario.
    -   `[ ]` Implementar Registro de Auditoría (Audit Trail) para todas las modificaciones de datos.
    -   `[ ]` Desarrollar UI para la gestión dinámica de permisos por rol.
    -   `[ ]` Diseño de un "Dashboard" personalizado por rol.
    -   `[ ]` Desarrollar Calculadora de Estructura de Costos.

-   **Fase 9: Refactorización Arquitectónica (En Curso)**
    > *Esta fase se enfoca en mejorar la robustez y escalabilidad de la aplicación mediante la aplicación de patrones arquitectónicos profesionales.*

    *   **9.1: Centralización de la Conexión a Base de Datos (PrismaClient Único)**
        *   **Objetivo:** Asegurar que toda la aplicación use una única instancia de `PrismaClient` para una gestión eficiente de recursos y estabilidad.
        *   **Acciones:**
            *   Crear `backend/prisma/client.js` para exportar una instancia única de `PrismaClient`.
            *   Modificar `backend/index.js` para importar y usar `backend/prisma/client.js`.
            *   Modificar todos los archivos de rutas (`backend/routes/*.js`) para importar y usar `backend/prisma/client.js`.

    *   **9.2: Modularización Completa del Backend (Mover Rutas de `index.js`)**
        *   **Objetivo:** Descomponer el archivo `backend/index.js` en módulos de rutas dedicados para mejorar la organización y mantenibilidad.
        *   **Acciones:**
            *   Crear `backend/routes/overheadCosts.routes.js` y mover rutas de costos indirectos.
            *   Crear `backend/routes/productDesign.routes.js` y mover rutas de diseño de producto.
            *   Crear `backend/routes/auth.routes.js` y mover la ruta de login.
            *   Crear `backend/routes/users.routes.js` y mover rutas de usuarios.
            *   Crear `backend/routes/inventory.routes.js` y mover rutas de inventario.
            *   Actualizar `backend/index.js` para importar y montar todos los nuevos routers.

    *   **9.3: Validación Consistente de Entradas (Backend)**
        *   **Objetivo:** Implementar validación robusta para todas las entradas de la API.
        *   **Acciones:**
            *   Asegurar que todos los endpoints `POST` y `PUT` utilicen `zod` para validar `req.body`.

    *   **9.4: Gestión Centralizada de Errores y Logging Estructurado**
        *   **Objetivo:** Mejorar la capacidad de depuración y monitoreo de la aplicación.
        *   **Acciones:**
            *   Implementar una librería de logging (ej. Winston/Pino) para errores estructurados.
            *   Asegurar que los errores sean capturados y registrados de forma consistente.

    *   **9.5: Implementación del Entorno de Pruebas de Integración (Completo)**
        *   **Objetivo:** Crear una red de seguridad para detectar regresiones y verificar la funcionalidad del backend de forma automática.
        *   **Acciones:**
            *   `[x]` Instalar y configurar Jest y Supertest.
            *   `[x]` Modificar Docker Compose para soportar una base de datos de prueba aislada (`postgres-test`).
            *   `[x]` Crear un script de prueba que aplica migraciones y ejecuta los tests contra la base de datos de prueba.
            *   `[x]` Escribir y pasar el primer test de integración para el endpoint de productos.

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