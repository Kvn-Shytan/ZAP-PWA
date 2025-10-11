const express = require('express');
const prisma = require('../prisma/client');
const { authenticateToken, authorizeRole } = require('../authMiddleware');

const router = express.Router();

// Middleware para proteger todas las rutas de este archivo
router.use(authenticateToken, authorizeRole(['ADMIN']));

// Crear un nuevo costo indirecto
router.post('/', async (req, res) => {
  try {
    const { name, description, cost, unit, type } = req.body;
    if (!name || !cost || !unit) {
      return res.status(400).json({ error: 'name, cost, and unit are required' });
    }
    const newOverheadCost = await prisma.overheadCost.create({
      data: { name, description, cost: cost, unit, type },
    });
    res.status(201).json(newOverheadCost);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'An overhead cost with this name already exists.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create overhead cost.' });
  }
});

// Obtener todos los costos indirectos
router.get('/', async (req, res) => {
  try {
    const overheadCosts = await prisma.overheadCost.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(overheadCosts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch overhead costs.' });
  }
});

// Obtener un costo indirecto por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const overheadCost = await prisma.overheadCost.findUnique({
      where: { id },
    });
    if (overheadCost) {
      res.json(overheadCost);
    } else {
      res.status(404).json({ error: 'Overhead cost not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch overhead cost.' });
  }
});

// Actualizar un costo indirecto por ID
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, cost, unit, type } = req.body;
  try {
    const updatedOverheadCost = await prisma.overheadCost.update({
      where: { id },
      data: { name, description, cost: cost ? cost : undefined, unit, type },
    });
    res.json(updatedOverheadCost);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Overhead cost not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'An overhead cost with this name already exists.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update overhead cost.' });
  }
});

// Eliminar un costo indirecto por ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.overheadCost.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Overhead cost not found' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to delete overhead cost.' });
  }
});

module.exports = router;
