const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorizeRole } = require('../authMiddleware');

const prisma = new PrismaClient();
const router = express.Router();

// Crear una nueva categoría
router.post('/', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
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
router.get('/', authenticateToken, async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// Obtener una categoría por ID
router.get('/:id', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id);
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
router.put('/:id', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const id = parseInt(req.params.id);
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
router.delete('/:id', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  const id = parseInt(req.params.id);
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

module.exports = router;
