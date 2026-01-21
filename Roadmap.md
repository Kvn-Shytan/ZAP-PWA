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

-   **Fase 3.6: Refactorización y Estabilización Técnica (Post-Auditoría - Completada)**
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
        *   `[x]` Estilos visuales para diferenciar movimientos de Compra (verde) y Órdenes de Producción Externa (azul).
        *   `[x]` Refinamiento del filtro por tipos con etiquetas amigables y nuevos tipos de movimiento.
    -   `[x]` **(NUEVO)** Enlace a Órdenes de Producción Externa en Historial de Movimientos:
        *   `[x]` Modificar `InventoryMovement` en `schema.prisma` para incluir `externalProductionOrderId`.
        *   `[x]` Actualizar creación de movimientos `SENT_TO_ASSEMBLER` y `RECEIVED_FROM_ASSEMBLER` para usar el nuevo campo.
        *   `[x]` Modificar endpoint `/inventory/movements` para incluir `ExternalProductionOrder` en la respuesta.
        *   `[x]` Actualizar `InventoryHistoryPage.jsx` para mostrar `orderNumber` como enlace a la página de detalle de la orden.
    -   `[x]` **(NUEVO)** Restauración de la funcionalidad de Notas de Orden (OrderNote):
        *   `[x]` Reintroducción del modelo `OrderNote` en `schema.prisma` y sus relaciones inversas.
        *   `[x]` Restauración del bloque de creación de `OrderNote` en el endpoint `POST /external-production-orders/:id/receive`.
        *   `[x]` Verificación de la inclusión de `orderNotes` en el endpoint `GET /external-production-orders/:id`.

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

    

    -   **Fase 9: Refactorización Arquitectónica (Completada)**

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

    

    -   **Fase 10: Refactorización del Flujo de Costos de Armado y Liquidaciones (Completada)**

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

    

    -   **Fase 11: UI/UX y Refactorización Responsiva (Mobile-First) (Completada)**

        > *Esta fase se enfocó en rediseñar la interfaz de usuario de toda la aplicación siguiendo una filosofía "Mobile-First" para garantizar una experiencia de usuario profesional y nativa en todos los dispositivos.*

        

        *   **11.1: Navegación Global (Reorganización Completada)**

            *   `[x]` **Acción (Frontend):** Refactorizar la barra de navegación en un componente `Navbar` dedicado.
            *   `[x]` **Acción (Frontend):** Implementar menú hamburguesa para la vista móvil y menús desplegables para la vista de escritorio.
            *   `[x]` **Acción (Frontend):** Implementar un encabezado fijo (`position: fixed`) para una visibilidad constante.
            *   `[x]` **Acción (Frontend):** Reorganizar la arquitectura de información de la `Navbar` en menús desplegables lógicos (`Producción`, `Armado`, etc.) para una experiencia más intuitiva.

    

        *   **11.2: Aplicar Diseño "Mobile-First" a Páginas Clave (Completada)**

            *   **Objetivo:** Rediseñar las páginas más complejas para que sean intuitivas y funcionales en pantallas pequeñas.

                        *   **Acciones:**

                            *   `[x]` **Panel de Logística (`LogisticsDashboardPage.jsx`):**

                                *   `[x]` (Móvil) Rediseñar la tabla de órdenes a un formato de "lista de tarjetas" apiladas verticalmente.

                                *   `[x]` (Móvil) Apilar los controles de filtro verticalmente para facilitar su uso.

                                *   `[x]` (Escritorio) Mejorar el espaciado y la legibilidad de la tabla y los filtros existentes.

                            *   `[x]` **Listado de Productos (`ProductList.jsx`):**

                                *   `[x]` (Móvil) Rediseñar la tabla de productos a un formato de "lista de tarjetas".

                                *   `[x]` (Móvil) Apilar los controles de filtro verticalmente.

                                *   `[x]` (Escritorio) Mejorar el espaciado de la tabla y los filtros.

                            *   `[x]` **Modal "Asignar Trabajo de Armado" (`AssignTrabajoModal.jsx`):**
                                *   `[x]` (Frontend) Refactorizar el modal para usar el componente `Modal` reutilizable.
                                *   `[x]` (Frontend) Migrar estilos en línea a archivos CSS dedicados.
                                *   `[x]` (Frontend) Ajustar estilos de botones para responsividad y consistencia.

                            *   `[x]` **Página de Gestión de Armadores (`AssemblerManagementPage.jsx`):**
                                *   `[x]` (Móvil) Rediseñar la tabla a un formato de "lista de tarjetas".
                                *   `[x]` (Móvil) Corregir el layout de las tarjetas para usar Flexbox y evitar el desbordamiento horizontal.
                                
                            *   `[x]` **Página de Cambio de Contraseña (`ChangePasswordPage.jsx`):**
                                *   `[x]` (UI/UX) Añadir espaciado y un contenedor tipo "tarjeta" para mejorar el layout y la legibilidad en todas las pantallas.
                            
                            *   `[x]` **Página de Login (`LoginPage.jsx`):**
                                *   `[x]` (UI/UX) Refactorización completa del layout a un diseño centrado con Flexbox, eliminando los estilos en línea y el scroll vertical.
                                *   `[x]` (UI/UX) Asegurar que el logo y la imagen de fondo se integren correctamente en el nuevo diseño.

                            *   `[x]` **Página de Gestión de Usuarios (`UserManagementPage.jsx`):**
                                *   `[x]` (Móvil) Rediseñar la tabla a un formato de "lista de tarjetas".
                            
                            *   `[x]` **Página de Creación de Orden de Producción Externa (`ExternalProductionOrderPage.jsx`):**
                                *   `[x]` (UI/UX) Refactorización completa a un diseño responsive con "tarjetas" para secciones clave.
                                *   `[x]` (Funcionalidad) Implementación de un buscador de productos escalable (`react-select AsyncSelect`) con búsqueda asíncrona y paginación.
                                *   `[x]` (FIX) Corrección de bug en el buscador de productos (parámetro `search` y `defaultOptions`).
                            
                            *   `[x]` **Página de Historial de Pagos a Armadores (`AssemblerPaymentsHistoryPage.jsx`):**
                                *   `[x]` (Móvil) Rediseñar la tabla a un formato de "lista de tarjetas" con filtros y paginación responsivos.
                                *   `[x]` (Funcionalidad) Integración de enlaces clicables a las órdenes de producción en los detalles expandidos.
                            
                            *   `[x]` **Página de Historial de Movimientos de Inventario (`InventoryHistoryPage.jsx`):**
                                *   `[x]` (UI/UX) Refactorización completa a un diseño responsive con "tarjetas de movimiento" inteligentes y código de colores.
                                *   `[x]` (Funcionalidad) Implementación de un buscador de productos escalable (`react-select AsyncSelect`) para el filtro.
                            
                            *   `[x]` **Página de Herramientas de Administración (`AdminToolsPage.jsx`):**
                                *   `[x]` (UI/UX) Refactorización a un diseño responsivo de cuadrícula (`grid`) para las tarjetas de herramientas.

            ---

    -   **Fase 12: Consolidación y Estabilización (Completada)**
        *   `[x]` Todos los cambios de refactorización y mejoras de UI/UX, así como las correcciones de errores, se han integrado con éxito en la rama `master`.
        *   `[x]` La aplicación se considera estable y lista para futuras fases de desarrollo.

<br>

---

<br>

-   **Fase 13: Control de Inventario Externo y Alertas de Inactividad (Completada)**
    > **Objetivo:** Obtener visibilidad en tiempo real del inventario en manos de armadores externos y ser notificado proactivamente sobre posibles demoras.

    *   **13.1: Inventario de Armadores ("Pendientes") (Completada)**
        *   **Objetivo:** Visualizar todos los materiales (productos finales y materias primas) que un armador tiene en su poder.
        *   **Acciones Backend:**
            *   `[x]` **(DB):** Crear tabla `OrderSentComponent` para guardar un "snapshot" de los materiales enviados en cada orden y optimizar el rendimiento.
            *   `[x]` **(API)::** Modificar el endpoint de creación de órdenes para poblar la nueva tabla `OrderSentComponent`.
            *   `[x]` **(API):** Crear nuevo endpoint `GET /api/assemblers/:id/inventory` para calcular y devolver los pendientes de un armador basándose en el "snapshot" y las entregas parciales.
        *   **Acciones Frontend:**
            *   `[x]` **(UI):** Implementar la gestión de armadores con botones de acción "Pendientes", "Editar" y "Eliminar".
            *   `[x]` **(UI):** Re-integrar la funcionalidad de edición en línea dentro de la página de gestión de armadores.
            *   `[x]` **(UI):** Implementar un modal "Pendientes" que muestre los productos finales y materias primas pendientes del armador, con correcciones visuales para escritorio y submenú colapsable.

    *   **13.2: Alertas por Inactividad (Pendiente)**
        *   **Objetivo:** Notificar a Supervisores y Administradores si una orden no presenta cambios de estado por más de 3 días hábiles.
        *   **Acciones Backend:**
            *   `[ ]` **(DB):** Crear nueva tabla `Alert` para almacenar las notificaciones generadas.
            *   `[ ]` **(Infra):** Implementar un trabajo programado (`scheduled job`) diario en el backend.
            *   `[ ]` **(Job):** El job escaneará órdenes en estado `IN_ASSEMBLY`, y si no han tenido cambios por 3 días hábiles (Lun-Sab), creará una alerta.
            *   `[ ]` **(API):** Crear endpoints para leer (`GET /api/alerts`) y desestimar temporalmente (`POST /api/alerts/:id/dismiss`) las alertas. La desestimación durará solo hasta el próximo ciclo del job.
            *   `[ ]` **(API):** Implementar la lógica para que una alerta se resuelva automáticamente cuando el estado de la orden asociada cambie.
        *   **Acciones Frontend:**
            *   `[ ]` **(UI):** Añadir una sección de "Alertas" en el dashboard de `SUPERVISOR` y `ADMIN`.
            *   `[ ]` **(UI):** Cada alerta deberá tener un botón para "Desestimar".

<br>

-   **Fase 14: Gestión de Rechazos y Control de Calidad en Recepción (Pendiente)**
    > **Objetivo:** Implementar un sistema robusto para gestionar material defectuoso, separando el proceso logístico del de calidad y vinculando los rechazos a los pagos de armadores.

    *   **14.1: Flujo de "Recepción en Dos Pasos" (Completada)**
        *   **Objetivo:** Reflejar el proceso real donde la recolección logística y la inspección de calidad ocurren en momentos y por personas diferentes.
        *   **Acciones:**
            *   `[x]` **(DB):** Añadir nuevo estado de orden: `RETURN_IN_TRANSIT`.
            *   `[x]` **(API & UI - Repartidor):** Implementar un botón "Recolección Confirmada" para el rol `EMPLOYEE`. Esta acción cambiará el estado de la orden de `PENDING_PICKUP` a `RETURN_IN_TRANSIT`.
            *   `[x]` **(UI - Supervisor):** Crear una nueva cola en el dashboard del supervisor: "Pendiente de Recepción en Fábrica", que liste las órdenes en estado `RETURN_IN_TRANSIT`.

    *   **14.2: Control de Calidad en Recepción y Ajuste de Pago**
        *   **Objetivo:** Permitir al supervisor registrar unidades aceptadas y rechazadas, y que esto impacte el pago al armador.
        *   **Acciones:**
            *   `[ ]` **(DB):** Crear tabla `RejectedMaterialLog` para un historial auditable de rechazos, incluyendo campos para `reason` (texto libre), `externalProductionOrderId` y `deductFromAssemblerPayment` (booleano).
            *   `[ ]` **(API):** Refactorizar el endpoint de recepción del supervisor para aceptar `quantityAccepted` y `quantityRejected`.
            *   `[ ]` **(API):** La lógica de recepción aumentará el stock con las unidades aceptadas, creará un movimiento de desecho (`WASTE_OUT`) con las rechazadas, y guardará el registro en `RejectedMaterialLog`.
            *   `[ ]` **(API):** Modificar la API de cálculo de pagos para que reste el valor de las unidades marcadas con `deductFromAssemblerPayment: true`.
            *   `[ ]` **(UI - Supervisor):** El modal de recepción del supervisor tendrá campos para "Cantidad Aceptada" y "Cantidad Rechazada", y un checkbox `[ ] ¿Descontar del pago?` si hay rechazados.

    *   **14.3: Herramienta de Ajuste General de Inventario por Rechazo**
        *   **Objetivo:** Proveer una herramienta para dar de baja cualquier ítem del inventario por cualquier motivo (daño, obsolescencia, etc.).
        *   **Acciones:**
            *   `[ ]` **(UI):** Crear una nueva página en "Inventario": "Gestión de Rechazos".
            *   `[ ]` **(UI):** La página contendrá un formulario simple para seleccionar un producto, cantidad y un campo de texto libre para la razón del ajuste.
            *   `[ ]` **(API):** Crear un endpoint `POST /api/inventory/reject-general` que cree el `InventoryMovement` de tipo `WASTE_OUT` y el registro correspondiente en `RejectedMaterialLog`.

    

    <br>
    
    -   **Fase 15: Refinamientos de UI/UX y Flujos de Trabajo (En Progreso)**
        > **Objetivo:** Asegurar la fluidez y coherencia en la interacción del usuario con las tareas logísticas, mejorando la visibilidad y accesibilidad de las acciones clave.
    
        *   `[x]` **(UI/UX)** Corrección visual del modal "Pendientes" en la gestión de ensambladores:
            *   Resolución del desbordamiento de texto en la vista de escritorio.
            *   Implementación de submenú colapsable para materiales enviados.
        *   `[x]` **(UI/UX)** Mejorar visibilidad del botón "Pendientes" en la gestión de ensambladores:
            *   Cambio de color a amarillo claro.
        *   `[x]` **(Backend)** Corrección de enlaces de tareas del Dashboard:
            *   Las tareas de órdenes de producción externa ahora enlazan al "Panel de Logística" para su gestión.
        *   `[x]` **(Frontend)** Habilitar acciones de recogida para `ADMIN` y `SUPERVISOR` asignados:
            *   Corrección del bug que impedía a los usuarios privilegiados confirmar sus propias tareas de recogida.
            *   Extensión de la capacidad de asignación y confirmación de tareas de recogida/entrega al rol `ADMIN`.
    
<br>

-   **Fase 16: Implementación de Capacidades PWA (Offline y Instalación) (Pendiente)**
    > **Objetivo:** Convertir la aplicación web en una Progressive Web App (PWA) instalable, con funcionamiento offline para las funcionalidades clave, cumpliendo con uno de los requisitos fundamentales del proyecto.

    *   **16.1: Hacer la Aplicación "Instalable" (Web App Manifest)**
        *   `[ ]` **Acción (Frontend):** Crear el archivo `frontend/public/manifest.json`.
        *   `[ ]` **Contenido:** Definir las propiedades clave de la PWA: `name`, `short_name`, `description`, `start_url`, `display` (standalone), `background_color`, `theme_color` e `icons`.
        *   `[ ]` **Acción (Frontend):** Preparar y añadir iconos de la aplicación en diferentes tamaños (ej. 192x192, 512x512) en la carpeta `frontend/public/icons/`.
        *   `[ ]` **Acción (Frontend):** Vincular el manifest en `frontend/index.html` usando `<link rel="manifest" href="/manifest.json">`.
        *   `[ ]` **Verificación:** Utilizar la pestaña "Application" en las herramientas de desarrollador de Chrome para confirmar que el manifest se carga y es válido.

    *   **16.2: Implementar Funcionalidad Offline Básica (Service Worker)**
        *   `[ ]` **Acción (Frontend):** Crear el archivo del Service Worker `frontend/public/sw.js`.
        *   `[ ]` **Acción (Frontend - sw.js):** Implementar el evento `install` para crear un caché (ej. `zap-flowapp-cache-v1`) y precargar los recursos estáticos de la "App Shell" (HTML, CSS, JS, iconos).
        *   `[ ]` **Acción (Frontend - sw.js):** Implementar el evento `fetch` con una estrategia "Cache First" para los assets estáticos. Si el recurso está en caché, se sirve desde ahí; si no, se busca en la red.
        *   `[ ]` **Acción (Frontend - sw.js):** Implementar el evento `activate` para gestionar y eliminar cachés antiguas, asegurando que los usuarios reciban actualizaciones.
        *   `[ ]` **Acción (Frontend):** Registrar el Service Worker en `frontend/src/main.jsx`, asegurándose de que el navegador del usuario lo instale.
        *   `[ ]` **Verificación:** Usar las herramientas de desarrollador para simular el modo offline y verificar que la aplicación carga su interfaz básica.

    *   **16.3: Estrategia de Caching para Datos Dinámicos (API)**
        *   `[ ]` **Acción (Frontend - sw.js):** Mejorar el evento `fetch` para manejar las peticiones a la API (`/api/`).
        *   `[ ]` **Estrategia:** Implementar una estrategia "Network First, then Cache" para las peticiones `GET`. La app intentará obtener datos frescos de la red, pero si no hay conexión, servirá la última versión guardada en el caché.
        *   `[ ]` **(Avanzado - Opcional):** Implementar "Background Sync" para las peticiones `POST` y `PUT`. Si el usuario crea o modifica algo offline, la petición se guarda y se envía automáticamente cuando se recupera la conexión.

<br>

-   **Fase 17: Despliegue en la Nube y Puesta en Producción (Pendiente)**
    > **Objetivo:** Mover la aplicación desde el entorno de desarrollo local a una infraestructura en la nube robusta, segura y siempre disponible, permitiendo el acceso desde cualquier dispositivo con internet.

    *   **17.1: Preparación del Entorno de Nube**
        *   `[ ]` **Acción (Infra):** Crear un nuevo proyecto en Google Cloud Platform (GCP).
        *   `[ ]` **Acción (Infra):** Habilitar las APIs necesarias: Cloud Run, Cloud SQL, Artifact Registry, Secret Manager.
        *   `[ ]` **Acción (Infra):** Configurar la facturación y aprovechar los créditos gratuitos para nuevos usuarios.

    *   **17.2: Despliegue de la Base de Datos**
        *   `[ ]` **Acción (Infra):** Crear una instancia de **Google Cloud SQL** con PostgreSQL.
        *   `[ ]` **Configuración:** Elegir la instancia más pequeña (`db-f1-micro`) para mantener los costos bajos (~$7-10/mes).
        *   `[ ]` **Seguridad:** Configurar la contraseña de la base de datos y almacenarla de forma segura en **Google Secret Manager**.
        *   `[ ]` **Acción (DB):** Migrar el esquema de la base de datos local a la base de datos en la nube ejecutando las migraciones de Prisma.

    *   **17.3: Despliegue del Backend**
        *   `[ ]` **Acción (Código):** Optimizar `backend/Dockerfile` para producción (builds multi-etapa, dependencias de producción únicamente).
        *   `[ ]` **Acción (Infra):** Crear un repositorio en **Google Artifact Registry** para almacenar las imágenes de Docker.
        *   `[ ]` **Acción (CI/CD):** Construir la imagen Docker del backend y subirla a Artifact Registry.
        *   `[ ]` **Acción (Infra):** Crear un nuevo servicio en **Google Cloud Run** y desplegar la imagen del backend desde Artifact Registry.
        *   `[ ]` **Configuración:**
            *   Inyectar la contraseña de la base de datos desde Secret Manager como una variable de entorno.
            *   Configurar la URL de la base de datos en la nube.
            *   Asegurar que el servicio tenga una URL pública y siempre disponible.

    *   **17.4: Despliegue del Frontend**
        *   `[ ]` **Opción A (Recomendada): Firebase Hosting**
            *   `[ ]` **Acción (Infra):** Crear un proyecto de Firebase y vincularlo al proyecto de GCP.
            *   `[ ]` **Acción (Frontend):** Instalar las herramientas de Firebase CLI y configurar el proyecto en `frontend/`.
            *   `[ ]` **Acción (Frontend):** Configurar el `VITE_API_URL` en las variables de entorno para que apunte a la URL pública del backend en Cloud Run.
            *   `[ ]` **Acción (CI/CD):** Ejecutar el build de producción de React (`npm run build`) y desplegar los archivos estáticos a Firebase Hosting.
        *   `[ ]` **Opción B: Google Cloud Run**
            *   `[ ]` **Acción (Código):** Optimizar `frontend/Dockerfile` para producción (build multi-etapa con Nginx).
            *   `[ ]` **Acción (CI/CD):** Construir y subir la imagen Docker del frontend a Artifact Registry.
            *   `[ ]` **Acción (Infra):** Desplegar la imagen en un nuevo servicio de Cloud Run.

    *   **17.5: Verificación Final**
        *   `[ ]` **Acción:** Acceder a la URL pública del frontend (ej. `https://zap-flowapp.web.app`).
        *   `[ ]` **Prueba:** Verificar que la aplicación funciona, se conecta al backend en la nube y que las capacidades PWA (instalación y offline) están activas.
        
    ## 2. Changelog (Registro de Cambios)

## 2026-01-19 (Fase 13.1: Inventario de Armadores - Progreso y Bugfix)
-   **[FEAT] Backend: Implementación de Control de Inventario Externo para Armadores:**
    -   Se creó la tabla `OrderSentComponent` en `schema.prisma` para registrar los componentes enviados a los armadores como "snapshot" del inventario en su poder.
    -   Se modificó el endpoint `POST /api/external-production-orders` para poblar la tabla `OrderSentComponent` al confirmar una orden de producción externa.
    -   Se creó el endpoint `GET /api/assemblers/:id/inventory` para calcular y devolver el inventario pendiente de un armador (materiales enviados y productos finales esperados).
    -   Se corrigió un `500 Internal Server Error` en `GET /api/assemblers/:id/inventory` causado por una invocación incorrecta de Prisma, refactorizando la consulta para filtrar órdenes activas y luego los componentes enviados/esperados.
-   **[FEAT] Frontend: Interfaz para Control de Inventario Externo en Gestión de Armadores:**
    -   Se implementó un botón "Pendientes" en la página de Gestión de Armadores que abre un modal con el inventario detallado del armador.
    -   Se restauró la funcionalidad de edición y eliminación en línea en la página de Gestión de Armadores.
    -   Se movió el componente `EditForm` a `frontend/src/components/EditForm.jsx` para reusabilidad.
    -   Se agregaron estilos (`AssemblerManagementPage.css`) para el modal de inventario pendiente.
-   **[FIX] Estabilidad y Coherencia del Frontend:**
    -   Se corrigieron errores de rutas de importación en `AssemblerDetailsPage.jsx` (posteriormente revertida).
    -   Se corrigió un error `Identifier 'React' has already been declared` en `AssemblerManagementPage.jsx` eliminando una importación duplicada de React.
    -   Se corrigió un `ReferenceError: useNavigate is not defined` en `AssemblerManagementPage.jsx` eliminando la declaración `const navigate = useNavigate();` que ya no era necesaria tras el cambio de flujo.
    -   Se eliminó la página `AssemblerDetailsPage.jsx` y su ruta de `App.jsx` para simplificar el flujo de usuario.
    -   **[BUG]** El modal de "Pendientes" aún no funciona correctamente o muestra errores en la carga de datos.

## 2026-01-18 (Finalización de Refactorización y Consolidación)
-   **[FEAT] Refactorización Completa de Código e Identificadores:**
    -   Estandarización de todas las convenciones de nombres de identificadores (variables, funciones, rutas, etc.) de español a inglés en todo el backend y frontend.
    -   Reestructuración significativa de rutas y servicios en el backend para mejorar la modularidad y mantenibilidad.
-   **[FIX] Corrección Crítica de Dashboard para Rol ADMIN:**
    -   Resolución de un error `prisma.externalProductionOrder.findMany()` que causaba un crash en el dashboard del administrador. La solución implicó eliminar un filtro redundante (`assemblerId: { not: null }`) que, por un un bug de Prisma, generaba un error de tipo inesperado (`not: String`).
-   **[FEAT(ui)] Mejora de UX en Modal de Recepción de Mercadería:**
    -   Implementación de un cambio en el campo de cantidad del modal de recepción de mercadería para permitir que el campo esté vacío durante la edición, en lugar de forzar un valor `0`. Esto mejora la fluidez de la interacción del usuario.
-   **[CHORE] Documentación y Consolidación:**
    -   Actualización del `Roadmap.md` para reflejar la completitud de las fases de refactorización (Fase 3.6, 9, 10, 11) y la adición de una nueva sección de "Consolidación y Estabilización".
    -   Integración exitosa de todos los cambios de la rama `refactor/standardize-identifiers` en la rama `master` del proyecto.

## 2026-01-12 (Parte 3)
    2 -   **[FEAT(ui)] Refactorizada Página de Historial de Movimientos de Inventario (`InventoryHistoryPage`):**
    3     -   Se realizó una refactorización completa a un diseño responsive con "tarjetas de movimiento" inteligentes,
      incluyendo un código de colores mejorado para identificar rápidamente el tipo de movimiento.
    4     -   Se implementó un buscador de productos escalable (`react-select AsyncSelect`) para el filtro de productos,
      mejorando la usabilidad con grandes volúmenes de datos.
    5     -   Se eliminaron todos los estilos en línea y se trasladaron a `InventoryHistoryPage.css`.
    6 -   **[FEAT(ui)] Refactorizada Página de Herramientas de Administración (`AdminToolsPage`):**
    7     -   Se refactorizó el layout de la página a un diseño responsivo de cuadrícula (`grid`) para las tarjetas de
      herramientas, eliminando los estilos en línea y trasladándolos a `AdminToolsPage.css`.
    8 -   **[REFACTOR(ui)] Eliminado Enlace Redundante de `Navbar`:**
    9     -   Se eliminó el enlace "Costos Indirectos" del menú desplegable "Administración" en `Navbar.jsx` para evitar
      redundancia, ya que es accesible a través de "Otras Herramientas".
   10 -   **[FIX(ui)] Corregido Padding de `Navbar` en Escritorio:**
   11     -   Se solucionó el problema del exceso de padding en la `Navbar` en la vista de escritorio, que se introdujo
      ajustar el menú móvil. Se añadió un reset de padding en el media query de escritorio en `Navbar.css`.

## 2026-01-12 (Parte 2)
-   **[REFACTOR(ui)] Reorganización de la Arquitectura de Navegación (`Navbar`):**
    -   Se refactorizó por completo la barra de navegación para agrupar las secciones en menús desplegables más intuitivos: "Producción" y "Armado".
    -   Se renombró el enlace "Productos" a "Inventario" para mayor claridad.
    -   Se añadió un enlace principal "Historial" para el historial de inventario.
    -   Se simplificó el menú "Administración" y se eliminó el menú "Herramientas" redundante para el rol de Supervisor, integrando sus enlaces en las nuevas secciones.
    -   El orden de los enlaces principales se ha reorganizado para un flujo de trabajo más lógico.
-   **[FEAT(ui)] Refactorizada la Página de Gestión de Usuarios (`UserManagementPage`):**
    -   Se implementó el diseño responsivo "Mobile-First", convirtiendo la tabla de usuarios en una lista de tarjetas en la vista móvil para mejorar la usabilidad en pantallas pequeñas.
    -   Se estandarizaron todos los botones y estilos del formulario de creación para mantener la consistencia visual con el resto de la aplicación.

## 2026-01-12 (Continuación)
-   **[FEAT(ui)] Refactorizada la Página de Login (`LoginPage`):**
    -   Se realizó una refactorización completa del layout, eliminando estilos en línea y el `useEffect` que manipulaba el `document.body`.
    -   Se implementó un diseño centrado con Flexbox en el contenedor principal (`login-page-container`) para asegurar que el contenido esté siempre visible y bien espaciado, sin necesidad de scroll vertical.
    -   Se creó un `login-form-card` para agrupar el logo, título y formulario, dándole una apariencia de tarjeta y resolviendo el problema de los elementos pegados a los bordes.
    -   Se aseguró la correcta integración visual del logo y la trama de fondo, elementos clave de la marca.
    -   Todos los estilos fueron movidos a `frontend/src/pages/LoginPage.css` para una mayor mantenibilidad.
-   **[FIX(ui)] Eliminada Barra Blanca Superior en Página de Login:**
    -   Se solucionó el problema de la "barra blanca" superior visible en la página de Login.
    -   La causa fue un `padding-top` fijo en `.main-content` que se aplicaba universalmente.
    -   La solución implementada fue renombrar la clase en `App.css` a `.main-content-with-navbar` y aplicar esta clase condicionalmente en `App.jsx`, solo cuando la barra de navegación está visible.

## 2026-01-12
-   **[FEAT(ui)] Refactorizada la Página de Gestión de Armadores (`AssemblerManagementPage`):**
    -   Se implementó el diseño responsivo "Mobile-First", transformando la tabla de armadores en una lista de tarjetas en la vista móvil.
    -   Se corrigió un problema de desbordamiento horizontal en las tarjetas móviles reemplazando el layout de anchos fijos por un sistema flexible basado en Flexbox.
-   **[FEAT(ui)] Mejorada la Página de Cambio de Contraseña (`ChangePasswordPage`):**
    -   Se solucionó el problema de espaciado, añadiendo un contenedor tipo "tarjeta" centrado que evita que los campos del formulario se peguen a los bordes de la pantalla.
    -   Se estandarizaron los estilos de los inputs y el botón para mayor consistencia con el resto de la aplicación.
-   **[FIX(dev)] Corregido Error de Sintaxis en `ChangePasswordPage`:**
    -   Se resolvió un error `Missing semicolon` causado por una operación de reemplazo de texto fallida, restaurando la funcionalidad de la página.

## 2026-01-06 (Parte 3)
-   **[FEAT(ui)] Implementado diseño responsivo en el Listado de Productos:**
    -   Se aplicó la estrategia "Mobile-First" a la página del Listado de Productos.
    -   La tabla de productos ahora se transforma en una lista de tarjetas en la vista móvil para una mejor usabilidad y legibilidad.
    -   Los controles de filtro de productos ahora se apilan verticalmente en la vista móvil.
-   **[FEAT(ui)] Mejorado el diseño responsivo del Modal "Asignar Trabajo de Armado":**
    -   El modal fue refactorizado para usar el componente `Modal` reutilizable.
    -   Los estilos en línea fueron migrados a un archivo CSS dedicado (`AssignTrabajoModal.css`).
    -   Los botones de acción dentro del modal ahora se apilan verticalmente en móvil, resolviendo problemas de visibilidad y usabilidad.
-   **[REFACTOR] Centralización de Estilos de Botones Globales:**
    -   Las clases de botones genéricos (`.btn`, `.btn-primary`, `.btn-success`, `.btn-danger`, `.btn-secondary`, `.btn-outline-primary`) fueron movidas a `index.css` para su reutilización y consistencia en toda la aplicación.

## 2026-01-06 (Parte 2)
-   **[FEAT(ui)] Implementado diseño responsivo en el Panel de Logística:**
    -   Se aplicó la estrategia "Mobile-First" a la página del Panel de Logística.
    -   La tabla de órdenes ahora se transforma en una lista de tarjetas en la vista móvil para una mejor usabilidad y legibilidad.
    -   Los controles de filtro ahora se apilan verticalmente en la vista móvil.
-   **[REFACTOR] Modularización de Estilos y Componentes:**
    -   Se migraron todos los estilos en línea de `LogisticsDashboardPage.jsx` a un archivo CSS dedicado (`LogisticsDashboardPage.css`).
    -   El componente `Modal` fue extraído a su propio archivo (`src/components/Modal.jsx`) para su reutilización en toda la aplicación.

## 2026-01-06
-   **[REFACTOR] Refactorización Completa de la Barra de Navegación:**
    -   Se movió toda la lógica de navegación a un componente dedicado (`Navbar.jsx`) para mejorar la mantenibilidad.
    -   Se implementó un encabezado fijo (`position: fixed`) en toda la aplicación para una visibilidad constante.
    -   Se diseñó e implementó un menú de hamburguesa funcional para la vista móvil y menús desplegables para la vista de escritorio.
    -   Se actualizó el branding en el encabezado a "ZAP - FlowApp -".
    -   Se corrigieron múltiples bugs de CSS relacionados con el `z-index`, `transform`, y especificidad de selectores que causaban problemas de visualización y usabilidad en ambas vistas.
-   **[CHORE] Estrategia de UI/UX:**
    -   Se estableció formalmente la estrategia de diseño "Mobile-First" para guiar la refactorización responsiva de toda la aplicación.

## 2025-12-10
-   **[FEAT] Implementación de Dashboard por Rol:**
    -   Se implementó un nuevo Dashboard como página de inicio para todos los roles, mostrando tareas, alertas y KPIs relevantes para cada usuario.
    -   El dashboard del `EMPLOYEE` ahora muestra en tiempo real las tareas de entrega y recolección que tiene asignadas.
    -   El dashboard del `SUPERVISOR` muestra tareas de asignación y revisión, alertas de bajo stock y KPIs de órdenes en proceso.
    -   El dashboard del `ADMIN` incluye sus propias tareas y una vista expandible del panel del `SUPERVISOR`.
-   **[FEAT] Alertas de Stock Inteligentes:**
    -   Las alertas por bajo stock en el dashboard ahora tienen un botón "Resolver" que dirige al usuario a la página correcta (Registrar Compra o Crear Orden Externa) y pre-selecciona el producto en cuestión.
-   **[FEAT] Mejora de Flujo para Empleados:**
    -   Se añadió la dirección y el teléfono del armador en la página de "Detalle de Orden de Producción Externa" para que el empleado tenga toda la información necesaria para la entrega.
-   **[FIX] Estabilidad General:**
    -   Solucionados múltiples bugs en el formulario de creación/edición de productos, incluyendo errores de validación de tipos de datos y problemas de usabilidad en campos numéricos.
    -   Corregido un error crítico que provocaba un `500 Internal Server Error` al cargar el dashboard del empleado debido a una inconsistencia en los nombres de campos (`deliveryById` vs `deliveryUserId`).
-   **[CHORE] Documentación:**
    -   Actualizado el `Roadmap.md` para reflejar los avances en el nuevo dashboard y la experiencia de usuario.

## 2025-12-09
-   **[FEAT] Rediseño del Módulo de Gestión de Trabajos de Armado:**
    -   La página de "Gestión de Trabajos de Armado" ha sido completamente rediseñada como un "Panel Maestro" de dos columnas para una experiencia de usuario superior.
    -   **UI/UX:** La nueva interfaz presenta una lista de selección a la izquierda y un panel de detalles dinámico a la derecha para la edición y visualización.
    -   **Backend:** Creado un nuevo endpoint `GET /api/trabajos-armado/:id/linked-products` para obtener productos vinculados. El endpoint principal ahora incluye un contador de productos asociados para cada trabajo de armado.
    -   **Funcionalidad:** Al seleccionar un trabajo, ahora se muestra una lista de todos los productos que lo utilizan, proporcionando un contexto crucial antes de cualquier modificación.
    -   **Funcionalidad:** Se añadieron indicadores visuales (puntos verde/gris) para identificar rápidamente si un trabajo está en uso o es "huérfano".
-   **[FEAT] Mejora del Flujo de Asignación de Trabajos en Productos:**
    -   En la página de edición de productos, se eliminó el menú desplegable para asignar trabajos de armado.
    -   Se implementó un nuevo flujo con un botón contextual (`Asignar`/`Cambiar`) que abre un modal "Selector/Creador", mejorando la integridad de los datos y la experiencia de usuario.
-   **[FIX] Corrección de Múltiples Bugs:**
    -   Solucionado un bug que impedía que la selección de un trabajo de armado en el modal se mantuviera en la página de edición.
    -   Solucionado un crasheo en la página de gestión de trabajos al editar un ítem con valores `null`.
    -   Corregido un `ReferenceError` que ocurría después de guardar una actualización en el nuevo panel maestro.
    -   Mejorada la UX del campo de precio para permitir que sea vaciado y adaptado para el uso de números enteros.
-   **[CHORE] Documentación:**
    -   Actualizado el `Roadmap.md` para reflejar las tareas completadas y los nuevos rediseños.

## 2025-11-26
-   **[FEAT] Nueva Página de "Historial de Pagos a Armadores":**
    -   Implementada una nueva sección para `ADMIN` que permite visualizar el historial de todos los pagos realizados a los armadores.
    -   **Backend:** Creado un nuevo endpoint `GET /api/assemblers/payments` optimizado para obtener datos históricos y agregados de forma concurrente y eficiente.
    -   **UI/UX:**
        -   Los filtros de fecha cargan por defecto el primer y último día del mes actual para una visualización inmediata.
        -   Añadidas tarjetas de resumen ("Total Pagado en Período" y "Total de Unidades Producidas") que se actualizan con los filtros.
        -   La tabla de pagos es paginada y permite expandir cada pago para ver en detalle las órdenes de producción que lo componen.
-   **[FIX] Corrección de Bugs en Desarrollo:**
    -   Solucionado un error `TypeError: Cannot read properties of null (reading 'role')` añadiendo una verificación del objeto `user` antes de acceder a sus propiedades.
    -   Corregido un error `TypeError: .toFixed is not a function` al convertir el `totalPaid` (que llega como string desde la API) a número antes de formatearlo.

## 2025-11-25
-   **[FIX] Módulo de Liquidación de Pagos:**
    -   Solucionado un bug crítico que impedía cerrar la quincena y registrar pagos (`POST /api/assemblers/close-fortnight-batch`).
    -   La causa raíz era una inconsistencia entre el frontend (que enviaba `assemblerIds`) y el backend (que esperaba `armadorIds`). Se aplicó una capa de traducción en la API como solución pragmática.
    -   Solucionado un error `net::ERR_EMPTY_RESPONSE` que causaba la caída del servidor al calcular liquidaciones, provocado por un inicio prematuro de la aplicación por parte del usuario.
-   **[FEAT] UI/UX Mejorada en Liquidación de Pagos:**
    -   La página de "Liquidación de Pagos a Armadores por Lotes" ahora solo muestra en la tabla a los armadores que tienen un monto de pago pendiente mayor a cero.
    -   Se ha añadido un mensaje claro ("No se encontraron armadores con pagos pendientes...") cuando no hay liquidaciones para mostrar en el período de fechas seleccionado.
-   **[CHORE] Gestión de Deuda Técnica:**
    -   Creado el archivo `TECH_DEBT.md` para documentar formalmente las tareas de refactorización y estandarización pendientes.
    -   Establecida la convención de que todo el código nuevo debe escribirse en inglés para mejorar la consistencia del proyecto a largo plazo.

## 2025-10-28
-   **[FEAT] Flujo Completo de Gestión de Costos de Armado y Liquidaciones:**
    -   **[REFACTOR] DB:** Se corrigió el modelo de datos `ProductoTrabajoArmado` (`schema.prisma`) para asegurar una relación 1:1 entre Producto y Trabajo de Armado, aplicando una nueva migración.
    -   **[REFACTOR] Backend:** Se deprecó el endpoint obsoleto `POST /product-design/:id/assembly-cost` y se implementó el nuevo endpoint `PUT /api/product-design/:productId/trabajo-armado` para vincular productos con trabajos de armado.
    -   **[REFACTOR] Backend:** Se corrigió el endpoint `GET /product-design/:id` para incluir correctamente la relación `trabajosDeArmado`.
    -   **[FEAT] Frontend:** Se añadió un campo de selección de "Trabajo de Armado" (usando `react-select`) en la página de edición de productos (`ProductEditPage.jsx` y `ProductForm.jsx`), visible para productos `PRE_ASSEMBLED` y `FINISHED`.
    -   **[FIX] Backend:** Se corrigieron múltiples errores en el endpoint `POST /external-production-orders` relacionados con el cálculo de cantidades y el acceso a propiedades de `TrabajoDeArmado`.
    -   **[FIX] Backend:** Se corrigieron errores de sintaxis de Prisma en el `upsert` del endpoint `PUT /product-design/:productId/trabajo-armado`.
    -   **[FIX] Backend:** Se corrigió la lógica de cálculo en el endpoint `GET /assemblers/payment-summary-batch` para usar el `precioUnitario` guardado en `OrderAssemblyStep`.
    -   **[FIX] Backend:** Se añadió el filtro `assemblerPaymentId: null` al endpoint `GET /api/assemblers/payment-summary-batch` para mostrar solo órdenes no pagadas.
    -   **[FIX] Frontend:** Se corrigió un error `TypeError` en `ExternalProductionOrderPage` al mostrar `totalAssemblyCost` cuando era `null`.
    -   **[FIX] Routing:** Se corrigieron inconsistencias en las rutas del backend (`/api/armadores` vs `/api/assemblers`) y se reordenaron las rutas en `armadores.routes.js` para evitar conflictos.
    -   **[CHORE] Performance:** Se configuró `nodemon.json` para mejorar el rendimiento del backend en desarrollo.

## 2025-10-21
-   **[FEAT] Panel de Logística Mejorado:**
    -   **Backend:** Implementado filtrado (por rango de fechas, armador, búsqueda de texto) y paginación en el endpoint de órdenes de producción externa.
    -   **Frontend:** Añadidos controles de filtro y paginación al Panel de Logística.
    -   **[FIX] UX Filtro de Búsqueda:** Implementado "debounce" en el filtro de búsqueda del Panel de Logística y en el Listado de Productos para evitar interrupciones al escribir.
    -   **[FIX] UX Foco de Input:** Corregido el problema de pérdida de foco en el input de búsqueda del Panel de Logística al reestructurar el renderizado condicional.
-   **[FEAT] Vista de Detalle de Orden de Producción Externa:**
    -   Implementada página de detalle de orden (`/external-orders/:id`) con vista de solo lectura y botón de impresión.
    -   Añadido enlace desde el Panel de Logística a la página de detalle.
-   **[FEAT] Mejora UX Modal de Recepción de Mercadería:**
    -   Rediseñado el Paso 2 del modal de recepción con botones de acción claros ("Entrega Parcial", "Entrega con Devoluciones", "Otro Motivo") y doble confirmación para una mejor experiencia de usuario.
-   **[FIX] Errores de Importación en `App.jsx`:** Corregidos errores de importación duplicados y rutas incorrectas en `App.jsx`.

## 2025-10-16
-   **[FEAT] Implementación Completa de Recepción Parcial:**
    -   **DB:** Añadido `quantityReceived` a `ExpectedProduction` y `PARTIALLY_RECEIVED` a `ExternalProductionOrderStatus`.
    -   **Backend:** Reescripto el endpoint `POST /:id/receive` para soportar recepciones incrementales, validar cantidades y actualizar estados (`PARTIALLY_RECEIVED`, `COMPLETED`).
    -   **Frontend:** Rediseñado el modal de recepción para mostrar cantidades detalladas (esperado, recibido, pendiente) y limitar la entrada de cantidad.
-   **[FIX] Creación de `ExpectedProduction`:** Corregido bug donde no se creaban registros `ExpectedProduction` al confirmar una orden.
-   **[FIX] Error de `InventoryMovement`:** Resuelto el error `tx.inventorymovement.create() invocation failed` en la recepción de mercadería.
-   **[FIX] Asignación de Recogida:** Permitida la reasignación de recogida para órdenes en estado `PARTIALLY_RECEIVED`.
-   **[FIX] Visualización de Asignado a:** Corregida la columna "Asignado a" en el Panel de Logística para mostrar el usuario correcto según el estado de la orden.
-   **[FIX] Typo en `userId`:** Corregido el typo `req.user.id` a `req.user.userId` en el endpoint de recepción.

## 2025-10-11
-   **[FEAT] Validación de Entradas para Categorías (Fase 9.3 - Parcial):**
    -   Implementada la validación de entradas usando `zod` para las rutas `POST /api/categories` y `PUT /api/categories/:id`.
    -   Creado `backend/validators/category.validator.js` con el esquema de validación para categorías.
    -   Creado `backend/routes/categories.test.js` con pruebas de integración para verificar la validación de entradas y la funcionalidad de creación/actualización.
    -   Corregidos errores en las pruebas relacionados con el formato de los mensajes de error de `zod` y la limpieza de la base de datos de prueba.
    -   **Ejemplo de Prueba de Validación (backend/routes/categories.test.js):**
        ```javascript
        it('should return 400 if category name is missing', async () => {
          const res = await request(app)
            .post('/api/categories')
            .send({}); // Empty body, missing name
          expect(res.statusCode).toEqual(400);
          expect(res.body).toHaveProperty('errors');
          expect(res.body.errors[0].message).toEqual('Invalid input: expected string, received undefined');
        });
        ```

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