const express = require('express');
const { authenticateToken, authorizeRole } = require('../authMiddleware');

const prisma = require('../prisma/client');
const router = express.Router();

// Crear un nuevo proveedor
router.post('/', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
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
router.get('/', authenticateToken, async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany();
    res.json(suppliers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch suppliers.' });
  }
});

// Obtener un proveedor por ID
router.get('/:id', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id);
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
router.put('/:id', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const id = parseInt(req.params.id);
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
router.delete('/:id', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  const id = parseInt(req.params.id);
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

module.exports = router;
