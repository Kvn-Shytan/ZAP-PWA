const express = require('express');
const { z } = require('zod');
const prisma = require('../prisma/client');
const { authenticateToken, authorizeRole } = require('../authMiddleware');

const router = express.Router();

// --- Zod Schemas for Validation ---
const clientSchema = z.object({
  name: z.string().min(1, { message: "El nombre del cliente es requerido." }),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.preprocess((val) => (val === "" ? null : val), z.string().email({ message: "Formato de email inválido." }).optional().nullable()),
  priceTierId: z.string().optional().nullable(),
});

// Helper function for validation
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    console.error("Zod Validation Error:", error.issues); // For debugging
    res.status(400).json({ errors: error.issues });
  }
};

router.use(authenticateToken); // All client routes require authentication

// GET all clients
router.get('/', authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      include: { priceTier: true },
      orderBy: { name: 'asc' },
    });
    res.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ error: 'Failed to fetch clients.' });
  }
});

// GET client by ID
router.get('/:id', authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { id } = req.params;
  try {
    const client = await prisma.client.findUnique({
      where: { id },
      include: { priceTier: true },
    });
    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }
    res.json(client);
  } catch (error) {
    console.error(`Error fetching client ${id}:`, error);
    res.status(500).json({ error: 'Failed to fetch client.' });
  }
});

// POST create new client
router.post('/', authorizeRole(['ADMIN', 'SUPERVISOR']), validate(clientSchema), async (req, res) => {
  const { name, address, phone, email, priceTierId } = req.body;
  try {
    const newClient = await prisma.client.create({
      data: {
        name,
        address,
        phone,
        email,
        priceTier: priceTierId ? { connect: { id: priceTierId } } : undefined,
      },
      include: { priceTier: true },
    });
    res.status(201).json(newClient);
  } catch (error) {
    console.error("Error creating client:", error);
    if (error.code === 'P2002') { // Unique constraint violation
      return res.status(409).json({ error: 'A client with this name already exists.' });
    }
    res.status(500).json({ error: 'Failed to create client.' });
  }
});

// PUT update client
router.put('/:id', authorizeRole(['ADMIN', 'SUPERVISOR']), validate(clientSchema), async (req, res) => {
  const { id } = req.params;
  const { name, address, phone, email, priceTierId } = req.body;
  try {
    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        name,
        address,
        phone,
        email,
        priceTier: priceTierId ? { connect: { id: priceTierId } } : { disconnect: priceTierId === null }, // Disconnect if priceTierId is null
      },
      include: { priceTier: true },
    });
    res.json(updatedClient);
  } catch (error) {
    console.error(`Error updating client ${id}:`, error);
    if (error.code === 'P2002') { // Unique constraint violation
      return res.status(409).json({ error: 'A client with this name already exists.' });
    } else if (error.code === 'P2025') { // Record not found
      return res.status(404).json({ error: 'Client not found.' });
    }
    res.status(500).json({ error: 'Failed to update client.' });
  }
});

// DELETE client
router.delete('/:id', authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.client.delete({ where: { id } });
    res.status(204).send(); // No Content
  } catch (error) {
    console.error(`Error deleting client ${id}:`, error);
    if (error.code === 'P2025') { // Record not found
      return res.status(404).json({ error: 'Client not found.' });
    }
    // Handle foreign key constraint violation if client has sales orders
    if (error.code === 'P2003') { 
      return res.status(400).json({ error: 'Cannot delete client with associated sales orders.' });
    }
    res.status(500).json({ error: 'Failed to delete client.' });
  }
});

module.exports = router;