const express = require('express');
const cors = require('cors');
const productRoutes = require('./routes/products.routes');
const categoryRoutes = require('./routes/categories.routes');
const supplierRoutes = require('./routes/suppliers.routes');
const assemblersRoutes = require('./routes/assemblers.routes.js');
const assemblyJobsRoutes = require('./routes/assemblyJobs.routes.js');
const usersRoutes = require('./routes/users.routes.js');
const inventoryRoutes = require('./routes/inventory.routes.js');
const externalProductionOrdersRoutes = require('./routes/externalProductionOrders.routes.js');
const overheadCostsRoutes = require('./routes/overheadCosts.routes.js');
const productDesignRoutes = require('./routes/productDesign.routes.js');
const authRoutes = require('./routes/auth.routes.js');
const dashboardRoutes = require('./routes/dashboard.routes.js'); // NUEVO: Importar dashboardRoutes
const clientsRoutes = require('./routes/clients.routes.js'); // NEW
const priceTiersRoutes = require('./routes/priceTiers.routes.js'); // NEW
const salesRoutes = require('./routes/sales.routes.js'); // NEW
const errorHandler = require('./middleware/errorHandler.js');

const prisma = require('./prisma/client');
const app = express();
const port = 3001;

app.use(express.json());
// Define allowed origins
const allowedOrigins = ['http://localhost:4173', 'http://localhost:5173', 'http://localhost:8080'];

// If a frontend URL is provided via environment variable (e.g., in production), allow it
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));

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
app.use('/api/assemblers', assemblersRoutes);

// Use trabajo de armado routes
app.use('/api/assembly-jobs', assemblyJobsRoutes);

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

// Use clients routes
app.use('/api/clients', clientsRoutes); // NEW

// Use price tiers routes
app.use('/api/price-tiers', priceTiersRoutes); // NEW

// Use sales routes
app.use('/api/sales', salesRoutes); // NEW

// NUEVO: Usar dashboard routes
app.use('/api/dashboard', dashboardRoutes);

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