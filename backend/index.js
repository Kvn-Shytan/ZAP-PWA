const express = require('express');
const cors = require('cors'); // Import cors
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto'); // Import crypto module

const prisma = new PrismaClient();
const app = express();
const port = 3001;

app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173' })); // Use cors middleware

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    return res.sendStatus(401); // Unauthorized
  }

  // Wrap jwt.verify in a Promise to use async/await pattern
  new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return reject(err);
      }
      resolve(user);
    });
  })
  .then(user => {
    req.user = user;
    next();
  })
  .catch(err => {
    return res.sendStatus(403); // Forbidden (invalid token)
  });
};

const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.sendStatus(403); // Forbidden
    }

    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (rolesArray.includes(req.user.role)) {
      next(); // Role is allowed, proceed
    } else {
      res.sendStatus(403); // Forbidden
    }
  };
};

app.get('/api/', (req, res) => {
  res.send('¡El Backend de ZAP PWA está funcionando!');
});



// --- NUEVO ENDPOINT ---
// Crear un nuevo producto
app.post('/api/products', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { user } = req;
  let dataToCreate = { ...req.body };

  // Rule: Only ADMIN can set prices
  if (user.role !== 'ADMIN') {
    delete dataToCreate.priceUSD;
    delete dataToCreate.priceARS;
  }

  // Basic validation
  if (!dataToCreate.internalCode || !dataToCreate.description || !dataToCreate.unit) {
    return res.status(400).json({ error: 'internalCode, description, and unit are required' });
  }

  try {
    const newProduct = await prisma.product.create({
      data: dataToCreate,
    });
    res.status(201).json(newProduct);
  } catch (error) {
    // Handle potential errors, like a duplicate internalCode
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A product with this internalCode already exists.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create product.' });
  }
});

// --- CATEGORY ENDPOINTS ---
// Crear una nueva categoría
app.post('/api/categories', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const newCategory = await prisma.category.create({
      data: { name },
    });
    res.status(201).json(newCategory);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A category with this name already exists.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create category.' });
  }
});

// Obtener todas las categorías
app.get('/api/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// Obtener una categoría por ID
app.get('/api/categories/:id', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id); // Convert id to integer
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid category ID' });
  }
  try {
    const category = await prisma.category.findUnique({
      where: { id },
    });
    if (category) {
      res.json(category);
    } else {
      res.status(404).json({ error: 'Category not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch category.' });
  }
});

// Actualizar una categoría por ID
app.put('/api/categories/:id', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const id = parseInt(req.params.id); // Convert id to integer
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid category ID' });
  }
  const { name } = req.body;
  try {
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: { name },
    });
    res.json(updatedCategory);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A category with this name already exists.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update category.' });
  }
});

// Eliminar una categoría por ID
app.delete('/api/categories/:id', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  const id = parseInt(req.params.id); // Convert id to integer
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid category ID' });
  }
  try {
    await prisma.category.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

// --- SUPPLIER ENDPOINTS ---
// Crear un nuevo proveedor
app.post('/api/suppliers', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  try {
    const { name, contactInfo } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const newSupplier = await prisma.supplier.create({
      data: { name, contactInfo },
    });
    res.status(201).json(newSupplier);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A supplier with this name already exists.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create supplier.' });
  }
});

// Obtener todos los proveedores
app.get('/api/suppliers', authenticateToken, async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany();
    res.json(suppliers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch suppliers.' });
  }
});

// Obtener un proveedor por ID
app.get('/api/suppliers/:id', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id); // Convert id to integer
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid supplier ID' });
  }
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
    });
    if (supplier) {
      res.json(supplier);
    } else {
      res.status(404).json({ error: 'Supplier not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch supplier.' });
  }
});

// Actualizar un proveedor por ID
app.put('/api/suppliers/:id', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const id = parseInt(req.params.id); // Convert id to integer
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid supplier ID' });
  }
  const { name, contactInfo } = req.body;
  try {
    const updatedSupplier = await prisma.supplier.update({
      where: { id },
      data: { name, contactInfo },
    });
    res.json(updatedSupplier);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A supplier with this name already exists.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update supplier.' });
  }
});

// Eliminar un proveedor por ID
app.delete('/api/suppliers/:id', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  const id = parseInt(req.params.id); // Convert id to integer
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid supplier ID' });
  }
  try {
    await prisma.supplier.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to delete supplier.' });
  }
});

if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined.");
  process.exit(1);
}

// --- AUTH ENDPOINTS ---
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' } // 8-hour expiration
    );

    const { password: _, ...userWithoutPassword } = user;

    res.json({ token, user: userWithoutPassword });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed.' });
  }
});



// --- USER ENDPOINTS ---
const saltRounds = 10;

// Crear un nuevo usuario
app.post('/api/users', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const { email, name, password } = req.body;
    let { role } = req.body; // Make role optional

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role || undefined, // Use provided role or let Prisma use default (NO_ROLE)
      },
    });
    // No devolver el password hasheado
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// Obtener todos los usuarios (sin passwords)
app.get('/api/users', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// Obtener un usuario por ID (sin password)
app.get('/api/users/:id', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

app.put('/api/users/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  const userId = req.user.userId; // ID del usuario logueado desde el token

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return res.status(400).json({ error: 'Todos los campos de contraseña son requeridos.' });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ error: 'La nueva contraseña y su confirmación no coinciden.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta.' });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await prisma.user.update({
      where: { id: userId },
      data: { password: newHashedPassword },
    });

    res.json({ message: 'Contraseña cambiada exitosamente.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cambiar la contraseña.' });
  }
});

// Actualizar un usuario por ID
app.put('/api/users/:id', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  const { email, name, password, role } = req.body;
  
  const dataToUpdate = { email, name, role };

  if (password) {
    dataToUpdate.password = await bcrypt.hash(password, saltRounds);
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });
    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// Obtener todos los productos con filtros
app.get('/api/products', authenticateToken, async (req, res) => {
  const { user } = req;
  const { search, categoryId, type, page = 1, pageSize = 25 } = req.query;

  const where = {};

  if (search) {
    where.OR = [
      {
        description: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        internalCode: {
          contains: search,
          mode: 'insensitive',
        },
      },
    ];
  }

  if (categoryId) {
    where.categoryId = parseInt(categoryId);
  }

  if (type) {
    if (type.includes(',')) {
      where.type = { in: type.split(',') };
    } else {
      where.type = type;
    }
  }

  let selectFields = {
    id: true,
    internalCode: true,
    description: true,
    unit: true,
    stock: true,
    type: true,
    createdAt: true,
    updatedAt: true,
    categoryId: true,
    supplierId: true,
    category: true,
    supplier: true,
  };

  if (user.role === 'ADMIN') {
    selectFields.priceUSD = true;
    selectFields.priceARS = true;
  }

  try {
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);

    const products = await prisma.product.findMany({
      where,
      select: selectFields,
      orderBy: { description: 'asc' },
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
    });

    const totalProducts = await prisma.product.count({ where });

    res.json({
      products,
      totalProducts,
      currentPage: pageNum,
      totalPages: Math.ceil(totalProducts / pageSizeNum),
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// Obtener un solo producto por su ID
app.get('/api/products/:id', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR', 'EMPLOYEE']), async (req, res) => {
  const { id } = req.params;
  try {
    const product = await prisma.product.findUnique({
      where: { id: id },
      include: {
        category: true,
        supplier: true,
        components: {
          include: {
            component: true,
          },
        },
      },
    });
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ error: 'Producto no encontrado' });
    }
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
});

// Obtener los componentes de un producto (receta)
app.get('/api/products/:id/components', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { id } = req.params;
  console.log('Fetching components for product ID:', id);
  try {
    const productComponents = await prisma.productComponent.findMany({
      where: {
        productId: id,
      },
      include: {
        component: {
          select: {
            id: true,
            internalCode: true,
            description: true,
            stock: true,
          },
        },
      },
    });
    res.json(productComponents);
  } catch (error) {
    console.error('Error al obtener los componentes del producto:', error);
    res.status(500).json({ error: 'Error al obtener los componentes del producto' });
  }
});

// Añadir un componente a un producto
app.post('/api/products/:id/components', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { id: productId } = req.params;
  const { componentId, quantity } = req.body;

  if (!componentId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'componentId and a positive quantity are required.' });
  }

  try {
    const newComponent = await prisma.productComponent.create({
      data: {
        productId: productId,
        componentId: componentId,
        quantity: parseFloat(quantity),
      },
    });
    res.status(201).json(newComponent);
  } catch (error) {
    console.error('Error adding component to product:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Este componente ya existe en la receta del producto.' });
    }
    res.status(500).json({ error: 'Error al añadir el componente.' });
  }
});

// Quitar un componente de un producto
app.delete('/api/products/:productId/components/:componentId', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { productId, componentId } = req.params;

  try {
    await prisma.productComponent.delete({
      where: {
        productId_componentId: {
          productId: productId,
          componentId: componentId,
        },
      },
    });
    res.status(204).send(); // Success, no content
  } catch (error) {
    console.error('Error removing component from product:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Component relation not found.' });
    }
    res.status(500).json({ error: 'Error al quitar el componente.' });
  }
});


// Actualizar un producto
app.put('/api/products/:id', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { id } = req.params;
  const { user } = req; // User from token

  const {
    internalCode, description, unit, type, lowStockThreshold, categoryId, supplierId, priceUSD, priceARS
  } = req.body;

  // Build a clean data object for Prisma
  const dataToUpdate = {
    internalCode,
    description,
    unit,
    type,
    lowStockThreshold: lowStockThreshold ? parseFloat(lowStockThreshold) : undefined,
    categoryId: categoryId ? parseInt(categoryId) : undefined,
    supplierId: supplierId ? parseInt(supplierId) : undefined,
  };

  // Rule: Only ADMIN can update prices
  if (user.role === 'ADMIN') {
    dataToUpdate.priceUSD = priceUSD ? parseFloat(priceUSD) : undefined;
    dataToUpdate.priceARS = priceARS ? parseFloat(priceARS) : undefined;
  }

  try {
    const updatedProduct = await prisma.product.update({
      where: { id: id },
      data: dataToUpdate,
    });
    res.json(updatedProduct);
  } catch (error) {
    // Handle case where the product to update is not found
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product.' });
  }
});


// Eliminar un producto por ID
app.delete('/api/products/:id', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.product.delete({
      where: { id },
    });
    res.status(204).send(); // No Content
  } catch (error) {
    // Handle case where the product to delete is not found
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});

// --- INVENTORY MOVEMENT ENDPOINTS ---

// Registrar una Orden de Producción
app.post('/api/inventory/production', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR', 'EMPLOYEE']), async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.user.userId;

  if (!productId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'productId and a positive quantity are required.' });
  }

  try {
    const eventId = crypto.randomUUID(); // Generate a unique ID for this event

    // Iniciar una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Encontrar los componentes del producto (su "receta")
      const components = await tx.productComponent.findMany({
        where: { productId: productId },
        include: { component: true }, // Incluir datos del componente para verificar stock
      });

      if (components.length === 0) {
        throw new Error('Este producto no tiene componentes definidos y no puede ser producido de esta forma.');
      }

      // 2. Verificar si hay suficiente stock de CADA componente
      for (const item of components) {
        const requiredStock = item.quantity * quantity;
        if (item.component.stock < requiredStock) {
          throw new Error(`Stock insuficiente para el componente: ${item.component.description}. Necesario: ${requiredStock}, Disponible: ${item.component.stock}`);
        }
      }

      // 3. Crear el movimiento de entrada para el producto fabricado (PRODUCTION_IN)
      const productionIn = await tx.inventoryMovement.create({
        data: {
          productId: productId,
          type: 'PRODUCTION_IN',
          quantity: quantity,
          userId: userId,
          notes: `Producción de ${quantity} unidades.`,
          eventId: eventId, // Assign event ID
        }
      });

      // 4. Actualizar el stock del producto fabricado
      const finalProductUpdate = await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: quantity } },
      });

      // 5. Crear los movimientos de salida para cada componente (PRODUCTION_OUT)
      const componentMovements = [];
      for (const item of components) {
        const requiredStock = item.quantity * quantity;

        const productionOut = await tx.inventoryMovement.create({
          data: {
            productId: item.componentId,
            type: 'PRODUCTION_OUT',
            quantity: requiredStock,
            userId: userId,
            notes: `Uso para producción de ${quantity} x ${finalProductUpdate.description}`,
            eventId: eventId, // Assign the same event ID
          }
        });
        componentMovements.push(productionOut);

        await tx.product.update({
          where: { id: item.componentId },
          data: { stock: { decrement: requiredStock } },
        });
      }
      
      return { productionIn, componentMovements };
    });

    res.status(201).json(result);

  } catch (error) {
    // Si el error es por stock insuficiente o cualquier otra cosa, la transacción hará rollback
    console.error("Error en la transacción de producción:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// Registrar una Compra
app.post('/api/inventory/purchase', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { productId, quantity, notes } = req.body;
  const userId = req.user.userId;

  if (!productId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'productId and a positive quantity are required.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Opcional: Verificar que el producto es de tipo RAW_MATERIAL
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new Error('Producto no encontrado.');
      }
      if (product.type !== 'RAW_MATERIAL') {
        // O se podría permitir comprar cualquier cosa, a definir.
        throw new Error('Solo se pueden registrar compras de productos tipo RAW_MATERIAL.');
      }

      // Crear el movimiento de entrada
      const purchaseMovement = await tx.inventoryMovement.create({
        data: {
          productId: productId,
          type: 'PURCHASE',
          quantity: quantity,
          userId: userId,
          notes: notes || `Compra de ${quantity} unidades.`
        }
      });

      // Actualizar el stock del producto
      await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: quantity } },
      });

      return purchaseMovement;
    });

    res.status(201).json(result);

  } catch (error) {
    console.error("Error en la transacción de compra:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// Registrar una Venta
app.post('/api/inventory/sale', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { productId, quantity, notes } = req.body;
  const userId = req.user.userId;

  if (!productId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'productId and a positive quantity are required.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new Error('Producto no encontrado.');
      }
      // Opcional: verificar que sea un producto FINISHED
      if (product.type !== 'FINISHED') {
        throw new Error('Solo se pueden vender productos de tipo FINISHED.');
      }

      // Verificar stock
      if (product.stock < quantity) {
        throw new Error(`Stock insuficiente. Disponible: ${product.stock}, Requerido: ${quantity}`);
      }

      // Crear el movimiento de salida
      const saleMovement = await tx.inventoryMovement.create({
        data: {
          productId: productId,
          type: 'SALE',
          quantity: quantity,
          userId: userId,
          notes: notes || `Venta de ${quantity} unidades.`
        }
      });

      // Actualizar el stock del producto
      await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      });

      return saleMovement;
    });

    res.status(201).json(result);

  } catch (error) {
    console.error("Error en la transacción de venta:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// Anular un Movimiento de Inventario (Contra-asiento)
app.post('/api/inventory/reversal', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { movementId } = req.body;
  const userPerformingReversalId = req.user.userId;

  if (!movementId) {
    return res.status(400).json({ error: 'movementId is required.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const originalMovement = await tx.inventoryMovement.findUnique({ where: { id: movementId } });

      if (!originalMovement) throw new Error('Movimiento original no encontrado.');
      if (originalMovement.notes?.startsWith('Anulación')) throw new Error('No se puede anular un movimiento que ya es una anulación.');

      let movementsToReverse = [];

      if (originalMovement.eventId) {
        // Si tiene un eventId, buscar todos los movimientos del evento
        const eventMovements = await tx.inventoryMovement.findMany({ where: { eventId: originalMovement.eventId } });
        // Verificar que ninguno haya sido anulado ya
        for (const mov of eventMovements) {
            const existingReversal = await tx.inventoryMovement.findFirst({ where: { notes: `Anulación del mov. #${mov.id}` } });
            if (existingReversal) throw new Error(`El evento #${originalMovement.eventId} ya ha sido anulado (movimiento #${mov.id} ya fue revertido).`);
        }
        movementsToReverse = eventMovements;
      } else {
        // Si no, solo anular el movimiento individual
        const existingReversal = await tx.inventoryMovement.findFirst({ where: { notes: `Anulación del mov. #${movementId}` } });
        if (existingReversal) throw new Error('Este movimiento ya ha sido anulado previamente.');
        movementsToReverse.push(originalMovement);
      }

      const reversalMovements = [];
      for (const mov of movementsToReverse) {
        let reversalType;
        let stockChange;
        const isIncome = ['PURCHASE', 'PRODUCTION_IN', 'CUSTOMER_RETURN', 'ADJUSTMENT_IN'].includes(mov.type);

        if (isIncome) {
          reversalType = 'ADJUSTMENT_OUT';
          stockChange = { decrement: mov.quantity };
        } else {
          reversalType = 'ADJUSTMENT_IN';
          stockChange = { increment: mov.quantity };
        }

        const reversal = await tx.inventoryMovement.create({
          data: {
            productId: mov.productId,
            type: reversalType,
            quantity: mov.quantity,
            userId: userPerformingReversalId,
            notes: `Anulación del mov. #${mov.id}`,
          },
        });
        reversalMovements.push(reversal);

        await tx.product.update({
          where: { id: mov.productId },
          data: { stock: stockChange },
        });
      }

      return reversalMovements;
    });

    res.status(201).json(result);

  } catch (error) {
    console.error("Error en la anulación de movimiento:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// Obtener productos con bajo stock
app.get('/api/inventory/low-stock', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  try {
    const lowStockProducts = await prisma.product.findMany({
      where: {
        // Usamos `expr` para poder comparar dos campos del mismo modelo
        stock: {
          lt: prisma.product.fields.lowStockThreshold,
        },
        // Opcional: filtrar para que solo muestre productos que tienen un umbral definido > 0
        lowStockThreshold: {
          gt: 0,
        },
      },
      orderBy: {
        description: 'asc',
      },
    });
    res.json(lowStockProducts);
  } catch (error) {
    console.error("Error al obtener productos con bajo stock:", error.message);
    res.status(500).json({ error: 'Failed to fetch low stock products.' });
  }
});

// Actualizar el umbral de bajo stock para un producto
app.put('/api/inventory/low-stock-threshold', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  const { productId, newThreshold } = req.body;

  if (!productId || newThreshold === undefined || newThreshold < 0) {
    return res.status(400).json({ error: 'productId and a non-negative newThreshold are required.' });
  }

  try {
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { lowStockThreshold: newThreshold },
    });
    res.json(updatedProduct);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found.' });
    }
    console.error("Error al actualizar el umbral de bajo stock:", error.message);
    res.status(500).json({ error: 'Failed to update low stock threshold.' });
  }
});

// Obtener historial de movimientos con filtros y paginación
app.get('/api/inventory/movements', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const {
    page = 1,
    pageSize = 20,
    productId,
    userId,
    type,
    startDate,
    endDate,
    isCorrection
  } = req.query;

  const pageNum = parseInt(page);
  const pageSizeNum = parseInt(pageSize);

  const where = {};

  if (productId) {
    where.productId = productId;
  }
  if (userId) {
    where.userId = parseInt(userId);
  }
  if (type) {
    where.type = type;
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }
  if (isCorrection === 'true') {
    where.OR = [
      { type: 'ADJUSTMENT_IN' },
      { type: 'ADJUSTMENT_OUT' },
      { type: 'WASTAGE' },
    ];
  }

  try {
    const movements = await prisma.inventoryMovement.findMany({
      where,
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        product: {
          select: { description: true, internalCode: true },
        },
        user: {
          select: { name: true, email: true },
        },
      },
    });

    const totalMovements = await prisma.inventoryMovement.count({ where });

    res.json({
      movements,
      totalMovements,
      currentPage: pageNum,
      totalPages: Math.ceil(totalMovements / pageSizeNum),
    });

  } catch (error) {
    console.error("Error al obtener historial de movimientos:", error.message);
    res.status(500).json({ error: 'Failed to fetch inventory movements.' });
  }
});


app.listen(port, () => {
  console.log(`Backend escuchando en http://localhost:${port}`);
});
