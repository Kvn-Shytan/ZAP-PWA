const express = require('express');
const prisma = require('../prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // Aunque no se usa directamente aquí, puede ser útil para futuras expansiones
const { authenticateToken, authorizeRole } = require('../authMiddleware');

const router = express.Router();
const saltRounds = 10;

// Middleware para proteger todas las rutas de este archivo
router.use(authenticateToken);

// Crear un nuevo usuario
router.post('/', authorizeRole('ADMIN'), async (req, res) => {
  try {
    const { email, name, password } = req.body;
    let { role } = req.body; // Make role optional

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role || undefined, // Use provided role or let Prisma use default (NO_ROLE)
      },
    });
    // No devolver el password hasheado
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// Obtener todos los usuarios (sin passwords)
router.get('/', authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// Obtener un usuario por ID (sin password)
router.get('/:id', authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

router.put('/change-password', async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  const userId = req.user.userId; // ID del usuario logueado desde el token

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return res.status(400).json({ error: 'Todos los campos de contraseña son requeridos.' });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ error: 'La nueva contraseña y su confirmación no coinciden.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta.' });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await prisma.user.update({
      where: { id: userId },
      data: { password: newHashedPassword },
    });

    res.json({ message: 'Contraseña cambiada exitosamente.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cambiar la contraseña.' });
  }
});

// Resetear la contraseña de un usuario (Admin only)
router.put('/:id/reset-password', authorizeRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);
  const defaultPassword = 'zap123';

  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    const newHashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

    await prisma.user.update({
      where: { id: userId },
      data: { password: newHashedPassword },
    });

    res.json({ message: `Password for user ${userId} has been reset.`, newPassword: defaultPassword });

  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// Actualizar un usuario por ID
router.put('/:id', authorizeRole('ADMIN'), async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  const { email, name, password, role } = req.body;
  
  const dataToUpdate = { email, name, role };

  if (password) {
    dataToUpdate.password = await bcrypt.hash(password, saltRounds);
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });
    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

module.exports = router;
