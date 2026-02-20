const express = require('express');
const { z } = require('zod');
const prisma = require('../prisma/client');
const { authenticateToken, authorizeRole } = require('../authMiddleware');

const router = express.Router();

// --- Zod Schemas for Validation ---
const priceTierSchema = z.object({
  name: z.string().min(1, { message: "El nombre del nivel de precio es requerido." }),
  description: z.string().optional().nullable(),
  discountPercentage: z.number().min(0, { message: "El porcentaje de descuento debe ser no negativo." }).max(1, { message: "El porcentaje de descuento no puede ser mayor a 1 (100%)." }),
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

router.use(authenticateToken); // All priceTier routes require authentication

// GET all priceTiers
router.get('/', authorizeRole(['ADMIN']), async (req, res) => {
  try {
    const priceTiers = await prisma.priceTier.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(priceTiers);
  } catch (error) {
    console.error("Error fetching price tiers:", error);
    res.status(500).json({ error: 'Failed to fetch price tiers.' });
  }
});

// GET priceTier by ID
router.get('/:id', authorizeRole(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  try {
    const priceTier = await prisma.priceTier.findUnique({
      where: { id },
    });
    if (!priceTier) {
      return res.status(404).json({ error: 'Price tier not found.' });
    }
    res.json(priceTier);
  } catch (error) {
    console.error(`Error fetching price tier ${id}:`, error);
    res.status(500).json({ error: 'Failed to fetch price tier.' });
  }
});

// POST create new priceTier
router.post('/', authorizeRole(['ADMIN']), validate(priceTierSchema), async (req, res) => {
  const { name, description, discountPercentage } = req.body;
  try {
    const newPriceTier = await prisma.priceTier.create({
      data: {
        name,
        description,
        discountPercentage,
      },
    });
    res.status(201).json(newPriceTier);
  } catch (error) {
    console.error("Error creating price tier:", error);
    if (error.code === 'P2002') { // Unique constraint violation
      return res.status(409).json({ error: 'A price tier with this name already exists.' });
    }
    res.status(500).json({ error: 'Failed to create price tier.' });
  }
});

// PUT update priceTier
router.put('/:id', authorizeRole(['ADMIN']), validate(priceTierSchema), async (req, res) => {
  const { id } = req.params;
  const { name, description, discountPercentage } = req.body;
  try {
    const updatedPriceTier = await prisma.priceTier.update({
      where: { id },
      data: {
        name,
        description,
        discountPercentage,
      },
    });
    res.json(updatedPriceTier);
  } catch (error) {
    console.error(`Error updating price tier ${id}:`, error);
    if (error.code === 'P2002') { // Unique constraint violation
      return res.status(409).json({ error: 'A price tier with this name already exists.' });
    } else if (error.code === 'P2025') { // Record not found
      return res.status(404).json({ error: 'Price tier not found.' });
    }
    res.status(500).json({ error: 'Failed to update price tier.' });
  }
});

// DELETE priceTier
router.delete('/:id', authorizeRole(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.priceTier.delete({ where: { id } });
    res.status(204).send(); // No Content
  } catch (error) {
    console.error(`Error deleting price tier ${id}:`, error);
    if (error.code === 'P2025') { // Record not found
      return res.status(404).json({ error: 'Price tier not found.' });
    }
    // Handle foreign key constraint violation if priceTier is assigned to clients
    if (error.code === 'P2003') { 
      return res.status(400).json({ error: 'Cannot delete price tier assigned to clients.' });
    }
    res.status(500).json({ error: 'Failed to delete price tier.' });
  }
});

module.exports = router;