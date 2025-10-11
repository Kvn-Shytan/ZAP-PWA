const express = require('express');
const { authenticateToken, authorizeRole } = require('../authMiddleware');

const prisma = require('../prisma/client');
const router = express.Router();

// Crear un nuevo armador
router.post('/', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  try {
    const { name, contactInfo, address, phone, email, paymentTerms } = req.body;
    if (!name || !paymentTerms) {
      return res.status(400).json({ error: 'Name and paymentTerms are required' });
    }
    const newAssembler = await prisma.armador.create({
      data: { name, contactInfo, address, phone, email, paymentTerms },
    });
    res.status(201).json(newAssembler);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'An assembler with this name already exists.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create assembler.' });
  }
});

// Obtener todos los armadores (con seguridad a nivel de campo)
router.get('/', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR', 'EMPLOYEE']), async (req, res) => {
  const { role } = req.user;
  const selectFields = (role === 'ADMIN' || role === 'SUPERVISOR')
    ? undefined // Admins/Supervisors ven todo
    : { id: true, name: true, phone: true, address: true }; // Employees ven un set limitado

  try {
    const assemblers = await prisma.armador.findMany({
      select: selectFields,
      orderBy: { name: 'asc' },
    });
    res.json(assemblers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch assemblers.' });
  }
});

// Obtener un armador por ID (con seguridad a nivel de campo)
router.get('/:id', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR', 'EMPLOYEE']), async (req, res) => {
  const { id } = req.params;
  const { role } = req.user;
  const selectFields = (role === 'ADMIN' || role === 'SUPERVISOR')
    ? undefined // Admins/Supervisors ven todo
    : { id: true, name: true, phone: true, address: true }; // Employees ven un set limitado

  try {
    const assembler = await prisma.armador.findUnique({
      where: { id },
      select: selectFields,
    });
    if (assembler) {
      res.json(assembler);
    } else {
      res.status(404).json({ error: 'Assembler not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch assembler.' });
  }
});

// Actualizar un armador por ID
router.put('/:id', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { id } = req.params;
  const { name, contactInfo, address, phone, email, paymentTerms } = req.body;
  try {
    const updatedAssembler = await prisma.armador.update({
      where: { id },
      data: { name, contactInfo, address, phone, email, paymentTerms },
    });
    res.json(updatedAssembler);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Assembler not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'An assembler with this name already exists.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update assembler.' });
  }
});

// Eliminar un armador por ID
router.delete('/:id', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.armador.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Assembler not found' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to delete assembler.' });
  }
});

module.exports = router;
