const express = require('express');
const { authenticateToken, authorizeRole } = require('../authMiddleware');
const { validate, createProductSchema } = require('../validators/product.validator');

const prisma = require('../prisma/client');
const router = express.Router();

// Crear un nuevo producto
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

// Obtener todos los productos con filtros
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

// Obtener productos no clasificados
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
    console.error("[/api/products/unclassified] Error al obtener productos no clasificados:", error.message);
    res.status(500).json({ error: 'Failed to fetch unclassified products.' });
  }
});

// Obtener un solo producto por su ID
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
      res.status(404).json({ error: 'Producto no encontrado' });
    }
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
});

// Obtener los componentes de un producto (receta)
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
    console.error('Error al obtener los componentes del producto:', error);
    res.status(500).json({ error: 'Error al obtener los componentes del producto' });
  }
});

// Añadir un componente a un producto
router.post('/:id/components', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { id: productId } = req.params;
  const { componentId, quantity } = req.body;

  if (!componentId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'componentId and a positive quantity are required.' });
  }

  // Critical Validation: Prevent a product from being its own component
  if (productId === componentId) {
    return res.status(400).json({ error: 'Un producto no puede ser componente de sí mismo.' });
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
      return res.status(409).json({ error: 'Este componente ya existe en la receta del producto.' });
    }
    res.status(500).json({ error: 'Error al añadir el componente.' });
  }
});

// Quitar un componente de un producto
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
    res.status(500).json({ error: 'Error al quitar el componente.' });
  }
});


// Actualizar un producto
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
    isClassified: typeof isClassified === 'boolean' ? isClassified : undefined, // Añadir isClassified
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


// Eliminar un producto por ID
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
      return res.status(409).json({ error: 'Este producto no se puede eliminar porque está siendo utilizado como componente en otra receta.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});

// --- GESTIÓN DE RECETA DE ARMADO ---

// Obtener la receta de armado de un producto
router.get('/:productId/trabajos-armado', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { productId } = req.params;
  try {
    const trabajosAsignados = await prisma.productoTrabajoArmado.findMany({
      where: { productId },
      include: {
        trabajo: true, // Incluir los detalles del trabajo de armado
      },
      orderBy: {
        trabajo: { nombre: 'asc' },
      },
    });
    res.json(trabajosAsignados);
  } catch (error) {
    console.error(`Error fetching trabajos de armado for product ${productId}:`, error);
    res.status(500).json({ error: 'Error al obtener la receta de armado.' });
  }
});

// Asignar un trabajo de armado a un producto
router.post('/:productId/trabajos-armado', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { productId } = req.params;
  const { trabajoId } = req.body;

  if (!trabajoId) {
    return res.status(400).json({ error: 'El campo trabajoId es requerido.' });
  }

  try {
    const nuevaAsignacion = await prisma.productoTrabajoArmado.create({
      data: {
        productId,
        trabajoId,
      },
    });
    res.status(201).json(nuevaAsignacion);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Este trabajo de armado ya está asignado a este producto.' });
    }
    console.error(`Error assigning trabajo ${trabajoId} to product ${productId}:`, error);
    res.status(500).json({ error: 'Error al asignar el trabajo de armado.' });
  }
});

// Quitar un trabajo de armado de un producto
router.delete('/:productId/trabajos-armado/:trabajoId', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { productId, trabajoId } = req.params;

  try {
    await prisma.productoTrabajoArmado.delete({
      where: {
        productId_trabajoId: {
          productId,
          trabajoId,
        },
      },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Asignación de trabajo no encontrada.' });
    }
    console.error(`Error removing trabajo ${trabajoId} from product ${productId}:`, error);
    res.status(500).json({ error: 'Error al quitar el trabajo de armado.' });
  }
});

module.exports = router;

// NUEVO ENDPOINT: Dónde se usa un componente
router.get('/:id/where-used', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { id: componentId } = req.params;

  try {
    const parentProducts = await prisma.productComponent.findMany({
      where: {
        componentId: componentId,
      },
      include: {
        product: { // Incluir los datos del producto "padre"
          select: {
            id: true,
            internalCode: true,
            description: true,
          },
        },
      },
    });

    // Mapear el resultado para que sea una lista limpia de productos
    const result = parentProducts.map(pc => pc.product);

    res.json(result);
  } catch (error) {
    console.error(`Error fetching where-used for component ${componentId}:`, error);
    res.status(500).json({ error: 'Error al obtener la información de uso del componente.' });
  }
});

