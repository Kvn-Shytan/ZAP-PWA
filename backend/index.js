const express = require('express');
const cors = require('cors'); // Import cors
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const port = 3001;

app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173' })); // Use cors middleware

app.get('/', (req, res) => {
  res.send('¡El Backend de ZAP PWA está funcionando!');
});

// Endpoint de ejemplo para obtener todos los usuarios
app.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo conectar a la base de datos' });
  }
});

// --- NUEVO ENDPOINT ---
// Crear un nuevo producto
app.post('/products', async (req, res) => {
  try {
    const { internalCode, description, unit, priceUSD, priceARS, stock, categoryId, supplierId } = req.body;

    if (!internalCode || !description || !unit) {
      return res.status(400).json({ error: 'internalCode, description, and unit are required' });
    }

    const newProduct = await prisma.product.create({
      data: {
        internalCode,
        description,
        unit,
        priceUSD,
        priceARS,
        stock,
        categoryId,
        supplierId,
      },
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
app.post('/categories', async (req, res) => {
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
app.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// Obtener una categoría por ID
app.get('/categories/:id', async (req, res) => {
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
app.put('/categories/:id', async (req, res) => {
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
app.delete('/categories/:id', async (req, res) => {
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
app.post('/suppliers', async (req, res) => {
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
app.get('/suppliers', async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany();
    res.json(suppliers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch suppliers.' });
  }
});

// Obtener un proveedor por ID
app.get('/suppliers/:id', async (req, res) => {
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
app.put('/suppliers/:id', async (req, res) => {
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
app.delete('/suppliers/:id', async (req, res) => {
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

// Obtener todos los productos
app.get('/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// Obtener un producto por ID
app.get('/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const product = await prisma.product.findUnique({
      where: { id },
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
app.put('/products/:id', async (req, res) => {
  const { id } = req.params;
  const { internalCode, description, unit, priceUSD, priceARS, stock, categoryId, supplierId } = req.body;
  try {
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        internalCode,
        description,
        unit,
        priceUSD,
        priceARS,
        stock,
        categoryId,
        supplierId,
      },
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
app.delete('/products/:id', async (req, res) => {
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
