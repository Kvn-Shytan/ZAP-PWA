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
        -   **4.5. Panel de Administración y Herramientas (Nuevo)**
            -   `[x]` **Prioridad 1.A:** Crear la página base para el "Panel de Administración" (ruta `/admin-tools`), visible solo para `ADMIN`. Este panel unificará herramientas y futuras notificaciones.
            -   `[x]` **Prioridad 1.B:** Desarrollar e integrar la herramienta de **"Clasificación de Tipos de Producto"**:
                -   `[x]` (BD) Añadir el campo `isClassified` al modelo `Product` y ejecutar la migración.
                -   `[x]` (Backend) Crear el endpoint para obtener productos no clasificados (`isClassified: false`).
                -   `[x]` (Backend) Ajustar el endpoint de actualización para que establezca `isClassified` en `true`.
                -   `[x]` (Frontend) Construir la interfaz de la herramienta de clasificación dentro del nuevo panel.
    -   **4.2. Lógica de Negocio y API (Backend)**
        -   [x] Crear endpoint para registrar "Órdenes de Producción" (gestionando `PRODUCTION_IN` y `PRODUCTION_OUT`).
        -   [x] Crear endpoints para registrar `COMPRAS` y `VENTAS` (restringidos por rol).
        -   [x] Crear endpoint para "Anular" movimientos (lógica de contra-asiento).
        -   [x] Crear endpoint para obtener la lista de productos con bajo stock.
        -   [x] Crear endpoint para que el Admin actualice el `lowStockThreshold` de un producto.
        -   [x] **(Completado)** Crear endpoints para gestionar la Lista de Materiales (Añadir, Actualizar, Quitar).
        -   [x] **(Mejora)** Añadida validación para prevenir que un producto sea componente de sí mismo.
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

-   **Fase 5: Módulo de Armadores (Diseño Detallado)**

    > **Filosofía:** Gestionar el ciclo de vida completo de la producción externa, desde la asignación de materiales a un repartidor, la entrega al armador, la gestión de fallos, y la recepción de productos terminados, hasta el pago final.

    ### **5.1: Modelos de Datos y API Core**
    *   **5.1.1. `schema.prisma` (Nuevos Campos y Estados):**
        *   [x] En `ExternalProductionOrder`, añadir `deliveryUserId: Int?` para la asignación explícita a un empleado repartidor.
        *   [x] En `User`, añadir la relación inversa `assignedDeliveries`.
        *   [x] Ampliar el `enum ExternalProductionOrderStatus` para incluir: `PENDING_DELIVERY`, `OUT_FOR_DELIVERY`, `DELIVERED`, `DELIVERY_FAILED`, `RETURNED`.
        *   [x] **(Realizado)** Crear modelos `Armador`, `TrabajoDeArmado`, `ExternalProductionOrder`, `ExternalProductionOrderItem`, `ReceivedProduction`, `AssemblerPayment`.
        *   [x] **(Realizado)** Ejecutar la migración de la base de datos.

    *   **5.1.2. API (Endpoints de Gestión):**
        *   [x] **(Realizado)** Implementar endpoints CRUD para `Armador` con seguridad a nivel de campo para `EMPLOYEE`.
        *   [ ] Implementar endpoints CRUD para `TrabajoDeArmado` (precio por armado de cada producto).
        *   [ ] Implementar endpoint `PUT /api/external-production-orders/:id/assign` para que el `SUPERVISOR` asigne un pedido a un `EMPLOYEE`.
        *   [ ] Implementar endpoint `POST /api/external-production-orders/:id/deliver` para que el `EMPLOYEE` confirme una entrega exitosa.
        *   [ ] Implementar endpoint `POST /api/external-production-orders/:id/fail-delivery` para que el `EMPLOYEE` reporte una entrega fallida.
        *   [ ] Implementar endpoint `POST /api/external-production-orders/:id/confirm-return` para que el `SUPERVISOR` confirme la devolución de mercadería y se revierta el stock automáticamente.

    ### **5.2: Interfaz de Usuario y Experiencia por Rol**

    *   **5.2.1. Funcionalidades para `EMPLOYEE` (Repartidor):**
        *   [ ] **Pantalla Principal ("Mis Entregas"):** Al iniciar sesión, ver una lista de los pedidos que tiene asignados para el día, con nombre y dirección del armador.
        *   [ ] **Pantalla de Detalle de Entrega:**
            *   Ver detalles del armador (dirección con enlace a mapas, teléfono con botón de llamada).
            *   Ver lista de materiales a entregar.
            *   Botón "Entregado" (con doble confirmación) para registrar una entrega exitosa.
            *   Botón "No Entregado" (con doble confirmación) para reportar un fallo.

    *   **5.2.2. Funcionalidades para `SUPERVISOR` (Control Logístico):**
        *   [ ] **Panel de Control ("Producción Externa"):** Ver una tabla con todos los pedidos, con filtros avanzados por estado, empleado, armador y fechas.
        *   [ ] **Acciones de Gestión:**
            *   Crear nuevos envíos a armadores.
            *   Asignar pedidos pendientes a un empleado repartidor.
            *   Gestionar entregas fallidas: Ver la alerta y tener un botón para "Confirmar Devolución a Stock", que revierte la operación.

    *   **5.2.3. Funcionalidades para `ADMIN` (Finanzas):**
        *   [x] **Gestión de Armadores:** Interfaz para crear, editar y eliminar los `Armador` y sus datos de contacto.
        *   [ ] **Gestión de Trabajos de Armado:** Interfaz para crear, editar y eliminar los `TrabajoDeArmado` y sus precios.
        *   [ ] **Gestión de Pagos:** Interfaz para calcular los montos adeudados a los armadores (basado en `ReceivedProduction` y `TrabajoDeArmado.precio`) y registrar los pagos.

    ### **5.4: Arquitectura de Costos Avanzada (Diseño)**
    *   `[x]` **Decisión Arquitectónica:** Separar costos no-físicos (servicios, horas-máquina) del modelo `Product` para mantener la integridad de los datos.
    *   [ ] **Modelo `CostoIndirecto`:** Crear un nuevo modelo para catalogar costos como "Horas de Máquina" (ej: `HS-`). Incluirá `nombre`, `precio`, `unidad` y un `tipo` (ej: `MACHINE_HOUR`, `SERVICE`).
    *   [ ] **Modelo `ProductoCostoIndirecto`:** Crear una tabla de conexión para aplicar estos costos a la "receta" de un producto terminado, especificando la cantidad (ej: 0.5 horas).
    *   [ ] **Plan de Migración de Datos (Futuro):** Añadir a la lista de tareas la creación de una herramienta de administrador para migrar los datos de los antiguos productos `AR-` y `HS-` a las nuevas tablas (`TrabajoDeArmado` y `CostoIndirecto`) y posteriormente eliminarlos de la tabla `Product`.

-   **Fase 6: Funcionalidad Offline y PWA (Pendiente)**
    -   [ ] Implementar Service Workers para el funcionamiento offline.
    -   [ ] Asegurar que la aplicación sea instalable en dispositivos móviles y de escritorio.

-   **Fase 7: Despliegue y Pruebas (Pendiente)**
    -   [ ] Desplegar la aplicación en un entorno de producción.
    -   [ ] Realizar pruebas con los colaboradores y recoger feedback.

-   **Fase 8: Mejoras Futuras y Escalabilidad (Pendiente)**
    -   [ ] Implementar Registro de Auditoría (Audit Trail) para todas las modificaciones de datos.
    -   [ ] Opcional: Desarrollar UI para la gestión dinámica de permisos por rol.
    -   [ ] **Desarrollo de Herramientas Adicionales para el Panel de Administración:**
        -   `[ ]` **(NUEVO)** Diseño de una "Sección de Inicio" personalizada por rol (Dashboard) para mostrar tareas y alertas relevantes.
        -   `[ ]` **(NUEVO)** Calculadora de Estructura de Costos (para análisis de rentabilidad).
        -   `[ ]` Herramientas de Calidad de Datos (Detector de Duplicados, Editor Masivo, Visor de Huérfanos).
        -   `[ ]` Sistema de Notificaciones y Alertas dentro del panel.

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