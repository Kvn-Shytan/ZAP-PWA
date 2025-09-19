const express = require('express');
const cors = require('cors'); // Import cors
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

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

app.get('/', (req, res) => {
  res.send('¡El Backend de ZAP PWA está funcionando!');
});



// --- NUEVO ENDPOINT ---
// Crear un nuevo producto
app.post('/products', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
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
app.post('/categories', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
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
app.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// Obtener una categoría por ID
app.get('/categories/:id', authenticateToken, async (req, res) => {
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
app.put('/categories/:id', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
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
app.delete('/categories/:id', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
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
app.post('/suppliers', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
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
app.get('/suppliers', authenticateToken, async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany();
    res.json(suppliers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch suppliers.' });
  }
});

// Obtener un proveedor por ID
app.get('/suppliers/:id', authenticateToken, async (req, res) => {
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
app.put('/suppliers/:id', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
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
app.delete('/suppliers/:id', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
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
app.post('/login', async (req, res) => {
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
app.post('/users', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
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
app.get('/users', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
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
app.get('/users/:id', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
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

app.put('/users/change-password', authenticateToken, async (req, res) => {
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
app.put('/users/:id', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
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

// Obtener todos los productos
app.get('/products', authenticateToken, async (req, res) => {
  const { user } = req;
  
  let selectFields = {
    id: true,
    internalCode: true,
    description: true,
    unit: true,
    stock: true,
    createdAt: true,
    updatedAt: true,
    categoryId: true,
    supplierId: true,
    category: true, // Include related data if needed
    supplier: true, // Include related data if needed
  };

  // Rule: Only ADMIN can see prices
  if (user.role === 'ADMIN') {
    selectFields.priceUSD = true;
    selectFields.priceARS = true;
  }

  try {
    const products = await prisma.product.findMany({
      select: selectFields,
    });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// Obtener un producto por ID
app.get('/products/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { user } = req;

  let selectFields = {
    id: true,
    internalCode: true,
    description: true,
    unit: true,
    stock: true,
    createdAt: true,
    updatedAt: true,
    categoryId: true,
    supplierId: true,
    category: true,
    supplier: true,
  };

  // Rule: Only ADMIN can see prices
  if (user.role === 'ADMIN') {
    selectFields.priceUSD = true;
    selectFields.priceARS = true;
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      select: selectFields,
    });
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch product.' });
  }
});

// Actualizar un producto por ID
app.put('/products/:id', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { id } = req.params;
  const { user } = req; // User from token

  // Make a copy of the body to modify
  let dataToUpdate = { ...req.body };

  // Rule: stock is always read-only in this endpoint for everyone
  if (dataToUpdate.stock !== undefined) {
    delete dataToUpdate.stock;
  }

  // Rule: Only ADMIN can update prices
  if (user.role !== 'ADMIN') {
    if (dataToUpdate.priceUSD !== undefined) {
      delete dataToUpdate.priceUSD;
    }
    if (dataToUpdate.priceARS !== undefined) {
      delete dataToUpdate.priceARS;
    }
  }

  try {
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: dataToUpdate,
    });
    res.json(updatedProduct);
  } catch (error) {
    // Handle case where the product to update is not found
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update product.' });
  }
});


// Eliminar un producto por ID
app.delete('/products/:id', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
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

app.listen(port, () => {
  console.log(`Backend escuchando en http://localhost:${port}`);
});
