const express = require('express');
const { authenticateToken, authorizeRole } = require('../authMiddleware');

const prisma = require('../prisma/client');
const router = express.Router();

// Middleware to protect all routes in this file
router.use(authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']));

// GET /api/assembly-jobs - Get all assembly jobs
router.get('/', async (req, res) => {
  try {
    const assemblyJobs = await prisma.assemblyJob.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    res.json(assemblyJobs);
  } catch (error) {
    console.error('Error fetching Assembly Jobs:', error);
    res.status(500).json({ error: 'Failed to fetch assembly jobs.' });
  }
});

// GET /api/assembly-jobs/:id - Get an assembly job by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const assemblyJob = await prisma.assemblyJob.findUnique({
      where: { id },
    });
    if (!assemblyJob) {
      return res.status(404).json({ error: 'Assembly job not found.' });
    }
    res.json(assemblyJob);
  } catch (error) {
    console.error(`Error fetching Assembly Job ${id}:`, error);
    res.status(500).json({ error: 'Failed to fetch assembly job.' });
  }
});

// GET /api/assembly-jobs/:id/linked-products - Get all products linked to a specific assembly job
router.get('/:id/linked-products', async (req, res) => {
  const { id } = req.params;

  try {
    const products = await prisma.product.findMany({
      where: {
        assemblyJobs: {
          some: {
            assemblyJobId: id,
          },
        },
      },
      select: {
        id: true,
        internalCode: true,
        description: true,
      },
      orderBy: {
        internalCode: 'asc',
      }
    });

    res.json(products);
  } catch (error) {
    console.error(`Error fetching linked products for Assembly Job ${id}:`, error);
    res.status(500).json({ error: 'Failed to fetch linked products.' });
  }
});

// POST /api/assembly-jobs - Create a new assembly job
router.post('/', async (req, res) => {
  const { name, price, description } = req.body;

  if (!name || typeof price === 'undefined') {
    return res.status(400).json({ error: 'Name and price are required fields.' });
  }

  try {
    const newAssemblyJob = await prisma.assemblyJob.create({
      data: {
        name,
        price,
        description,
      },
    });
    res.status(201).json(newAssemblyJob);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'An assembly job with this name already exists.' });
    }
    console.error('Error creating Assembly Job:', error);
    res.status(500).json({ error: 'Failed to create assembly job.' });
  }
});

// PUT /api/assembly-jobs/:id - Update an assembly job
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price, description } = req.body;

  if (!name || typeof price === 'undefined') {
    return res.status(400).json({ error: 'Name and price are required fields.' });
  }

  try {
    const updatedAssemblyJob = await prisma.assemblyJob.update({
      where: { id },
      data: {
        name,
        price,
        description,
      },
    });
    res.json(updatedAssemblyJob);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Assembly job not found.' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'An assembly job with this name already exists.' });
    }
    console.error(`Error updating Assembly Job ${id}:`, error);
    res.status(500).json({ error: 'Failed to update assembly job.' });
  }
});

// DELETE /api/assembly-jobs/:id - Delete an assembly job
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.assemblyJob.delete({
      where: { id },
    });
    res.status(204).send(); // No Content
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Assembly job not found.' });
    }
    // Foreign key constraint violation
    if (error.code === 'P2003') {
        return res.status(409).json({ error: 'This assembly job cannot be deleted because it is assigned to one or more products.' });
    }
    console.error(`Error deleting Assembly Job ${id}:`, error);
    res.status(500).json({ error: 'Failed to delete assembly job.' });
  }
});

module.exports = router;