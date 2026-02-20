# Estrategia de Testeo para ZAP PWA

Este documento detalla la estrategia de testeo para el backend de ZAP PWA, los tipos de pruebas a implementar, la cobertura actual y los planes futuros.

## 1. Módulos Críticos y Priorización (Según el Dueño del Producto)

1.  **Lógica de Inventario:** Core del negocio, principio "Resta 0".
2.  **Panel de Logística:** Gestión de producción externa, armadores, seguimiento de stock en tránsito.
3.  **Funcionalidad Offline (PWA):** Crucial para el ambiente de producción (frontend).

## 2. Tipos de Pruebas Implementados

*   **Tests de Integración (Backend):** Utilizando `Jest` y `Supertest`. Se enfocan en probar los endpoints de la API interactuando con una base de datos de pruebas (`PostgreSQL` en Docker) para asegurar que la lógica de negocio y las interacciones con la base de datos funcionan correctamente.

## 3. Configuración del Entorno de Pruebas

*   **Base de Datos de Pruebas:** `PostgreSQL` en un contenedor Docker (`postgres-test`), aislado de la base de datos de desarrollo.
*   **Gestión de Variables de Entorno:** Utiliza `cross-env` en `package.json` para establecer `NODE_ENV=test` y `DATABASE_URL` para la base de datos de pruebas, asegurando que los comandos de `Prisma` y `Jest` accedan al entorno correcto.
*   **Limpieza de Base de Datos:** Los tests utilizan `beforeEach` y `afterEach` hooks para asegurar que la base de datos esté en un estado conocido y limpio antes y después de cada test (eliminando registros en el orden correcto para evitar violaciones de claves foráneas).

## 4. Cobertura Actual de Tests (Backend)

*   **`categories.test.js`**: Pruebas de integración para `POST /api/categories` (creación de categorías con y sin nombre válido). **(Pasando)**
*   **`products.test.js`**: Pruebas de integración para `GET /api/products?all=true` (listado de productos). **(Pasando)**
*   **`externalProductionOrders.test.js`**: Pruebas de integración exhaustivas para el ciclo de vida de las órdenes de producción externas (creación, confirmación de entrega, reporte de fallos, confirmación de ensamblaje, asignación de recogida, recepción de mercancías, transiciones de estado). **(Pasando)**

## 5. Planes Futuros y Gaps Identificados (Backend)

### 5.1. Módulo 1: Lógica de Inventario (Prioridad Alta)

*   **Objetivo:** Asegurar el principio "Resta 0" y validaciones robustas de stock.
*   **Gaps y Nuevos Tests Propuestos:**
    *   **Validación de Stock al Crear/Actualizar Productos:**
        *   Tests para `POST /api/products` y `PUT /api/products/:id` que validen que productos `PRE_ASSEMBLED` o `FINISHED` requieren un `AssemblyJob` asignado.
    *   **Validación de Stock al Crear Órdenes:**
        *   Tests para `POST /api/external-production-orders` (y otros tipos de órdenes de producción) que verifiquen que la creación falla (con `400 Bad Request` y mensaje adecuado) si no hay stock suficiente para los componentes (`RAW_MATERIAL`).
    *   **Movimientos de Inventario (Pruebas exhaustivas):**
        *   Tests para `POST /api/inventory/purchase`, `POST /api/inventory/production`, `POST /api/inventory/sale`, `POST /api/inventory/wastage`, `POST /api/inventory/reversal`. Verificar:
            *   Correcto incremento/decremento de stock.
            *   Creación del tipo de movimiento (`PURCHASE`, `PRODUCTION_IN`, `SALE`, `WASTAGE`, `ADJUSTMENT_IN`/`OUT`).
            *   Manejo de casos límite (stock negativo si no está permitido).
        *   **NUEVO: Lógica de ANULAR movimientos sin stock suficiente:**
            *   Test para `POST /api/inventory/reversal` (o endpoint de anulación): Verificar que la acción `ANULAR` falle si la reversión resultaría en stock negativo.
    *   **Flujo Integrado "Resta 0":**
        *   Test de integración de flujo completo: Crear producto, componentes, registrar compra, crear orden externa, etc., verificando stock y estados en cada paso.

### 5.2. Módulo 2: Panel de Logística

*   **Objetivo:** Control robusto de la producción externa y seguimiento financiero/logístico.
*   **Gaps y Nuevos Tests Propuestos:**
    *   **Pagos a Armadores:**
        *   `GET /api/assemblers/payment-summary-batch`: Cálculo de pagos pendientes.
        *   `POST /api/assemblers/close-fortnight-batch`: Registro de pago, enlace a órdenes pagadas.
    *   **Seguimiento de Material en Posesión:**
        *   `GET /api/assemblers/:id/inventory`: Devolución correcta de ítems en posesión del armador.
    *   **Casos Límite de Transiciones de Estado:**
        *   Tests para transiciones de estado inválidas (ej. confirmar ensamblaje si la orden no está `IN_ASSEMBLY`).
        *   Tests para cancelación de órdenes en diferentes estados, con reversión de stock.

### 5.3. Módulo 3: Funcionalidad Offline (PWA)

*   **Objetivo:** Fiabilidad offline y sincronización.
*   **Gaps y Nuevos Tests Propuestos (Principalmente Frontend):**
    *   **Tests Unitarios (Frontend):** IndexedDB, lógica de sincronización (cliente), serialización/deserialización.
    *   **Tests de Integración (Frontend):** Ciclo de vida del Service Worker, estrategias de cacheo (`StaleWhileRevalidate`, `NetworkFirst`), manejo de eventos de sincronización en segundo plano.
    *   **Tests E2E:** Flujos de usuario completos offline/online (Playwright/Cypress).