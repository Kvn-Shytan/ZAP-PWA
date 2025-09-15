# Especificación de Requisitos de Software (SRS) para ZAP PWA

## 1. Introducción

Este documento detalla los requisitos funcionales y no funcionales para la Aplicación Web Progresiva (PWA) interna de ZAP, diseñada para la gestión de inventario, productos, personal y, CRÍTICAMENTE, el control de armadores externos.

## 2. Requisitos Funcionales

### 2.1. Gestión de Armadores
-   **RF1.1:** La aplicación debe permitir a los usuarios crear, ver, actualizar y eliminar registros de armadores, incluyendo sus datos personales (nombre, contacto, etc.).
-   **RF1.2:** La aplicación debe permitir registrar el envío de materia prima y accesorios a un armador específico para el armado de productos.
-   **RF1.3:** La aplicación debe permitir registrar la recepción de productos terminados de un armador específico.
-   **RF1.4:** La aplicación debe comparar automáticamente la materia prima enviada con los productos terminados recibidos de un armador y alertar sobre cualquier discrepancia o faltante.
-   **RF1.5:** La aplicación debe llevar un registro de la cantidad de productos armados por cada armador para facilitar el cálculo de pagos.
-   **RF1.6:** La aplicación debe mostrar un historial detallado de envíos y recepciones por cada armador.

### 2.2. Gestión de Productos Terminados
-   **RF2.1:** La aplicación debe permitir a los usuarios crear nuevos productos terminados, especificando nombre, descripción, precio, categoría, proveedor y stock inicial.
-   **RF2.2:** La aplicación debe permitir a los usuarios ver una lista de todos los productos terminados, con opciones de búsqueda y filtrado.
-   **RF2.3:** La aplicación debe permitir a los usuarios ver los detalles de un producto terminado específico.
-   **RF2.4:** La aplicación debe permitir a los usuarios actualizar la información de un producto terminado existente.
-   **RF2.5:** La aplicación debe permitir a los usuarios eliminar productos terminados.

### 2.3. Gestión de Inventario (Materia Prima y Productos Terminados)
-   **RF3.1:** La aplicación debe registrar todos los movimientos de inventario (entradas y salidas) tanto para materia prima como para productos terminados.
-   **RF3.2:** La aplicación debe mostrar el historial de movimientos de inventario para cada ítem (materia prima o producto terminado).
-   **RF3.3:** La aplicación debe alertar a los usuarios cuando el stock de materia prima o productos terminados esté por debajo de un umbral predefinido.
-   **RF3.4:** La aplicación debe permitir a los usuarios ajustar manualmente el stock de cualquier ítem de inventario.

### 2.4. Gestión de Personal Interno
-   **RF4.1:** La aplicación debe permitir a los administradores crear, ver, actualizar y eliminar cuentas de usuario para el personal interno.
-   **RF4.2:** La aplicación debe soportar diferentes roles de usuario (ej. Administrador, Empleado) con permisos diferenciados.
-   **RF4.3:** La aplicación debe permitir a los usuarios internos iniciar sesión de forma segura.

### 2.5. Funcionalidad PWA y Offline
-   **RF5.1:** La aplicación debe ser instalable en dispositivos de escritorio y móviles.
-   **RF5.2:** La aplicación debe funcionar completamente offline, permitiendo a los usuarios realizar operaciones CRUD básicas para armadores, productos e inventario.
-   **RF5.3:** La aplicación debe sincronizar automáticamente los datos locales con el servidor cuando se restablezca la conexión a internet.
-   **RF5.4:** La aplicación debe proporcionar retroalimentación visual al usuario sobre el estado de la conexión y la sincronización.

## 3. Requisitos No Funcionales

### 3.1. Usabilidad (UI/UX)
-   **RNF3.1.1:** La interfaz de usuario debe ser extremadamente simple, intuitiva y fácil de usar para personas con poca experiencia tecnológica, especialmente en los flujos de trabajo de armadores e inventario.
-   **RNF3.1.2:** La aplicación debe tener un diseño limpio, con botones grandes y texto claro.
-   **RNF3.1.3:** La navegación debe ser sencilla y directa.

### 3.2. Rendimiento
-   **RNF3.2.1:** La aplicación debe cargar rápidamente, incluso en conexiones lentas.
-   **RNF3.2.2:** Las operaciones CRUD deben responder en menos de 2 segundos.

### 3.3. Seguridad
-   **RNF3.3.1:** La aplicación debe proteger los datos sensibles (incluyendo datos de armadores y personal) mediante cifrado.
-   **RNF3.3.2:** La autenticación de usuarios internos debe ser robusta y segura.
-   **RNF3.3.3:** La aplicación debe prevenir ataques comunes como inyección SQL, XSS, CSRF.

### 3.4. Fiabilidad
-   **RNF3.4.1:** La aplicación debe manejar errores de red y de servidor de forma elegante, informando al usuario.
-   **RNF3.4.2:** La aplicación debe asegurar la integridad de los datos durante la sincronización offline, especialmente para los movimientos de armadores.

### 3.5. Compatibilidad
-   **RNF3.5.1:** La aplicación debe ser compatible con los navegadores web modernos (Chrome, Firefox, Edge).
-   **RNF3.5.2:** La aplicación debe ser responsive y funcionar correctamente en diferentes tamaños de pantalla (escritorio, tablet, móvil).