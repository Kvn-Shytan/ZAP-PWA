# Guía de Pruebas del Backend

Este documento sirve como plantilla y guía para crear nuevos tests de integración para la API del backend.

## Filosofía

Nuestros tests buscan simular peticiones HTTP reales a los endpoints y verificar que la respuesta (código de estado, cuerpo del JSON) sea la correcta. Usamos una base de datos de prueba real y aislada que se crea y destruye con cada ejecución.

## Archivo de Plantilla: `products.test.js`

Este es el código de nuestro primer test. Úsalo como base para crear nuevos archivos de prueba para otras rutas (ej. `categories.test.js`, `users.test.js`, etc.).

```javascript
const request = require('supertest');
const express = require('express');
const productsRouter = require('./products.routes'); // 1. Importa el router que quieres probar

// 2. Mockea los middlewares de autenticación
jest.mock('../authMiddleware', () => ({
  authenticateToken: (req, res, next) => {
    // Simula un usuario logueado. Cambia el rol según lo que necesites probar.
    req.user = { id: 1, role: 'ADMIN', username: 'testadmin' };
    next();
  },
  authorizeRole: (roles) => (req, res, next) => {
    // Para los tests, simplemente permitimos que la petición pase.
    // La lógica de roles se testea en su propio archivo de test.
    next();
  },
}));

// 3. Crea una app de Express temporal para el test
const app = express();
app.use(express.json());
app.use('/api/products', productsRouter); // Monta el router en la app

// 4. Define la suite de tests
describe('GET /api/products', () => {
  // Define un test individual
  it('should return 200 OK and a list of products', async () => {
    // 5. Ejecuta la petición usando supertest
    const res = await request(app).get('/api/products?all=true');

    // 6. Define las expectativas (assertions)
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('products');
    expect(Array.isArray(res.body.products)).toBe(true);

    // Como la BD de prueba está vacía al inicio de este test,
    // esperamos una lista de productos vacía.
    expect(res.body.products.length).toBe(0);
  });

  // ... puedes añadir más tests 'it(...)' aquí para otros casos
});
```

### Pasos para Crear un Nuevo Test

1.  Crea un nuevo archivo con el sufijo `.test.js` (ej. `users.test.js`) en la misma carpeta que el archivo de rutas que quieres probar.
2.  Copia y pega el contenido de la plantilla.
3.  Ajusta las importaciones y el montaje de la `app` para que apunten a tu nueva ruta.
4.  Dentro del `describe`, escribe tus bloques `it` para cada caso que quieras probar (crear, obtener, fallar por falta de permisos, etc.).
5.  Usa `await request(app).get('/ruta')`, `await request(app).post('/ruta').send({ ... })`, etc., para simular las peticiones.
6.  Usa `expect(...)` para verificar los resultados.
