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
    -   `[x]` **(NUEVO)** Mejoras en UI/UX del Historial de Movimientos:
        -   `[x]` Lógica de botón "Anular" refinada para mostrar solo en movimientos `PRODUCTION_IN` de eventos de producción interna.
        -   `[x]` Estilos visuales para movimientos de Compra (verde) y Órdenes de Producción Externa (azul).
        -   `[x]` Refinamiento del filtro por tipos con etiquetas amigables y nuevos tipos de movimiento.
    -   `[x]` **(NUEVO)** Enlace a Órdenes de Producción Externa en Historial de Movimientos:
        -   `[x]` Modificar `InventoryMovement` en `schema.prisma` para incluir `externalProductionOrderId`.
        -   `[x]` Actualizar creación de movimientos `SENT_TO_ASSEMBLER` y `RECEIVED_FROM_ASSEMBLER` para usar el nuevo campo.
        -   `[x]` Modificar endpoint `/inventory/movements` para incluir `ExternalProductionOrder` en la respuesta.
        -   `[x]` Actualizar `InventoryHistoryPage.jsx` para mostrar `orderNumber` como enlace a la página de detalle de la orden.
    -   `[x]` **(NUEVO)** Restauración de la funcionalidad de Notas de Orden (OrderNote):
        -   `[x]` Reintroducción del modelo `OrderNote` en `schema.prisma` y sus relaciones inversas.
        -   `[x]` Restauración del bloque de creación de `OrderNote` en el endpoint `POST /external-production-orders/:id/receive`.
        -   `[x]` Verificación de la inclusión de `orderNotes` en el endpoint `GET /external-production-orders/:id`.

-   **Fase 5: Módulo de Armadores (Diseño Detallado)**
    > **Filosofía:** Gestionar el ciclo de vida completo de la producción externa con trazabilidad total y simplicidad para el operario.

    *   **5.1: Modelos de Datos y API Core (Rediseño Aprobado)**
        *   `[x]` **(REDISEÑO)** Modificar `schema.prisma`: `TrabajoDeArmado` pasa a ser un catálogo genérico y se crea la tabla intermedia `ProductoTrabajoArmado` (muchos a muchos).
        *   `[x]` **(NUEVO)** Rediseñar el flujo de estados (`ExternalProductionOrderStatus`) y el manejo de productos esperados (nuevo modelo `ExpectedProduction`).
            *   Ahora incluye `quantityReceived` en `ExpectedProduction` y el estado `PARTIALLY_RECEIVED`.
        *   `[x]` Generar y ejecutar la nueva migración de base de datos para aplicar los cambios.
            *   Incluye migraciones para `OrderAssemblyStep`, `quantityReceived` y `PARTIALLY_RECEIVED`.
        *   `[x]` **(REFACTOR)** Mover endpoints de `Armador` a su propio archivo de rutas para consistencia arquitectónica.
        *   `[x]` Implementar endpoints CRUD para el nuevo modelo `TrabajoDeArmado` (el "catálogo de trabajos").
        *   `[x]` Implementar endpoints para gestionar la asignación de trabajos a productos (la "receta de armado").

    *   **5.2: Flujo de Producción Externa y Lógica de Negocio**
        *   `[x]` **Creación de Orden (`SUPERVISOR`):**
            *   `[x]` El backend soporta modo "simulación" (`dry-run`) para calcular el plan de producción anidado sin afectar el inventario.
                *   Ahora soporta `includeSubAssemblies` y devuelve un plan anidado.
            *   `[x]` El backend soporta modo "confirmación" (`commit`) para ejecutar la transacción real de la orden.
                *   Ahora guarda `OrderAssemblyStep` y `ExpectedProduction` al confirmar.
            *   `[x]` **(NUEVO)** El backend genera un número de orden secuencial y legible (ej. `OE-251021-0001`) al crear la orden.
        *   `[x]` **(NUEVO) Backend: Máquina de Estados de la Orden:**
            *   `[x]` Implementado endpoint `confirm-delivery` (OUT_FOR_DELIVERY -> IN_ASSEMBLY).
            *   `[x]` Implementado endpoint `report-failure` (OUT_FOR_DELIVERY -> DELIVERY_FAILED).
            *   `[x]` Implementado endpoint `confirm-assembly` (IN_ASSEMBLY -> PENDING_PICKUP).
            *   `[x]` Implementado endpoint `assign-pickup` (PENDING_PICKUP -> RETURN_IN_TRANSIT).
                *   Ahora permite el estado `PARTIALLY_RECEIVED`.
        *   `[x]` **Gestión de Errores (`SUPERVISOR`):**
            *   `[x]` (Backend) Permitir "Reasignar" una orden en estado `OUT_FOR_DELIVERY`.
            *   `[x]` (Backend) Permitir "Cancelar" una orden en estado `PENDING_DELIVERY`, lo que debe disparar una reversión automática del movimiento de inventario.
            *   `[x]` (UI) Implementar interfaz para "Reasignar" (modal de selección de empleado).
            *   `[x]` (UI) Implementar confirmación para "Cancelar" orden.
                    *   `[x]` **Recepción de Mercadería (`EMPLOYEE`):**
                        *   `[x]` La UI permite al empleado registrar la cantidad *real* recibida.
                            *   Implementado flujo completo de recepción parcial (DB, API, Frontend).
                            *   Backend valida cantidad, actualiza `quantityReceived`, crea `InventoryMovement`, establece `PARTIALLY_RECEIVED` o `COMPLETED`.
                            *   Frontend modal muestra esperado/recibido/pendiente, limita la entrada.
                        *   `[x]` **(MEJORA UX)** Rediseño del Paso 2 del modal de recepción con botones de acción claros ("Entrega Parcial", "Entrega con Devoluciones", "Otro Motivo") y doble confirmación.        *   `[x]` **Liquidación de Pagos (`ADMIN`/`SUPERVISOR`):**
            *   La UI debe calcular automáticamente el monto a pagar a un armador basado en la cantidad de trabajos *recibidos* y sus precios.

        *   **5.3: Interfaz de Usuario y Experiencia por Rol (Completada)**

            *   **NOTA:** La refactorización principal de la UI/UX se moverá a la Fase 11.

            *   `[x]` **`EMPLOYEE` (Repartidor):**

                *   `[x]` (Backend) Implementada la lógica de datos para el dashboard de "Mis Tareas" (Entregas/Recolecciones).

                *   `[x]` (NUEVO) La vista de detalle de orden ahora muestra la dirección y teléfono del armador para facilitar la entrega.

                *   `[x]` (Frontend) Refinar la UI del dashboard para una experiencia móvil óptima.

                *   `[x]` Vista de detalle tipo checklist con botones de confirmación claros ("Entrega Completada", "No se pudo entregar").

            *   `[x]` **`SUPERVISOR` (Logística):**

                *   `[x]` **Panel de "Producción Externa" Mejorado:**

                    *   `[x]` Implementar filtros en el servidor por rango de fechas, armador y término de búsqueda (Nro. Orden / Producto).

                    *   `[x]` Añadir paginación para manejar grandes volúmenes de órdenes.

                    *   `[x]` Convertir el número de orden en un enlace a una vista de detalle.

                *   `[x]` **Vista de Detalle de Orden:**

                    *   `[x]` Crear una vista de solo lectura/imprimible que muestre toda la información de una orden de producción externa.

                *   `[x]` (Backend) Implementada la lógica de datos para el dashboard (Tareas, Alertas de Stock, KPIs).

                *   `[x]` (Frontend) Refinar la UI del dashboard del supervisor.

                *   `[x]` Acciones directas (Asignar Reparto, Reasignar, Cancelar) integradas con la lógica de backend.

                    *   Acciones ahora visibles para órdenes `PARTIALLY_RECEIVED`.

                *   `[x]` **(NUEVO)** Implementar UI anidada para plan de producción.

                *   `[x]` **(NUEVO)** Implementar botón "Crear orden nueva" para sub-ensambles faltantes.

                *   `[x]` **(NUEVO)** Implementar botón "Agregar a esta orden" para sub-ensambles faltantes.

            *   `[x]` **`ADMIN` (Finanzas):**

                *   `[x]` UI para gestionar el catálogo `TrabajoDeArmado`.

                    *   `[x]` **(NUEVO - Rediseño)** Reimplementada como un "Panel Maestro" de dos columnas con visualización de productos vinculados e indicadores de estado.

                *   `[x]` UI para visualizar y registrar liquidaciones de pago.

                *   `[x]` Mejorada la UI de registro de liquidaciones para filtrar armadores sin pago pendiente y mostrar un mensaje de estado vacío.

                *   `[x]` Implementada página de "Historial de Pagos" con filtros, tarjetas de resumen y vista de detalle.

    

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

        -   `[ ]` **(NUEVO)** Herramienta de "Estados de Cuenta": Implementar un sistema para gestionar estados de cuenta con clientes y proveedores clave, permitiendo el seguimiento de pagos parciales, saldos y un historial detallado de transacciones.

        -   `[ ]` Implementar Registro de Auditoría (Audit Trail) para todas las modificaciones de datos.

        -   `[ ]` Desarrollar UI para la gestión dinámica de permisos por rol.

        -   `[x]` Diseño e implementación inicial de un "Dashboard" personalizado por rol (Backend completo, Frontend con esqueleto funcional).

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

                *   `[ ]` Asegurar que todos los endpoints `POST` y `PUT` utilicen `zod` para validar `req.body`.

                *   `[x]` Implementada validación `zod` para `POST /api/categories` y `PUT /api/categories/:id`.

    

        *   **9.4: Gestión Centralizada de Errores y Logging Estructurado**

            *   **Objetivo:** Mejorar la capacidad de depuración y monitoreo de la aplicación.

            *   **Acciones:**

                *   `[x]` Implementar una librería de logging (ej. Winston/Pino) para errores estructurados.

                *   `[x]` Asegurar que los errores sean capturados y registrados de forma consistente.

    

        *   **9.5: Implementación del Entorno de Pruebas de Integración (Completo)**

            *   **Objetivo:** Crear una red de seguridad para detectar regresiones y verificar la funcionalidad del backend de forma automática.

            *   **Acciones:**

                *   `[x]` Instalar y configurar Jest y Supertest.

                *   `[x]` Modificar Docker Compose para soportar una base de datos de prueba aislada (`postgres-test`).

                *   `[x]` Crear un script de prueba que aplica migraciones y ejecuta los tests contra la base de datos de prueba.

                *   `[x]` Escribir y pasar el primer test de integración para el endpoint de productos.

    

    -   **Fase 10: Refactorización del Flujo de Costos de Armado y Liquidaciones (En Progreso)**

        > *Esta fase corrige una inconsistencia arquitectónica fundamental para asegurar la integridad de los datos de costos y habilitar un flujo de liquidación de pagos robusto y auditable.*

    

        *   **10.1: Corrección Arquitectónica del Backend**

            *   `[x]` **Acción (Backend):** Identificar y deprecian el endpoint obsoleto `POST /api/product-design/:id/assembly-cost` que opera sobre un modelo de datos antiguo (relación 1-a-1).

            *   `[x]` **Acción (Backend):** Crear un nuevo endpoint `PUT /api/product-design/:productId/trabajo-armado` que vincule un `Product` con un `TrabajoDeArmado` del catálogo, creando o actualizando la entrada correspondiente en la tabla intermedia `ProductoTrabajoArmado`.

    

        *   **10.2: Implementación de UI para Vinculación de Costos**

            *   `[x]` **Acción (Frontend):** Modificar la página de edición de productos (`ProductEditPage.jsx` y `ProductForm.jsx`).

            *   `[x]` **Acción (Frontend):** Añadir un campo desplegable "Trabajo de Armado" que será **obligatorio** para productos de tipo `PRE_ASSEMBLED` o `FINISHED`.

            *   `[x]` **(NUEVO - Rediseño)** Implementado un flujo de asignación contextual desde la página de producto, reemplazando el desplegable por un modal "Selector/Creador" para mejorar la UX y la integridad de los datos.

            *   `[x]` **Acción (Frontend):** Conectar el guardado del formulario al nuevo endpoint `PUT /api/product-design/:productId/trabajo-armado`.

    

        *   **10.3: Refactorización y Corrección del Flujo de Liquidación**

            *   `[x]` **Acción (Backend):** Refactorizar la lógica de cálculo en el endpoint `GET /api/armadores/payment-summary-batch` para que utilice el `precioUnitario` guardado en `OrderAssemblyStep`, en lugar de recalcularlo con consultas a la base de datos. Esto soluciona el error 500 y mejora la eficiencia.

            *   `[x]` **Acción (Backend):** Reforzar la validación en el endpoint de creación de órdenes de producción externa (`POST /api/external-production-orders`) para rechazar órdenes si el trabajo de armado seleccionado no tiene un precio definido en el catálogo.

    

    -   **Fase 11: UI/UX y Refactorización Responsiva (Mobile-First) (EN CURSO)**

        > *Esta fase se enfoca en rediseñar la interfaz de usuario de toda la aplicación siguiendo una filosofía "Mobile-First" para garantizar una experiencia de usuario profesional y nativa en todos los dispositivos.*

        

        *   **11.1: Navegación Global (Completada)**

            *   `[x]` **Acción (Frontend):** Refactorizar la barra de navegación en un componente `Navbar` dedicado.

            *   `[x]` **Acción (Frontend):** Implementar menú hamburguesa para la vista móvil y menús desplegables para la vista de escritorio.

            *   `[x]` **Acción (Frontend):** Implementar un encabezado fijo (`position: fixed`) para una visibilidad constante.

            *   `[x]` **Acción (Frontend):** Actualizar el branding del encabezado a "ZAP - FlowApp -".

    

        *   **11.2: Aplicar Diseño "Mobile-First" a Páginas Clave (Pendiente)**

            *   **Objetivo:** Rediseñar las páginas más complejas para que sean intuitivas y funcionales en pantallas pequeñas.

                        *   **Acciones:**

                            *   `[x]` **Panel de Logística (`LogisticsDashboardPage.jsx`):**

                                *   `[x]` (Móvil) Rediseñar la tabla de órdenes a un formato de "lista de tarjetas" apiladas verticalmente.

                                *   `[x]` (Móvil) Apilar los controles de filtro verticalmente para facilitar su uso.

                                *   `[x]` (Escritorio) Mejorar el espaciado y la legibilidad de la tabla y los filtros existentes.

                            *   `[ ]` **Listado de Productos (`ProductList.jsx`):**

                                *   `[ ]` (Móvil) Rediseñar la tabla de productos a un formato de "lista de tarjetas".

                                *   `[ ]` (Móvil) Apilar los controles de filtro verticalmente.

                                *   `[ ]` (Escritorio) Mejorar el espaciado de la tabla y los filtros.

            ---

    

    ## 2. Changelog (Registro de Cambios)

    

-   **2025-10-27:**
    -   **Funcionalidad de Órdenes de Producción Externa:**
        -   Se restauró el modelo `OrderNote` y su funcionalidad asociada, incluyendo la creación y visualización de notas.
        -   Se implementó el enlace directo a las órdenes de producción externa desde el historial de movimientos de inventario, mostrando el número de orden y permitiendo la navegación al detalle de la orden.
        -   Se corrigieron errores relacionados con la carga de órdenes de producción externa y la funcionalidad de entrega parcial.

-   **2025-10-27:**
    -   **Historial de Movimientos (UI/UX):**
        -   Se corrigió un bug que impedía anular órdenes de producción interna.
        -   Se refinó la visibilidad del botón "Anular" para mostrarlo solo en movimientos de tipo `PRODUCTION_IN` dentro de eventos de producción interna.
        -   Se implementaron estilos visuales para diferenciar movimientos de Compra (verde) y Órdenes de Producción Externa (azul).
        -   Se mejoró el filtro por tipos, añadiendo etiquetas más amigables y los nuevos tipos de movimiento (`SENT_TO_ASSEMBLER`, `RECEIVED_FROM_ASSEMBLER`).

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