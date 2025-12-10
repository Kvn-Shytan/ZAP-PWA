const express = require('express');
const { authenticateToken, authorizeRole } = require('../authMiddleware');

const prisma = require('../prisma/client');
const router = express.Router();

// Middleware to protect all routes in this file
router.use(authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']));

// GET /api/trabajos-armado - Obtener todos los trabajos de armado
router.get('/', async (req, res) => {
  try {
    const trabajos = await prisma.trabajoDeArmado.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        _count: {
          select: { productos: true },
        },
      },
    });
    res.json(trabajos);
  } catch (error) {
    console.error('Error fetching Trabajos de Armado:', error);
    res.status(500).json({ error: 'No se pudieron obtener los trabajos de armado.' });
  }
});

// GET /api/trabajos-armado/:id - Obtener un trabajo de armado por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const trabajo = await prisma.trabajoDeArmado.findUnique({
      where: { id },
    });
    if (!trabajo) {
      return res.status(404).json({ error: 'Trabajo de armado no encontrado.' });
    }
    res.json(trabajo);
  } catch (error) {
    console.error(`Error fetching Trabajo de Armado ${id}:`, error);
    res.status(500).json({ error: 'No se pudo obtener el trabajo de armado.' });
  }
});

// GET /api/trabajos-armado/:id/linked-products - Get all products linked to a specific assembly job
router.get('/:id/linked-products', async (req, res) => {
  const { id } = req.params;

  try {
    const products = await prisma.product.findMany({
      where: {
        trabajosDeArmado: {
          some: {
            trabajoId: id,
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
    console.error(`Error fetching linked products for Trabajo de Armado ${id}:`, error);
    res.status(500).json({ error: 'No se pudieron obtener los productos vinculados.' });
  }
});

// POST /api/trabajos-armado - Crear un nuevo trabajo de armado
router.post('/', async (req, res) => {
  const { nombre, precio, descripcion } = req.body;

  if (!nombre || typeof precio === 'undefined') {
    return res.status(400).json({ error: 'El nombre y el precio son campos requeridos.' });
  }

  try {
    const nuevoTrabajo = await prisma.trabajoDeArmado.create({
      data: {
        nombre,
        precio,
        descripcion,
      },
    });
    res.status(201).json(nuevoTrabajo);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un trabajo de armado con este nombre.' });
    }
    console.error('Error creating Trabajo de Armado:', error);
    res.status(500).json({ error: 'No se pudo crear el trabajo de armado.' });
  }
});

// PUT /api/trabajos-armado/:id - Actualizar un trabajo de armado
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, precio, descripcion } = req.body;

  if (!nombre || typeof precio === 'undefined') {
    return res.status(400).json({ error: 'El nombre y el precio son campos requeridos.' });
  }

  try {
    const trabajoActualizado = await prisma.trabajoDeArmado.update({
      where: { id },
      data: {
        nombre,
        precio,
        descripcion,
      },
    });
    res.json(trabajoActualizado);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Trabajo de armado no encontrado.' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un trabajo de armado con este nombre.' });
    }
    console.error(`Error updating Trabajo de Armado ${id}:`, error);
    res.status(500).json({ error: 'No se pudo actualizar el trabajo de armado.' });
  }
});

// DELETE /api/trabajos-armado/:id - Eliminar un trabajo de armado
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.trabajoDeArmado.delete({
      where: { id },
    });
    res.status(204).send(); // No Content
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Trabajo de armado no encontrado.' });
    }
    // Foreign key constraint violation
    if (error.code === 'P2003') {
        return res.status(409).json({ error: 'Este trabajo no se puede eliminar porque está asignado a uno o más productos.' });
    }
    console.error(`Error deleting Trabajo de Armado ${id}:`, error);
    res.status(500).json({ error: 'No se pudo eliminar el trabajo de armado.' });
  }
});

module.exports = router;
