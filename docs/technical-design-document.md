# Documento de Diseño Técnico (TDD) para ZAP PWA

## 1. Introducción

Este documento detalla el diseño técnico de la PWA de ZAP, especificando la implementación de los componentes clave y las decisiones a bajo nivel.

## 2. Diseño de la Base de Datos (Prisma Schema)

El `schema.prisma` se actualizará para incluir los siguientes modelos, reflejando la funcionalidad de armadores, productos, inventario y personal:

```prisma
// backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  username  String   @unique
  password  String
  role      String   @default("Empleado") // 'Administrador', 'Empleado'
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Assembler {
  id                 String              @id @default(uuid())
  name               String
  contactInfo        String?
  address            String?
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  materialDeliveries MaterialDelivery[]
  productReceipts    ProductReceipt[]
}

model Product {
  id                 String             @id @default(uuid())
  name               String
  description        String?
  price              Float
  stock              Int                @default(0)
  minStock           Int                @default(0) // Umbral para alertas de stock bajo
  categoryId         String
  supplierId         String
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt
  category           Category           @relation(fields: [categoryId], references: [id])
  supplier           Supplier           @relation(fields: [supplierId], references: [id])
  inventoryMovements InventoryMovement[]
  productReceipts    ProductReceipt[]
}

model RawMaterial {
  id                 String             @id @default(uuid())
  name               String
  description        String?
  stock              Int                @default(0)
  minStock           Int                @default(0) // Umbral para alertas de stock bajo
  supplierId         String
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt
  supplier           Supplier           @relation(fields: [supplierId], references: [id])
  materialDeliveries MaterialDelivery[]
  inventoryMovements InventoryMovement[]
}

model Category {
  id        String    @id @default(uuid())
  name      String    @unique
  products  Product[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Supplier {
  id        String        @id @default(uuid())
  name      String        @unique
  contactInfo String?
  products  Product[]
  rawMaterials RawMaterial[]
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
}

model InventoryMovement {
  id          String    @id @default(uuid())
  itemId      String    // Puede ser ProductId o RawMaterialId
  itemType    String    // 'Product' o 'RawMaterial'
  quantity    Int
  type        String    // 'Entrada', 'Salida', 'Ajuste'
  reason      String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  productId   String?   @map("product_id")
  rawMaterialId String?   @map("raw_material_id")
  product     Product?    @relation(fields: [productId], references: [id])
  rawMaterial RawMaterial? @relation(fields: [rawMaterialId], references: [id])
}

model MaterialDelivery {
  id            String       @id @default(uuid())
  assemblerId   String
  rawMaterialId String
  quantity      Int
  deliveryDate  DateTime     @default(now())
  status        String       @default("Pendiente") // 'Pendiente', 'Completado', 'Parcial'
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  assembler     Assembler    @relation(fields: [assemblerId], references: [id])
  rawMaterial   RawMaterial  @relation(fields: [rawMaterialId], references: [id])
}

model ProductReceipt {
  id            String    @id @default(uuid())
  assemblerId   String
  productId     String
  quantity      Int
  receiptDate   DateTime  @default(now())
  status        String    @default("Recibido") // 'Recibido', 'Faltante'
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  assembler     Assembler @relation(fields: [assemblerId], references: [id])
  product       Product   @relation(fields: [productId], references: [id])
}
```

## 3. Diseño del Backend (Node.js/Express.js)

### 3.1. Estructura de Carpetas

```
backend/
├── src/
│   ├── controllers/      // Lógica de negocio para cada ruta
│   │   ├── authController.js
│   │   ├── productController.js
│   │   ├── assemblerController.js
│   │   ├── inventoryController.js
│   │   └── ...
│   ├── routes/           // Definición de rutas de la API
│   │   ├── authRoutes.js
│   │   ├── productRoutes.js
│   │   ├── assemblerRoutes.js
│   │   ├── inventoryRoutes.js
│   │   └── ...
│   ├── services/         // Lógica de negocio reutilizable, interacción con Prisma
│   │   ├── authService.js
│   │   ├── productService.js
│   │   ├── assemblerService.js
│   │   ├── inventoryService.js
│   │   └── ...
│   ├── middleware/       // Middleware de autenticación, autorización, errores
│   │   ├── authMiddleware.js
│   │   └── errorMiddleware.js
│   ├── utils/            // Utilidades generales (ej. JWT, hashing)
│   │   ├── jwt.js
│   │   └── password.js
│   └── app.js            // Configuración de Express y carga de rutas
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── .env
├── package.json
└── index.js              // Punto de entrada principal (inicia el servidor)
```

### 3.2. APIs RESTful (Ejemplos)

#### Autenticación
-   `POST /api/auth/login`: Iniciar sesión de usuario.

#### Armadores
-   `GET /api/assemblers`: Obtener todos los armadores.
-   `GET /api/assemblers/:id`: Obtener un armador por ID.
-   `POST /api/assemblers`: Crear un nuevo armador.
-   `PUT /api/assemblers/:id`: Actualizar un armador.
-   `DELETE /api/assemblers/:id`: Eliminar un armador.
-   `POST /api/assemblers/:id/deliveries`: Registrar envío de materia prima a armador.
-   `POST /api/assemblers/:id/receipts`: Registrar recepción de productos de armador.

#### Productos
-   `GET /api/products`: Obtener todos los productos.
-   `GET /api/products/:id`: Obtener un producto por ID.
-   `POST /api/products`: Crear un nuevo producto.
-   `PUT /api/products/:id`: Actualizar un producto.
-   `DELETE /api/products/:id`: Eliminar un producto.

#### Inventario
-   `POST /api/inventory/movements`: Registrar un movimiento de inventario (entrada/salida/ajuste).
-   `GET /api/inventory/stock-alerts`: Obtener alertas de stock bajo.

## 4. Diseño del Frontend (React/Vite)

### 4.1. Estructura de Carpetas

```
frontend/
├── src/
│   ├── components/       // Componentes reutilizables de UI
│   ├── pages/            // Vistas principales de la aplicación
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── ProductsPage.jsx
│   │   ├── ProductDetailPage.jsx
│   │   ├── AssemblersPage.jsx
│   │   ├── AssemblerDetailPage.jsx
│   │   ├── InventoryPage.jsx
│   │   └── ...
│   ├── services/         // Funciones para interactuar con la API del backend
│   │   ├── authService.js
│   │   ├── productService.js
│   │   ├── assemblerService.js
│   │   ├── inventoryService.js
│   │   └── ...
│   ├── hooks/            // Custom React Hooks
│   ├── contexts/         // Contextos de React para gestión de estado global
│   ├── utils/            // Utilidades generales
│   ├── assets/
│   ├── App.jsx           // Componente principal de la aplicación
│   ├── main.jsx          // Punto de entrada de la aplicación
│   └── index.css         // Estilos globales
├── public/
├── vite.config.js
└── ...
```

### 4.2. Gestión de Estado

Se utilizará React Context API o una librería de gestión de estado ligera (ej. Zustand, Jotai) para el estado global, y `useState`/`useReducer` para el estado local de los componentes.

### 4.3. Funcionalidad Offline

-   **Service Worker:** Implementación de un Service Worker para:
    -   Caching de assets estáticos (HTML, CSS, JS, imágenes).
    -   Estrategia `stale-while-revalidate` para recursos de la API.
    -   Sincronización en segundo plano (`Background Sync API`) para operaciones offline (ej. guardar un nuevo envío a armador).
-   **Almacenamiento Local:** `IndexedDB` (a través de una librería como `localforage` o `Dexie.js`) para almacenar datos de la aplicación cuando no hay conexión.

## 5. Despliegue

-   **Local:** `docker-compose up` para levantar todos los servicios.
-   **Producción (Google Cloud):**
    -   **Frontend:** Cloud Run (contenedor Nginx sirviendo los archivos estáticos de React).
    -   **Backend:** Cloud Run (contenedor Node.js).
    -   **Base de Datos:** Cloud SQL (PostgreSQL).
    -   **Conectividad:** Serverless VPC Access Connector para la conexión privada entre Cloud Run y Cloud SQL.
    -   **Secretos:** Google Secret Manager para credenciales y variables de entorno sensibles.

## 6. Seguridad

-   **Backend:**
    -   Validación de esquemas de entrada (ej. con `Joi` o `express-validator`).
    -   Hashing de contraseñas con `bcrypt`.
    -   Uso de JWT para sesiones seguras.
    -   Middleware de autorización basado en roles.
    -   Protección contra CORS, XSS, CSRF.
-   **Frontend:**
    -   Almacenamiento seguro de tokens (ej. `localStorage` con precauciones, o `httpOnly cookies`).
    -   Manejo de errores de API y redirección a login.
