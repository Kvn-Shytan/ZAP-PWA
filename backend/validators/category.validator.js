const { z } = require('zod');

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({ errors: error.issues });
  }
};

const createCategorySchema = z.object({
  name: z.string().min(1, 'El nombre de la categoría es requerido'),
});

module.exports = {
  validate,
  createCategorySchema,
};
