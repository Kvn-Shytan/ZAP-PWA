# Documento de Requisitos de Producto (PRD) para ZAP PWA

## 1. Visión General del Producto

La PWA de ZAP es una herramienta interna diseñada para optimizar la gestión de operaciones diarias de la empresa, con un enfoque CRÍTICO en el control y seguimiento de los **armadores externos**. Además, incluirá la gestión de inventario, productos y personal. Su objetivo principal es proporcionar una interfaz sencilla y accesible para un equipo pequeño, incluyendo colaboradores con poca experiencia tecnológica, garantizando al mismo tiempo funcionalidad offline y alta seguridad.

## 2. Objetivos del Producto

-   **Control exhaustivo de armadores:** Asegurar que toda la materia prima entregada a los armadores sea devuelta como producto terminado, evitando faltantes y robos.
-   **Cálculo preciso de pagos a armadores:** Facilitar el seguimiento de la producción de cada armador para calcular sus pagos de forma quincenal o mensual.
-   Mejorar la eficiencia en la gestión de inventario (incluyendo materia prima) y productos terminados.
-   Facilitar la administración del personal y sus roles.
-   Permitir la operación continua incluso sin conexión a internet.
-   Reducir la barrera tecnológica para los usuarios finales.
-   Asegurar la integridad y confidencialidad de los datos.

## 3. Alcance del Producto

La PWA de ZAP incluirá los siguientes módulos principales:

### 3.1. Módulo de Armadores (CRÍTICO)
-   **Funcionalidad:** CRUD completo para la gestión de datos personales de los armadores (nombre, contacto, etc.).
-   **Seguimiento de Envíos a Armadores:** Registrar la materia prima y accesorios enviados a cada armador para el armado de productos específicos.
-   **Seguimiento de Recepciones de Armadores:** Registrar los productos terminados recibidos de cada armador, verificando que coincidan con los materiales enviados.
-   **Control de Faltantes:** Identificar y alertar sobre cualquier discrepancia entre lo enviado y lo recibido.
-   **Cálculo de Producción:** Registrar la cantidad de productos armados por cada armador para el cálculo de pagos.
-   **Interfaz:** Pantalla de listado de armadores, detalle de armador con historial de envíos/recepciones, formularios para registrar envíos y recepciones.

### 3.2. Módulo de Productos
-   **Funcionalidad:** CRUD completo para productos terminados (crear, leer, actualizar, eliminar).
-   **Atributos del Producto:** Nombre, descripción, precio, categoría, proveedor, stock actual (de productos terminados).
-   **Interfaz:** Pantalla de listado de productos con búsqueda y filtrado, pantalla de detalle/edición de producto, formulario de creación de producto.

### 3.3. Módulo de Inventario
-   **Funcionalidad:** Registro de movimientos de entrada y salida de stock para **materia prima** y **productos terminados**, ajuste manual de stock.
-   **Alertas:** Notificaciones para stock bajo (tanto de materia prima como de productos terminados).
-   **Interfaz:** Historial de movimientos por producto/materia prima, interfaz para ajustes de stock.

### 3.4. Módulo de Personal
-   **Funcionalidad:** CRUD para usuarios/colaboradores internos, asignación de roles (Administrador, Empleado).
-   **Seguridad:** Autenticación de usuarios, gestión de sesiones.
-   **Interfaz:** Pantalla de listado de usuarios, pantalla de detalle/edición de usuario, formulario de creación de usuario.

### 3.5. Funcionalidad PWA
-   **Offline:** Acceso y manipulación de datos sin conexión.
-   **Sincronización:** Sincronización automática de datos cuando la conexión se restablece.
-   **Instalabilidad:** La aplicación debe ser instalable en dispositivos de escritorio y móviles.

## 4. Usuarios del Producto

-   **Administrador (Dueño de ZAP):** Acceso completo a todos los módulos, gestión de productos, inventario (materia prima y terminados), personal y armadores.
-   **Colaboradores (2 personas):** Acceso limitado a la gestión de inventario (registro de envíos/recepciones a armadores, movimientos de stock) y productos, con una interfaz simplificada.
-   **Armadores:** No tendrán acceso a la aplicación, pero sus datos personales y su historial de producción serán gestionados dentro de ella.

## 5. Requisitos de Interfaz de Usuario (UI/UX)

-   **Simplicidad:** Diseño minimalista, con énfasis en la claridad y la facilidad de uso, especialmente para las tareas relacionadas con armadores y stock.
-   **Accesibilidad:** Botones grandes, fuentes legibles, contraste adecuado.
-   **Responsive:** Adaptable a diferentes tamaños de pantalla (móvil, tablet, escritorio).
-   **Feedback:** Retroalimentación clara para las acciones del usuario y el estado de la aplicación (ej. sincronización, errores).

## 6. Requisitos Técnicos (Alto Nivel)

-   **Frontend:** React con Vite.
-   **Backend:** Node.js con Prisma ORM.
-   **Base de Datos:** PostgreSQL.
-   **Despliegue:** Google Cloud (Cloud Run).

## 7. Métricas de Éxito

-   Reducción de faltantes de materia prima/productos en un X%.
-   Precisión del 100% en el cálculo de pagos a armadores.
-   Reducción del tiempo de gestión de inventario en un Y%.
-   Aumento de la precisión del inventario en un Z%.
-   Adopción del 100% por parte de los colaboradores.
-   Satisfacción del usuario (medida a través de feedback).
