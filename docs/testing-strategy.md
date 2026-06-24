# Roadmap de Testeo para ZAP PWA

Este documento detalla el roadmap de testeo para el backend y el frontend de ZAP PWA, los tipos de pruebas a implementar, la cobertura actual y los planes futuros. Será tratado como un roadmap de proyecto, pero focalizado en la suite de testeo.

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

## 4. Cobertura Actual de Tests (Backend) - Resumen

**Total Suites: 9 | Total Tests: 59 | Pasados: 59**

---

## 5. Roadmap de Testeo (Backend)

### 5.1. Módulo 1: Lógica de Inventario (Prioridad Alta)

*   **Objetivo:** Asegurar el principio "Resta 0" y validaciones robustas de stock.
*   **Cobertura Actual:**
    *   [ ] Tests para `POST /api/products` (creación de productos).
    *   [ ] Tests para `PUT /api/products/:id` (actualización de productos).
    *   [ ] Tests para `DELETE /api/products/:id` (eliminación de productos).
    *   [ ] Tests para validación de stock al crear/actualizar productos (ej. `PRE_ASSEMBLED` o `FINISHED` requieren `AssemblyJob`).
    *   [ ] Tests para validación de stock al crear órdenes (`POST /api/external-production-orders` y otros) que fallen si no hay stock suficiente para componentes (`RAW_MATERIAL`).
    *   [ ] Tests para `POST /api/inventory/purchase` (incremento de stock, creación de movimiento `PURCHASE`).
    *   [ ] Tests para `POST /api/inventory/production` (decremento de stock, creación de movimiento `PRODUCTION_IN`).
    *   [x] Tests para `POST /api/inventory/sale` (decremento de stock, creación de movimiento `SALE`, manejo de stock negativo permitido).
    *   [x] Tests para `POST /api/inventory/wastage` (decremento de stock, creación de movimiento `WASTAGE`, registro en `WastageLog`).
    *   [ ] Tests para `POST /api/inventory/reversal` (movimientos de ajuste, reversión de stock, manejo de casos límite).
    *   [ ] Tests para `POST /api/inventory/reversal` que verifiquen que la anulación falle si resultaría en stock negativo.
    *   [ ] Test de integración de flujo completo "Resta 0": Crear producto, componentes, registrar compra, crear orden externa, etc., verificando stock y estados en cada paso.

### 5.2. Módulo 2: Panel de Logística (Prioridad Media)

*   **Objetivo:** Control robusto de la producción externa y seguimiento financiero/logístico.
*   **Cobertura Actual:**
    *   [x] Tests para `POST /api/external-production-orders` (creación de órdenes).
    *   [x] Tests para `POST /api/external-production-orders/:id/confirm-delivery` (cambio de estado a `IN_ASSEMBLY`).
    *   [x] Tests para `POST /api/external-production-orders/:id/report-failure` (cambio de estado a `DELIVERY_FAILED`, creación de `OrderNote`).
    *   [x] Tests para `POST /api/external-production-orders/:id/confirm-assembly` (cambio de estado a `PENDING_PICKUP`).
    *   [x] Tests para `POST /api/external-production-orders/:id/assign-pickup` (asignación de usuario para recogida).
    *   [x] Tests para `POST /api/external-production-orders/:id/receive` (recepción perfecta, parcial, con/sin justificación, stock).
    *   [x] Tests para `GET /api/assemblers/payment-summary-batch` (cálculo de pagos pendientes de armadores).
    *   [x] Tests para `POST /api/assemblers/close-fortnight-batch` (registro de pago, enlace a órdenes pagadas, deducción de mermas).
    *   [ ] Tests para `GET /api/assemblers/:id/inventory` (devolución correcta de ítems en posesión del armador).
    *   [ ] Tests para transiciones de estado inválidas en órdenes de producción externa (ej. confirmar ensamblaje si la orden no está `IN_ASSEMBLY`).
    *   [ ] Tests para cancelación de órdenes en diferentes estados, con reversión de stock.

### 5.3. Módulo 3: Lógica Financiera (Mermas y Liquidación) (Prioridad Media)
*   **Objetivo:** Asegurar que los descuentos por materiales arruinados impacten exactamente como deben en la liquidación de pagos.
*   **Cobertura Actual:**
    *   [x] Tests de Integración (`wastage.test.js`) para `POST /api/inventory/wastage` (descuento de inventario, registro de `WastageLog` y retención del flag `costDeducted: false`).
    *   [x] Tests de Integración (`wastage.test.js`) para `POST /api/assemblers/close-fortnight-batch` que calculen correctamente el total a pagar restando el costo del producto fallado, y cambien el estado de la merma a `costDeducted: true`.

### 5.4. Módulo 4: Motor de Reglas (Dashboard) (Prioridad Media)
*   **Objetivo:** Confirmar que los algoritmos de detección de inactividad, bajo stock y bajo rendimiento son precisos.
*   **Cobertura Actual:**
    *   [x] Tests de Integración (`dashboard.test.js`) para simular en BD órdenes creadas hace más de 3 días hábiles y armadores con 3 mermas recientes.
    *   [x] Tests de Integración (`dashboard.test.js`) para afirmar que `GET /api/dashboard` retorna las Alertas Críticas y Precauciones correctamente.

### 5.5. Módulo 5: Seguridad y Autorización (Prioridad Alta)
*   **Objetivo:** Asegurar que el Role-Based Access Control (RBAC) no tenga brechas.
*   **Cobertura Actual:**
    *   [x] Tests de Endpoints Restringidos (`security.test.js`) para `POST /api/assemblers/close-fortnight-batch` (solo `ADMIN`).
    *   [x] Tests de Endpoints Restringidos (`security.test.js`) para `GET /api/assemblers/payment-summary-batch` (solo `ADMIN` y `SUPERVISOR`).
    *   [ ] Tests de Endpoints Restringidos para otras rutas críticas (ej. creación/edición de productos, usuarios) con tokens simulados de `EMPLOYEE` o `SUPERVISOR` y validar la respuesta `403 Forbidden`.

---

## 6. Roadmap de Testeo (Frontend)

### 6.1. Módulo 6: Funcionalidad Offline (PWA Frontend) (Prioridad Alta)
*   **Objetivo:** Fiabilidad offline y sincronización en cliente.
*   **Cobertura Actual:**
    *   [ ] Tests Unitarios (Frontend): Probar que `SyncService` escriba correctamente en IndexedDB (`dexie`) cuando simula la pérdida de conectividad (`navigator.onLine = false`).
    *   [ ] Tests de Integración (Frontend): Ciclo de vida del Service Worker y estrategias de cacheo.

### 6.2. Módulo 7: UI/UX (Prioridad Media)
*   **Objetivo:** Asegurar que los componentes y flujos de usuario se renderizan correctamente y son funcionales.
*   **Cobertura Actual:**
    *   [ ] Tests de componentes (ej. React Testing Library) para `Navbar`, `Modal`, `CriticalAlertCard`, etc.
    *   [ ] Tests de flujos de usuario (ej. Cypress, Playwright) para Login, creación de órdenes, recepción de mercadería, etc. (simulando interacción real del usuario).

---

## 7. Próximos Pasos (Orden de Trabajo Sugerido)

1.  **Backend - Módulo de Inventario:**
    *   Crear tests para `POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id` y sus validaciones de stock.
    *   Crear tests para `POST /api/inventory/purchase`, `POST /api/inventory/production`, `POST /api/inventory/reversal`.
    *   Implementar el test de flujo completo "Resta 0".
2.  **Backend - Módulo de Logística y Seguridad:**
    *   Añadir tests para `GET /api/assemblers/:id/inventory`.
    *   Extender tests de seguridad a otras rutas críticas.
3.  **Frontend - Funcionalidad Offline y UI/UX:**
    *   Desarrollar tests unitarios para `SyncService` y la lógica de `Dexie`.
    *   Comenzar a implementar tests de componentes y flujos de usuario para las páginas críticas.