# Backlog del Proyecto ZAP PWA

Este documento contiene la lista de tareas pendientes y futuras para el desarrollo de la PWA de ZAP, priorizadas según el roadmap y las necesidades del negocio.

## 1. Fase 2: Módulo de Productos e Inventario (Continuación)

### Tareas Pendientes de API (Backend)
-   [ ] Implementar `PUT /products/:id` - Actualizar un producto.
-   [ ] Implementar `DELETE /products/:id` - Eliminar un producto.
-   [ ] Implementar API para la gestión de `RawMaterial` (CRUD).
-   [ ] Implementar API para la gestión de `Category` (CRUD).
-   [ ] Implementar API para la gestión de `Supplier` (CRUD).
-   [ ] Implementar API para registrar `InventoryMovement` (entrada, salida, ajuste).
-   [ ] Implementar API para obtener alertas de stock bajo (productos y materia prima).

### Tareas Pendientes de UI (Frontend)
-   [ ] Desarrollar interfaz de usuario para la gestión de productos (listado, detalle, creación, edición, eliminación).
-   [ ] Desarrollar interfaz de usuario para la gestión de materia prima (listado, detalle, creación, edición, eliminación).
-   [ ] Desarrollar interfaz de usuario para la gestión de categorías.
-   [ ] Desarrollar interfaz de usuario para la gestión de proveedores.
-   [ ] Desarrollar interfaz de usuario para registrar movimientos de inventario.
-   [ ] Desarrollar interfaz de usuario para visualizar alertas de stock bajo.

### Lógica de Negocio
-   [ ] Implementar lógica de control de stock (aumentar/disminuir) para productos terminados y materia prima.

## 2. Fase 3: Módulo de Armadores (Alta Prioridad)

### Tareas de API (Backend)
-   [ ] Implementar API para la gestión de `Assembler` (CRUD).
-   [ ] Implementar API para registrar `MaterialDelivery` (envío de materia prima a armador).
-   [ ] Implementar API para registrar `ProductReceipt` (recepción de productos de armador).
-   [ ] Implementar lógica de backend para comparar `MaterialDelivery` y `ProductReceipt` y detectar faltantes.
-   [ ] Implementar lógica de backend para calcular la producción por armador.

### Tareas de UI (Frontend)
-   [ ] Desarrollar interfaz de usuario para la gestión de armadores (listado, detalle, creación, edición, eliminación).
-   [ ] Desarrollar interfaz de usuario para registrar envíos de materia prima a armadores.
-   [ ] Desarrollar interfaz de usuario para registrar recepciones de productos de armadores.
-   [ ] Desarrollar interfaz de usuario para visualizar faltantes y producción por armador.

## 3. Fase 4: Módulo de Personal Interno

### Tareas de API (Backend)
-   [ ] Implementar API para la gestión de `User` (CRUD).
-   [ ] Implementar API de autenticación (login).
-   [ ] Implementar middleware de autorización basado en roles.

### Tareas de UI (Frontend)
-   [ ] Desarrollar interfaz de usuario para la gestión de personal (listado, detalle, creación, edición, eliminación).
-   [ ] Desarrollar interfaz de usuario para el login.

## 4. Fase 5: Funcionalidad Offline y PWA

### Tareas Técnicas
-   [ ] Configurar el manifiesto de la aplicación (`manifest.json`).
-   [ ] Implementar Service Worker para caching de assets.
-   [ ] Implementar Service Worker para sincronización en segundo plano (`Background Sync API`).
-   [ ] Integrar librería de almacenamiento local (ej. `localforage` o `Dexie.js`) para datos offline.
-   [ ] Desarrollar lógica de sincronización de datos entre el frontend offline y el backend.

## 5. Fase 6: Despliegue y Pruebas

### Tareas de DevOps
-   [ ] Configurar `Dockerfile`s de producción para frontend y backend.
-   [ ] Configurar Terraform para el despliegue en Google Cloud (Cloud Run, Cloud SQL, Secret Manager, VPC Access Connector).
-   [ ] Configurar CI/CD (Cloud Build, Cloud Deploy).

### Tareas de Pruebas
-   [ ] Realizar pruebas unitarias para backend y frontend.
-   [ ] Realizar pruebas de integración.
-   [ ] Realizar pruebas E2E (Playwright/Cypress).
-   [ ] Realizar pruebas con usuarios finales y recoger feedback.

## 6. Tareas Generales

-   [ ] Implementar logging y monitoreo.
-   [ ] Mejorar la gestión de errores en frontend y backend.
-   [ ] Refinar la UI/UX basándose en el feedback.
