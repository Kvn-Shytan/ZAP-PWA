const express = require('express');
const prisma = require('../prisma/client');
const { authenticateToken, authorizeRole } = require('../authMiddleware');

const router = express.Router();

// Middleware para proteger todas las rutas de este archivo
router.use(authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']));

// Obtener todos los datos de diseño de un producto
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const productDesign = await prisma.product.findUnique({
      where: { id: id },
      include: {
        // Incluir la lista de materiales (componentes)
        components: {
          orderBy: { component: { description: 'asc' } },
          include: {
            component: {
              select: { id: true, internalCode: true, description: true, unit: true, stock: true, priceARS: true },
            },
          },
        },
        // Incluir el costo de armado a través de la tabla intermedia
        assemblyJobs: {
          include: {
            assemblyJob: true, // Include the details of the AssemblyJob
          },
        },
        // Incluir los costos indirectos asignados
        overheadCosts: {
          orderBy: { overheadCost: { name: 'asc' } },
          include: {
            overheadCost: true,
          },
        },
      },
    });

    if (!productDesign) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    // Opcional: Calcular costos totales en el backend
    // let totalMaterialCost = 0;
    // productDesign.components.forEach(comp => {
    //   totalMaterialCost += (comp.component.priceARS || 0) * comp.quantity;
    // });

    res.json(productDesign);

  } catch (error) {
    console.error(`Error fetching product design for id ${id}:`, error);
    res.status(500).json({ error: 'Error al obtener los datos de diseño del producto.' });
  }
});

// Añadir un componente a la receta de un producto
router.post('/:id/components', async (req, res) => {
  const { id: productId } = req.params;
  const { componentId, quantity } = req.body;

  if (!componentId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'componentId and a positive quantity are required.' });
  }
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
    });
    res.status(201).json(newComponent);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Este componente ya existe en la receta.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al añadir el componente.' });
  }
});

// Actualizar la cantidad de un componente en la receta
router.put('/:id/components/:componentId', async (req, res) => {
  const { id: productId, componentId } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: 'A positive quantity is required.' });
  }

  try {
    const updatedComponent = await prisma.productComponent.update({
      where: {
        productId_componentId: {
          productId: productId,
          componentId: componentId,
        },
      },
      data: {
        quantity: quantity,
      },
    });
    res.json(updatedComponent);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Componente no encontrado en la receta.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el componente.' });
  }
});

// Eliminar un componente de la receta de un producto
router.delete('/:id/components/:componentId', async (req, res) => {
  const { id: productId, componentId } = req.params;

  try {
    await prisma.productComponent.delete({
      where: {
        productId_componentId: {
          productId: productId,
          componentId: componentId,
        },
      },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Componente no encontrado en la receta.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el componente.' });
  }
});

router.put('/:productId/assembly-job', async (req, res) => {
  const { productId } = req.params;
  const { assemblyJobId } = req.body;

  // If assemblyJobId is null, it means we need to disassociate.
  if (assemblyJobId === null) {
    try {
      await prisma.productAssemblyJob.delete({
        where: { productId: productId },
      });
      return res.status(204).send();
    } catch (error) {
      if (error.code === 'P2025') {
        // If it doesn't exist, it's already disassociated, which is fine.
        return res.status(204).send();
      }
      console.error(`Error disassociating assembly job from product ${productId}:`, error);
      return res.status(500).json({ error: 'Error disassociating assembly job.' });
    }
  }

  // If an assemblyJobId is provided, proceed with upsert.
  if (!assemblyJobId) {
    return res.status(400).json({ error: 'The assemblyJobId field is required.' });
  }

  try {
    const productAssemblyJob = await prisma.productAssemblyJob.upsert({
      where: {
        productId: productId,
      },
      update: {
        assemblyJob: {
          connect: { id: assemblyJobId }
        }
      },
      create: {
        product: {
          connect: { id: productId }
        },
        assemblyJob: {
          connect: { id: assemblyJobId }
        }
      },
    });
    res.status(201).json(productAssemblyJob);
  } catch (error) {
    console.error(`Error assigning assembly job to product ${productId}:`, error);
    res.status(500).json({ error: 'Error assigning assembly job.' });
  }
});

// Asignar un costo indirecto a un producto
router.post('/:id/overhead-costs', async (req, res) => {
  const { id: productId } = req.params;
  const { overheadCostId, quantity } = req.body;

  if (!overheadCostId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'overheadCostId and a positive quantity are required.' });
  }

  try {
    const newProductOverhead = await prisma.productOverhead.create({
      data: {
        productId: productId,
                  overheadCostId: overheadCostId,
                  quantity: quantity,      },
    });
    res.status(201).json(newProductOverhead);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Este costo indirecto ya ha sido asignado al producto.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al asignar el costo indirecto.' });
  }
});

// Eliminar un costo indirecto de un producto
router.delete('/:id/overhead-costs/:overheadCostId', async (req, res) => {
  const { id: productId, overheadCostId } = req.params;

  try {
    await prisma.productOverhead.delete({
      where: {
        productId_overheadCostId: {
          productId: productId,
          overheadCostId: overheadCostId,
        },
      },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'La asignación de costo indirecto no fue encontrada.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el costo indirecto.' });
  }
});

module.exports = router;
