const express = require('express');
const cors = require('cors');
// Load environment variables as early as possible
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
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
const port = process.env.PORT || 3001;

app.use(express.json());

// Define allowed origins for CORS
let allowedOrigins = [];

if (process.env.CORS_ALLOWED_ORIGINS) {
  // If the environment variable is set, use it to populate the allowed origins
  allowedOrigins = process.env.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
} else {
  // Fallback for local development environments
  console.log('CORS_ALLOWED_ORIGINS environment variable not set. Falling back to default development origins.');
  allowedOrigins = ['http://localhost:4173', 'http://localhost:5173', 'http://localhost:8080'];
}

console.log('Configured CORS allowed origins:', allowedOrigins);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, server-to-server, or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    // If the origin is in our whitelist, allow it
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Otherwise, block it
    const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
    return callback(new Error(msg), false);
  },
  methods: 'GET,POST,PUT,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type,Authorization',
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));

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