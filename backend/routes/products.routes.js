const express = require('express');
const { authenticateToken, authorizeRole } = require('../authMiddleware');
const { validate, createProductSchema } = require('../validators/product.validator');

const prisma = require('../prisma/client');
const router = express.Router();

// Create a new product
router.post('/', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), validate(createProductSchema), async (req, res) => {
  console.log('Create Body:', req.body); // Diagnostic log
  const { user } = req;
  let dataToCreate = { ...req.body };

  // Rule: Only ADMIN can set prices
  if (user.role !== 'ADMIN') {
    delete dataToCreate.priceUSD;
    delete dataToCreate.priceARS;
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

// Get all products with filters
router.get('/', authenticateToken, async (req, res) => {
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

// Get unclassified products
router.get('/unclassified', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  console.log('[/api/products/unclassified] Request received.');
  try {
    const unclassifiedProducts = await prisma.product.findMany({
      where: { isClassified: false },
      select: {
        id: true,
        internalCode: true,
        description: true,
        type: true, // Para mostrar el tipo actual
      },
      orderBy: { description: 'asc' },
    });
    console.log(`[/api/products/unclassified] Found ${unclassifiedProducts.length} unclassified products.`);
    res.json(unclassifiedProducts);
  } catch (error) {
    console.error("[/api/products/unclassified] Error fetching unclassified products:", error.message);
    res.status(500).json({ error: 'Failed to fetch unclassified products.' });
  }
});

// Get a single product by ID
router.get('/:id', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR', 'EMPLOYEE']), async (req, res) => {
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
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    res.status(500).json({ error: 'Failed to fetch product.' });
  }
});

// Get product components (recipe)
router.get('/:id/components', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
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
    console.error('Error fetching product components:', error);
    res.status(500).json({ error: 'Failed to fetch product components.' });
  }
});

// Add a component to a product
router.post('/:id/components', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { id: productId } = req.params;
  const { componentId, quantity } = req.body;

  if (!componentId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'componentId and a positive quantity are required.' });
  }

  // Critical Validation: Prevent a product from being its own component
  if (productId === componentId) {
    return res.status(400).json({ error: 'A product cannot be its own component.' });
  }

  try {
            const newComponent = await prisma.productComponent.create({
              data: {
                productId: productId,
                componentId: componentId,
                quantity: quantity,
              },
            });    res.status(201).json(newComponent);
  } catch (error) {
    console.error('Error adding component to product:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'This component already exists in the product recipe.' });
    }
    res.status(500).json({ error: 'Failed to add component.' });
  }
});

// Remove a component from a product
router.delete('/:productId/components/:componentId', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
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
    res.status(500).json({ error: 'Failed to remove component.' });
  }
});


// Update a product
router.put('/:id', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { id } = req.params;
  const { user } = req; // User from token

  const {
    internalCode, description, unit, type, lowStockThreshold, categoryId, supplierId, priceUSD, priceARS, isClassified
  } = req.body;

  // Build a clean data object for Prisma
  const dataToUpdate = {
    internalCode,
    description,
    unit,
    type,
    lowStockThreshold: lowStockThreshold ? lowStockThreshold : undefined,
    categoryId: categoryId ? parseInt(categoryId) : undefined,
    supplierId: supplierId ? parseInt(supplierId) : undefined,
    isClassified: typeof isClassified === 'boolean' ? isClassified : undefined,
  };

  // Rule: Only ADMIN can update prices
  if (user.role === 'ADMIN') {
    dataToUpdate.priceUSD = priceUSD ? priceUSD : undefined;
    dataToUpdate.priceARS = priceARS ? priceARS : undefined;
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


// Delete a product by ID
router.delete('/:id', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.product.delete({
      where: { id },
    });
    res.status(204).send(); // No Content
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    // Foreign key constraint violation (product is a component for another product)
    if (error.code === 'P2003') {
      return res.status(409).json({ error: 'This product cannot be deleted because it is used as a component in another recipe.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});

// --- ASSEMBLY RECIPE MANAGEMENT ---

// Get a product's assembly recipe
router.get('/:productId/assembly-jobs', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { productId } = req.params;
  try {
    const assignedJobs = await prisma.productAssemblyJob.findMany({
      where: { productId },
      include: {
        assemblyJob: true, // Include the details of the assembly job
      },
      orderBy: {
        assemblyJob: { name: 'asc' },
      },
    });
    res.json(assignedJobs);
  } catch (error) {
    console.error(`Error fetching assembly jobs for product ${productId}:`, error);
    res.status(500).json({ error: 'Failed to fetch assembly recipe.' });
  }
});

// Assign an assembly job to a product
router.post('/:productId/assembly-jobs', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { productId } = req.params;
  const { assemblyJobId } = req.body;

  if (!assemblyJobId) {
    return res.status(400).json({ error: 'The assemblyJobId field is required.' });
  }

  try {
    const newAssignment = await prisma.productAssemblyJob.create({
      data: {
        productId,
        assemblyJobId,
      },
    });
    res.status(201).json(newAssignment);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'This assembly job is already assigned to this product.' });
    }
    console.error(`Error assigning assembly job ${assemblyJobId} to product ${productId}:`, error);
    res.status(500).json({ error: 'Failed to assign assembly job.' });
  }
});

// Remove an assembly job from a product
router.delete('/:productId/assembly-jobs/:assemblyJobId', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { productId, assemblyJobId } = req.params;

  try {
    await prisma.productAssemblyJob.delete({
      where: {
        productId_assemblyJobId: {
          productId,
          assemblyJobId,
        },
      },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Assembly job assignment not found.' });
    }
    console.error(`Error removing assembly job ${assemblyJobId} from product ${productId}:`, error);
    res.status(500).json({ error: 'Failed to remove assembly job.' });
  }
});

module.exports = router;

// Where-used endpoint for a component
router.get('/:id/where-used', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { id: componentId } = req.params;

  try {
    const parentProducts = await prisma.productComponent.findMany({
      where: {
        componentId: componentId,
      },
      include: {
        product: { // Include the "parent" product data
          select: {
            id: true,
            internalCode: true,
            description: true,
          },
        },
      },
    });

    // Map the result to a clean list of products
    const result = parentProducts.map(pc => pc.product);

    res.json(result);
  } catch (error) {
    console.error(`Error fetching where-used for component ${componentId}:`, error);
    res.status(500).json({ error: 'Failed to fetch component usage information.' });
  }
});