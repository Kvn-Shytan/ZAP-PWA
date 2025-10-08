const { z } = require('zod');

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({ errors: error.errors });
  }
};

const createProductSchema = z.object({
  internalCode: z.string().min(1, 'El código interno es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  unit: z.string().min(1, 'La unidad es requerida'),
  priceUSD: z.number().nullable().optional(),
  priceARS: z.number().nullable().optional(),
  stock: z.number().optional(),
  lowStockThreshold: z.number().optional(),
  type: z.string().optional(),
  isClassified: z.boolean().optional(),
  categoryId: z.number().nullable().optional(),
  supplierId: z.number().nullable().optional(),
});

module.exports = {
  validate,
  createProductSchema,
};
