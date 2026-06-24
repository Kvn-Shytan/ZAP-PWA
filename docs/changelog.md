# Changelog (Registro de Cambios)

## 2026-06-24 (Optimización de Comandas Térmicas, Trazabilidad .00X, ERP-Layout y Suite Verde)
-   **[FEAT] Fase 20: Sistema de Comandas Térmicas (80mm):**
    -   **Frontend:**
        -   Diseñado el componente `ThermalTicket.jsx` y su hoja de estilos `ThermalTicket.css` con formato optimizado de 72mm para bobinas térmicas de 80mm.
        -   Creada la página contenedora `/external-orders/:id/ticket` libre de Navbar y optimizada mediante estilos de impresión `@media print` para emitir comandas limpias.
        -   Integrado el botón directo `🖨️` en cada fila del Panel de Logística y un botón verde destacado en el detalle de la orden para abrir el ticket térmico en una pestaña limpia.
-   **[FEAT] Trazabilidad y Filtros de Armadores (.00X):**
    -   **Base de Datos:** Añadido campo `tracerCode` de tipo String opcional al modelo `Assembler` en `schema.prisma` y ejecutada la migración de base de datos.
    -   **Backend:** Actualizados los endpoints (GET, POST, PUT) de armadores para soportar y exponer el código de trazabilidad de forma segura según el rol del usuario.
    -   **Frontend:**
        -   Añadido el campo de entrada "Código de Trazabilidad" en los formularios de creación/edición y la columna "Cód. Trazabilidad" en la tabla de Gestión de Armadores.
        -   Implementado filtro interactivo por **Nombre** o **Código de Armador** (ej. `.002`) en la barra de búsqueda de Gestión de Armadores.
        -   **Cálculo Automático Dinámico:** El ticket térmico calcula dinámicamente la fecha actual y la combina con el código del armador para estampar la etiqueta del día con el formato `ETIQUETA: DDMM.00X` (ej. `2406.002`).
-   **[REFACTOR] Refactorización Estructural ERP/POS (Opción B):**
    -   **Formularios Independientes:** Desacopladas las interfaces de Ventas y Mermas (Rechazos). Las rutas `/inventory-adjustments` y `/wastage-management` pasan a actuar exclusivamente como historiales de auditoría rápidos.
    -   **Carga a Pantalla Completa:** Desarrolladas las nuevas vistas `/sales/new` y `/wastage-management/new` con diseño enfocado, libre de modales y optimizado para pantallas táctiles/celulares.
    -   **Control y Resiliencia en Nueva Venta:**
        -   **Bloqueo de Cliente:** El buscador de clientes se bloquea automáticamente (`isDisabled={items.length > 0}`) en cuanto se añade el primer producto a la tabla, con un mensaje y candado de advertencia (`🔒`) para evitar inconsistencias en las categorías de precios.
        -   **Advertencia de Sobreescritura:** Se destaca el "Precio de Lista" y se despliega una advertencia visual parpadeante en tiempo real (`⚠️ PRECIO SOBREESCRITO`) si el supervisor edita manualmente el precio de un ítem ignorando el descuento automático de su categoría.
        -   **Cliente Ocasional Compartido:** Implementada la creación/búsqueda automática de un único registro `"Cliente Ocasional"` permanente para evitar duplicados y cluttering. El nombre real se guarda codificado en las notas (`[OCASIONAL: Nombre]`) y se muestra en las tablas del historial con un asterisco y letra cursiva azul (`* Lucas Rossi (Ocasional)`), decodificándose perfectamente al imprimir el remito físico.
    -   **Optimización de Carga:** El selector de productos de Rechazos ahora consulta el stock de forma asíncrona y bajo demanda (`/products/:id`) únicamente al ser seleccionado, acelerando la transacción y reduciendo la carga en base de datos.
-   **[REFACTOR] Rediseño ERP de Doble Columna (Producción Interna y Externa):**
    -   Rediseñadas por completo las pantallas `ExternalProductionOrderPage.jsx` and `ProductionOrderPage.jsx` en un diseño ergonómico de doble columna (Requisitos, catálogos y formularios a la izquierda; costos de mano de obra, pasos y botones principales a la derecha), eliminando el scroleo vertical.
    -   Creado un panel simulador explicativo (Placeholder) cuando no hay producto cargado.
    -   Los requisitos de ingredientes de producción interna ahora muestran un indicador visual interactivo de colores (Verde si hay stock suficiente, Rojo con alerta si es insuficiente).
-   **[FIX] Resolución de Bugs Críticos:**
    -   Importado el componente `Modal` en `LogisticsDashboardPage.jsx` para reparar el colapso de pantalla en blanco.
    -   Importada la función `translateOrderStatus` en `AssemblerPaymentBatchPage.jsx` y `AssemblerPaymentsHistoryPage.jsx` para solucionar el colapso al liquidar e inspeccionar el historial.
    -   Corregido el error de filtrado en Gestión de Rechazos mediante la consulta del array sin paginar `/products?all=true`.
-   **[TEST] Suite de Pruebas de Inventario y Cobertura Verde (Paso A):**
    -   **Tests de Productos:** Incorporados tests de integración CRUD para productos y sus validaciones correspondientes en `products.test.js`.
    -   **Tests de Inventario Avanzado:** Creada una nueva suite `inventory.test.js` para testear compras, producción con consumo de receta ("Resta 0") y anulación estricta con prevención de stock negativo.
    -   **Estabilización de Tests:** Modificados los bloques de limpieza `beforeEach` en cascada (ProductComponent, ProductAssemblyJob, ProductOverhead) para evitar violaciones de FK. **La suite completa de tests de backend cuenta ahora con 69 tests exitosos (100% verde)**.

## 2026-03-04 (Alertas Inteligentes y Gestión de Rechazos)
-   **[FEAT] Fase 13.2: Sistema de Alertas Inteligentes:**
    -   **Backend:** Implementado motor de reglas en `/api/dashboard` que evalúa inactividad de órdenes (>3 días hábiles), fechas límite de pago a armadores, y umbrales de stock en tiempo real.
    -   **UI/UX:** Rediseño completo del Dashboard (`DashboardPage.jsx`).
        -   Implementada una "Zona Roja" superior para Alertas Críticas (stock agotado, inactividad severa, pagos en <24hs).
        -   Implementado un panel lateral de "Precauciones" para advertencias de menor severidad.
        -   Creados componentes reutilizables `CriticalAlertCard` y `PrecautionCard`.
-   **[FEAT] Fase 14: Herramienta de Gestión de Rechazos:**
    -   **Base de Datos:** Añadida tabla `WastageLog` para auditar material arruinado, con soporte para vinculación opcional a armadores y órdenes específicas.
    -   **Backend:**
        -   Actualizado endpoint `POST /api/inventory/wastage` para crear el movimiento de merma y el registro oficial de forma atómica.
        -   **Lógica Financiera:** Integrados los rechazos en la Liquidación de Pagos. Las mermas vinculadas a un armador se descuentan automáticamente de su pago quincenal y se marcan como deducidas.
        -   Añadida lógica en el Dashboard para generar "Precauciones" ante nuevos rechazos y "Alertas Críticas" por bajo rendimiento si un armador acumula 3 o más en 15 días.
    -   **Frontend:**
        -   Desarrollada nueva interfaz "Gestión de Rechazos" (`/wastage-management`) accesible para Administradores y Supervisores, con formulario de registro y tabla de historial.
-   **[FEAT] Traducción de Interfaz (Localización):**
    -   Implementado utilitario `statusTranslator.js` para traducir los estados internos de las órdenes (ej. `PENDING_DELIVERY`) a español amigable ("Pendiente de Envío").
    -   Traducción aplicada globalmente en el Panel de Logística, Detalle de Órdenes, Liquidación y Registro Histórico de pagos.
-   **[TEST] Ampliación de la Cobertura de Pruebas y Robustez:**
    -   **Tests Financieros:** Creada suite `wastage.test.js` para asegurar la correcta deducción de mermas en los pagos de armadores.
    -   **Tests del Motor de Reglas:** Creada suite `dashboard.test.js` para validar la lógica de generación de alertas y precauciones.
    -   **Tests de Seguridad (RBAC):** Creada suite `security.test.js` para blindar endpoints críticos contra accesos no autorizados.
    -   **Mantenimiento de Tests:** Refactorizadas todas las suites anteriores para limpiar correctamente la BD de pruebas y evitar colisiones de Foreign Keys con las nuevas tablas (`WastageLog`, `Alert`). El proyecto cuenta ahora con 59 tests de integración (100% exitosos).

## 2026-03-03 (Finalización de Despliegue y Estabilización Cloud)
-   **[FIX] Backend: Resolución de Errores de Inicio y Conectividad:**
    -   Corregido un error crítico en `index.js` que causaba el cierre del contenedor en entornos con Express 5 al utilizar rutas con asterisco (`*`).
    -   Implementada carga garantizada de variables de entorno mediante `dotenv` al inicio del proceso, asegurando el acceso a `DATABASE_URL` en producción.
    -   Establecida conexión robusta con Cloud SQL utilizando el proxy nativo de Google y Sockets Unix, eliminando problemas de red y firewall.
-   **[FIX] CORS y Seguridad Dinámica:**
    -   Refactorizada la configuración de CORS para que sea dinámica y configurable mediante la variable de entorno `CORS_ALLOWED_ORIGINS`, permitiendo una gestión segura de accesos sin cambios de código.
-   **[FEAT] UX: Indicador de Disponibilidad en Producción:**
    -   Mejorada la interfaz de "Orden de Producción Interna" con un botón de registro dinámico: ahora cambia a color verde (`btn-success`) solo cuando hay stock suficiente de todos los componentes, eliminando la ambigüedad visual.
-   **[FIX] Estabilidad de Datos y Validación:**
    -   Corregido error 400 en la creación de clientes al permitir que los campos opcionales como el email lleguen vacíos desde el frontend (pre-procesamiento de Zod).
    -   Sincronizada la estructura de la base de datos de producción mediante el despliegue exitoso de todas las migraciones acumuladas.

## 2026-02-28 (Plan de Despliegue a Producción y Validación de Estabilidad)
-   **[CHORE] Documentación y Estrategia de Despliegue:**
    -   Diseñado y documentado en el `Roadmap.md` un plan de acción completo para el despliegue a producción en Google Cloud.
    -   La estrategia se basa en contenedores optimizados con builds multi-etapa: el backend en Cloud Run y el frontend con Nginx, también en Cloud Run.
    -   Se ha añadido documentación detallada sobre el flujo de instalación de la PWA en dispositivos Android, explicando la experiencia de usuario ("Añadir a pantalla de inicio"), la seguridad del sandbox del navegador y la importancia del "Almacenamiento Persistente" para la fiabilidad offline.
-   **[TEST] Estabilización del Backend:**
    -   Se ejecutó la suite completa de tests de integración del backend para validar el estado actual de la aplicación.
    -   Se identificó y corrigió un test fallido en `sales.test.js` que no estaba alineado con la lógica de negocio actual de permitir ventas con stock negativo.
    -   Se confirmó que la suite de pruebas completa (45/45 tests) ahora pasa con éxito, asegurando la estabilidad del backend antes de proceder con el despliegue.
-   **[CHORE] Sincronización de Documentación:**
    -   Actualizado el `Roadmap.md` para marcar la `Fase 17` (Implementación de Service Worker Básico) como completada.
    -   Actualizadas las tareas `16.1` y `16.2` (Configuración de GCP y DB) como completadas.
    -   Refactorizado el `Roadmap.md` para reflejar con precisión el estado actual del proyecto y los planes de despliegue.

## 2026-02-26 (Arquitectura "Logística Inmortal" y Sincronización Proactiva)
-   **[FEAT] Arquitectura Offline-First (Local-First):**
    -   Integración de `dexie` y `dexie-react-hooks` para almacenamiento local (IndexedDB).
    -   Refactorización del Panel de Logística (`LogisticsDashboardPage`) para leer datos directamente de la base local usando `useLiveQuery`, garantizando funcionamiento sin conexión y tiempos de carga instantáneos.
    -   Creación de `SyncService` para manejar la descarga inicial (`initialSync`) tras el login y la sincronización incremental (`deltaSync`).
-   **[FEAT] Sincronización Híbrida y Proactiva:**
    -   Implementación de `triggerSync` en `SyncContext` para forzar la sincronización inmediata tras cada acción del usuario (asignar, entregar, recibir, cancelar, etc.), eliminando la sensación de "retraso".
    -   La aplicación ahora detecta automáticamente cuando recupera la conexión a internet y ejecuta una sincronización de fondo.
    -   Seguridad mejorada: Borrado automático de la base de datos local de Dexie al cerrar sesión (`logout`) para evitar brechas de seguridad en dispositivos compartidos.
-   **[FEAT] Backend: Hidratación de Respuestas y Endpoints de Sincronización:**
    -   Nuevos endpoints `/api/external-production-orders/active` y `GET /api/products?all=true` para optimizar la descarga masiva de datos iniciales.
    -   Los endpoints de creación (`POST /`), asignación de retiro (`POST /:id/assign-pickup`) y recepción de mercadería (`POST /:id/receive`) de órdenes externas ahora devuelven el objeto completamente "hidratado" (con todas sus relaciones: `assembler`, `items`, `expectedOutputs`, usuarios). Esto elimina errores de UI (como los `.map()` fallidos en la recepción) al actualizar el estado local de forma optimista.
-   **[FIX] Refinamientos de UI/UX y Rendimiento:**
    -   Resolución del problema de los "N/A" temporales en el Panel de Logística (las relaciones de Armador y Usuario asignado ahora se resuelven cruzando IDs con los diccionarios locales en lugar de depender de la anidación del backend).
    -   Implementación de **Debounce (1 segundo)** en el buscador de la página de "Venta / Rechazo" (`InventoryAdjustmentPage`) para evitar el parpadeo molesto de la pantalla y prevenir la sobrecarga de consultas a la API mientras el usuario escribe.
    -   Corrección del endpoint `GET /api/inventory/movements` para que el filtro de búsqueda global (`search`) funcione correctamente sobre códigos de producto, descripciones, nombres de clientes y números de orden, lo que reactiva el buscador de la página de ajustes.

## 2026-01-28 (Integración Cloud, PWA y Corrección de Bugs Críticos)
-   **[FEAT] Configuración de Infraestructura en Google Cloud:**
    -   Creación y configuración del proyecto `zap-pwa` en GCP.
    -   Habilitación de APIs esenciales (Compute, Cloud Run, Artifact Registry, Cloud Build, SQL Admin, Secret Manager).
    -   Creación de instancia de Cloud SQL (PostgreSQL `zap-db`) y base de datos (`zap_pwa_db`).
    -   Creación de usuario `zap_pwa_user` para la base de datos y almacenamiento seguro de la `DATABASE_URL` en Google Secret Manager.
-   **[FEAT] Implementación Básica del Modo Offline (PWA):**
    -   Instalación y configuración de `vite-plugin-pwa` para el frontend.
    -   Generación automática de `manifest.webmanifest` y `sw.js` (Service Worker).
    -   Configuración inicial de iconos para la PWA.
    -   Implementación de estrategia `NetworkFirst` con caché para llamadas a la API (confirmado su funcionamiento para datos ya vistos online).
    -   Confirmación de que el "App Shell" carga offline.
-   **[FIX] Estabilización del Entorno de Desarrollo Local:**
    -   Corrección de problemas de conexión del backend local a Cloud SQL mediante la configuración correcta de la `DATABASE_URL` en `backend/.env` (eliminando comillas y espacios, y usando `dotenv`).
    -   Resolución de error de conectividad a la base de datos (IP pública no autorizada en Cloud SQL).
    -   Aplicación de migraciones (`npx prisma migrate deploy`) y seed (`npx prisma db seed`) a la base de datos de Cloud SQL.
    -   Corrección de error de CORS al conectar el frontend preview con el backend local.
-   **[FIX] Bug Crítico en Panel de Logística:**
    -   Resolución del bug que impedía a los usuarios `EMPLOYEE` ver y usar los botones de acción para órdenes en estado `PARTIALLY_RECEIVED` en el Panel de Logística.

## 2026-01-21 (Fase 15: Refinamientos de UI/UX y Flujos de Trabajo)
-   **[FEAT/FIX] Refactorización y Corrección de Flujos de Tareas Logísticas:**
    -   **[FIX] UI/UX Modal "Pendientes":** Se corrigió el desbordamiento de texto en la vista de escritorio del modal "Pendientes" en la página de gestión de ensambladores.
    -   **[FEAT] UI/UX Modal "Pendientes":** Se implementó un submenú colapsable para visualizar los materiales enviados en el modal "Pendientes".
    -   **[FEAT] UI/UX Botón "Pendientes":** Se cambió el color del botón "Pendientes" a un amarillo claro para mejorar su visibilidad.
    -   **[FIX] Backend Dashboard:** Se ajustaron los enlaces de las tareas de órdenes de producción externa en el dashboard para que dirijan al "Panel de Logística" (`/logistics-dashboard`).
    -   **[FIX] Frontend Flujo PENDING_PICKUP:** Se corrigió un bug crítico que impedía a `SUPERVISOR`s y `ADMIN`s confirmar sus propias tareas de recogida. El problema se debía a una inconsistencia de tipos entre `order.pickupUserId` (Number) y `currentUser.id` (String).
    -   **[FEAT] Extensión de Roles:** Se extendieron las capacidades de asignación y confirmación de tareas de recogida y entrega al rol `ADMIN`.
## 2026-01-21 (Fase 16 y 17: Plan de Acción para PWA y Despliegue)
-   **[CHORE] Documentación:** Se ha añadido al `Roadmap.md` un plan de acción detallado para la implementación de las capacidades PWA y el despliegue en la nube.
    -   Se creó la **Fase 16: Implementación de Capacidades PWA (Offline y Instalación)**, que detalla los pasos para crear el `manifest.json` y el `sw.js` (Service Worker).
    -   Se creó la **Fase 17: Despliegue en la Nube y Puesta en Producción**, que describe el proceso para migrar la base de datos, el backend y el frontend a una infraestructura en la nube (Google Cloud).
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
    -   **[REFACTOR] Backend:** Se deprecó el endpoint obsoleto `POST /product-design/:id/assembly-cost` y se implementó el nuevo endpoint `PUT /product-design/:productId/trabajo-armado` para vincular productos con trabajos de armado.
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