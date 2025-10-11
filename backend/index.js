const express = require('express');
const cors = require('cors');
const productRoutes = require('./routes/products.routes');
const categoryRoutes = require('./routes/categories.routes');
const supplierRoutes = require('./routes/suppliers.routes');
const armadoresRoutes = require('./routes/armadores.routes.js');
const trabajoDeArmadoRoutes = require('./routes/trabajoDeArmado.routes.js');
const usersRoutes = require('./routes/users.routes.js');
const inventoryRoutes = require('./routes/inventory.routes.js');
const externalProductionOrdersRoutes = require('./routes/externalProductionOrders.routes.js');
const overheadCostsRoutes = require('./routes/overheadCosts.routes.js');
const productDesignRoutes = require('./routes/productDesign.routes.js');
const authRoutes = require('./routes/auth.routes.js');
const errorHandler = require('./middleware/errorHandler.js');

const prisma = require('./prisma/client');
const app = express();
const port = 3001;

app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173' })); // Use cors middleware

app.get('/api/', (req, res) => {
  res.send('¡El Backend de ZAP PWA está funcionando!');
});

// Use product routes
app.use('/api/products', productRoutes);

// Use category routes
app.use('/api/categories', categoryRoutes);

// Use supplier routes
app.use('/api/suppliers', supplierRoutes);

// Use armadores routes
app.use('/api/assemblers', armadoresRoutes);

// Use trabajo de armado routes
app.use('/api/trabajos-armado', trabajoDeArmadoRoutes);

// Use external production orders routes
app.use('/api/external-production-orders', externalProductionOrdersRoutes);

// Use overhead costs routes
app.use('/api/overhead-costs', overheadCostsRoutes);

// Use product design routes
app.use('/api/product-design', productDesignRoutes);

// Use auth routes
app.use('/api', authRoutes);

// Use user routes
app.use('/api/users', usersRoutes);

// Use inventory routes
app.use('/api/inventory', inventoryRoutes);

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  const error = new Error('Not Found');
  error.statusCode = 404;
  next(error);
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Backend escuchando en http://localhost:${port}`);
});