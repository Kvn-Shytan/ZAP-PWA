const express = require('express');
const cors = require('cors'); // Import cors
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto'); // Import crypto module
const { authenticateToken, authorizeRole } = require('./authMiddleware');
const productRoutes = require('./routes/products.routes');

const categoryRoutes = require('./routes/categories.routes');

const supplierRoutes = require('./routes/suppliers.routes');

const prisma = new PrismaClient();
const app = express();
const port = 3001;

app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173' })); // Use cors middleware

app.get('/api/', (req, res) => {
  res.send('¡El Backend de ZAP PWA está funcionando!');
});

// Use product routes
app.use('/api/products', productRoutes);

// Use category routes
app.use('/api/categories', categoryRoutes);

// Use supplier routes
app.use('/api/suppliers', supplierRoutes);

// --- ARMADOR ENDPOINTS ---
// Crear un nuevo armador
app.post('/api/assemblers', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
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
app.get('/api/assemblers', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR', 'EMPLOYEE']), async (req, res) => {
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
app.get('/api/assemblers/:id', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR', 'EMPLOYEE']), async (req, res) => {
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
app.put('/api/assemblers/:id', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
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
app.delete('/api/assemblers/:id', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
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

// --- OVERHEAD COST ENDPOINTS ---
// Crear un nuevo costo indirecto
app.post('/api/overhead-costs', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
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
app.get('/api/overhead-costs', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
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
app.get('/api/overhead-costs/:id', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
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
app.put('/api/overhead-costs/:id', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
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
app.delete('/api/overhead-costs/:id', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
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

// --- PRODUCT DESIGN STATION ENDPOINTS ---

// Obtener todos los datos de diseño de un producto
app.get('/api/product-design/:id', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  try {
    const productDesign = await prisma.product.findUnique({
      where: { id: id },
      include: {
        // Incluir la lista de materiales (componentes)
        components: {
          orderBy: { component: { description: 'asc' } },
          include: {
            component: {
              select: { id: true, internalCode: true, description: true, unit: true, stock: true, priceARS: true },
            },
          },
        },
        // Incluir el costo de armado
        trabajoDeArmado: true,
        // Incluir los costos indirectos asignados
        overheadCosts: {
          orderBy: { overheadCost: { name: 'asc' } },
          include: {
            overheadCost: true,
          },
        },
      },
    });

    if (!productDesign) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    // Opcional: Calcular costos totales en el backend
    // let totalMaterialCost = 0;
    // productDesign.components.forEach(comp => {
    //   totalMaterialCost += (comp.component.priceARS || 0) * comp.quantity;
    // });

    res.json(productDesign);

  } catch (error) {
    console.error(`Error fetching product design for id ${id}:`, error);
    res.status(500).json({ error: 'Error al obtener los datos de diseño del producto.' });
  }
});

// Añadir un componente a la receta de un producto
app.post('/api/product-design/:id/components', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  const { id: productId } = req.params;
  const { componentId, quantity } = req.body;

  if (!componentId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'componentId and a positive quantity are required.' });
  }
  if (productId === componentId) {
    return res.status(400).json({ error: 'Un producto no puede ser componente de sí mismo.' });
  }

  try {
    const newComponent = await prisma.productComponent.create({
      data: {
        productId: productId,
        componentId: componentId,
        quantity: quantity,
      },
    });
    res.status(201).json(newComponent);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Este componente ya existe en la receta.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al añadir el componente.' });
  }
});

// Actualizar la cantidad de un componente en la receta
app.put('/api/product-design/:id/components/:componentId', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  const { id: productId, componentId } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: 'A positive quantity is required.' });
  }

  try {
    const updatedComponent = await prisma.productComponent.update({
      where: {
        productId_componentId: {
          productId: productId,
          componentId: componentId,
        },
      },
      data: {
        quantity: quantity,
      },
    });
    res.json(updatedComponent);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Componente no encontrado en la receta.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el componente.' });
  }
});

// Eliminar un componente de la receta de un producto
app.delete('/api/product-design/:id/components/:componentId', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  const { id: productId, componentId } = req.params;

  try {
    await prisma.productComponent.delete({
      where: {
        productId_componentId: {
          productId: productId,
          componentId: componentId,
        },
      },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Componente no encontrado en la receta.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el componente.' });
  }
});

// Crear o actualizar el costo de armado de un producto
app.post('/api/product-design/:id/assembly-cost', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  const { id: productId } = req.params;
  const { precio, nombre, descripcion } = req.body;

  if (precio === undefined || precio < 0) {
    return res.status(400).json({ error: 'El precio es requerido y no puede ser negativo.' });
  }

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    const assemblyCost = await prisma.trabajoDeArmado.upsert({
      where: { productoId: productId },
      update: {
        precio: precio,
        nombre: nombre || product.description, // Usa el nombre del producto si no se provee
        descripcion: descripcion,
      },
      create: {
        productoId: productId,
        precio: precio,
        nombre: nombre || product.description, // Usa el nombre del producto si no se provee
        descripcion: descripcion,
      },
    });
    res.status(201).json(assemblyCost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al guardar el costo de armado.' });
  }
});

// Asignar un costo indirecto a un producto
app.post('/api/product-design/:id/overhead-costs', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  const { id: productId } = req.params;
  const { overheadCostId, quantity } = req.body;

  if (!overheadCostId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'overheadCostId and a positive quantity are required.' });
  }

  try {
    const newProductOverhead = await prisma.productOverhead.create({
      data: {
        productId: productId,
                  overheadCostId: overheadCostId,
                  quantity: quantity,      },
    });
    res.status(201).json(newProductOverhead);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Este costo indirecto ya ha sido asignado al producto.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al asignar el costo indirecto.' });
  }
});

// Eliminar un costo indirecto de un producto
app.delete('/api/product-design/:id/overhead-costs/:overheadCostId', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  const { id: productId, overheadCostId } = req.params;

  try {
    await prisma.productOverhead.delete({
      where: {
        productId_overheadCostId: {
          productId: productId,
          overheadCostId: overheadCostId,
        },
      },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'La asignación de costo indirecto no fue encontrada.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el costo indirecto.' });
  }
});
// --- AUTH ENDPOINTS ---
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' } // 8-hour expiration
    );

    const { password: _, ...userWithoutPassword } = user;

    res.json({ token, user: userWithoutPassword });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed.' });
  }
});



// --- USER ENDPOINTS ---
const saltRounds = 10;

// Crear un nuevo usuario
app.post('/api/users', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
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
app.get('/api/users', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
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
app.get('/api/users/:id', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
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

app.put('/api/users/change-password', authenticateToken, async (req, res) => {
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
app.put('/api/users/:id/reset-password', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
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
app.put('/api/users/:id', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
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



// --- INVENTORY MOVEMENT ENDPOINTS ---

// Registrar una Orden de Producción
app.post('/api/inventory/production', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR', 'EMPLOYEE']), async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.user.userId;

  if (!productId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'productId and a positive quantity are required.' });
  }

  try {
    const eventId = crypto.randomUUID(); // Generate a unique ID for this event

    // Iniciar una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Encontrar los componentes del producto (su "receta")
      const components = await tx.productComponent.findMany({
        where: { productId: productId },
        include: { component: true }, // Incluir datos del componente para verificar stock
      });

      if (components.length === 0) {
        throw new Error('Este producto no tiene componentes definidos y no puede ser producido de esta forma.');
      }

      // 2. Verificar si hay suficiente stock de CADA componente
      for (const item of components) {
        const requiredStock = item.quantity * quantity;
        if (item.component.stock < requiredStock) {
          throw new Error(`Stock insuficiente para el componente: ${item.component.description}. Necesario: ${requiredStock}, Disponible: ${item.component.stock}`);
        }
      }

      // 3. Crear el movimiento de entrada para el producto fabricado (PRODUCTION_IN)
      const productionIn = await tx.inventoryMovement.create({
        data: {
          productId: productId,
          type: 'PRODUCTION_IN',
          quantity: quantity,
          userId: userId,
          notes: `Producción de ${quantity} unidades.`,
          eventId: eventId, // Assign event ID
        }
      });

      // 4. Actualizar el stock del producto fabricado
      const finalProductUpdate = await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: quantity } },
      });

      // 5. Crear los movimientos de salida para cada componente (PRODUCTION_OUT)
      const componentMovements = [];
      for (const item of components) {
        const requiredStock = item.quantity * quantity;

        const productionOut = await tx.inventoryMovement.create({
          data: {
            productId: item.componentId,
            type: 'PRODUCTION_OUT',
            quantity: requiredStock,
            userId: userId,
            notes: `Uso para producción de ${quantity} x ${finalProductUpdate.description}`,
            eventId: eventId, // Assign the same event ID
          }
        });
        componentMovements.push(productionOut);

        await tx.product.update({
          where: { id: item.componentId },
          data: { stock: { decrement: requiredStock } },
        });
      }
      
      return { productionIn, componentMovements };
    });

    res.status(201).json(result);

  } catch (error) {
    // Si el error es por stock insuficiente o cualquier otra cosa, la transacción hará rollback
    console.error("Error en la transacción de producción:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// Registrar una Compra
app.post('/api/inventory/purchase', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { productId, quantity, notes } = req.body;
  const userId = req.user.userId;

  if (!productId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'productId and a positive quantity are required.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Opcional: Verificar que el producto es de tipo RAW_MATERIAL
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new Error('Producto no encontrado.');
      }
      if (product.type !== 'RAW_MATERIAL') {
        // O se podría permitir comprar cualquier cosa, a definir.
        throw new Error('Solo se pueden registrar compras de productos tipo RAW_MATERIAL.');
      }

      // Crear el movimiento de entrada
      const purchaseMovement = await tx.inventoryMovement.create({
        data: {
          productId: productId,
          type: 'PURCHASE',
          quantity: quantity,
          userId: userId,
          notes: notes || `Compra de ${quantity} unidades.`
        }
      });

      // Actualizar el stock del producto
      await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: quantity } },
      });

      return purchaseMovement;
    });

    res.status(201).json(result);

  } catch (error) {
    console.error("Error en la transacción de compra:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// Registrar una Venta
app.post('/api/inventory/sale', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { productId, quantity, notes } = req.body;
  const userId = req.user.userId;

  if (!productId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'productId and a positive quantity are required.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new Error('Producto no encontrado.');
      }
      // Opcional: verificar que sea un producto FINISHED
      if (product.type !== 'FINISHED') {
        throw new Error('Solo se pueden vender productos de tipo FINISHED.');
      }

      // Verificar stock
      if (product.stock < quantity) {
        throw new Error(`Stock insuficiente. Disponible: ${product.stock}, Requerido: ${quantity}`);
      }

      // Crear el movimiento de salida
      const saleMovement = await tx.inventoryMovement.create({
        data: {
          productId: productId,
          type: 'SALE',
          quantity: quantity,
          userId: userId,
          notes: notes || `Venta de ${quantity} unidades.`
        }
      });

      // Actualizar el stock del producto
      await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      });

      return saleMovement;
    });

    res.status(201).json(result);

  } catch (error) {
    console.error("Error en la transacción de venta:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// Anular un Movimiento de Inventario (Contra-asiento)
app.post('/api/inventory/reversal', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { movementId } = req.body;
  const userPerformingReversalId = req.user.userId;

  if (!movementId) {
    return res.status(400).json({ error: 'movementId is required.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const originalMovement = await tx.inventoryMovement.findUnique({ where: { id: movementId } });

      if (!originalMovement) throw new Error('Movimiento original no encontrado.');
      if (originalMovement.notes?.startsWith('Anulación')) throw new Error('No se puede anular un movimiento que ya es una anulación.');

      let movementsToReverse = [];

      if (originalMovement.eventId) {
        // Si tiene un eventId, buscar todos los movimientos del evento
        const eventMovements = await tx.inventoryMovement.findMany({ where: { eventId: originalMovement.eventId } });
        // Verificar que ninguno haya sido anulado ya
        for (const mov of eventMovements) {
            const existingReversal = await tx.inventoryMovement.findFirst({ where: { notes: `Anulación del mov. #${mov.id}` } });
            if (existingReversal) throw new Error(`El evento #${originalMovement.eventId} ya ha sido anulado (movimiento #${mov.id} ya fue revertido).`);
        }
        movementsToReverse = eventMovements;
      } else {
        // Si no, solo anular el movimiento individual
        const existingReversal = await tx.inventoryMovement.findFirst({ where: { notes: `Anulación del mov. #${movementId}` } });
        if (existingReversal) throw new Error('Este movimiento ya ha sido anulado previamente.');
        movementsToReverse.push(originalMovement);
      }

      const reversalMovements = [];
      for (const mov of movementsToReverse) {
        let reversalType;
        let stockChange;
        const isIncome = ['PURCHASE', 'PRODUCTION_IN', 'CUSTOMER_RETURN', 'ADJUSTMENT_IN'].includes(mov.type);

        if (isIncome) {
          reversalType = 'ADJUSTMENT_OUT';
          stockChange = { decrement: mov.quantity };
        } else {
          reversalType = 'ADJUSTMENT_IN';
          stockChange = { increment: mov.quantity };
        }

        const reversal = await tx.inventoryMovement.create({
          data: {
            productId: mov.productId,
            type: reversalType,
            quantity: mov.quantity,
            userId: userPerformingReversalId,
            notes: `Anulación del mov. #${mov.id}`,
          },
        });
        reversalMovements.push(reversal);

        await tx.product.update({
          where: { id: mov.productId },
          data: { stock: stockChange },
        });
      }

      return reversalMovements;
    });

    res.status(201).json(result);

  } catch (error) {
    console.error("Error en la anulación de movimiento:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// Obtener productos con bajo stock
app.get('/api/inventory/low-stock', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  try {
    const lowStockProducts = await prisma.product.findMany({
      where: {
        // Usamos `expr` para poder comparar dos campos del mismo modelo
        stock: {
          lt: prisma.product.fields.lowStockThreshold,
        },
        // Opcional: filtrar para que solo muestre productos que tienen un umbral definido > 0
        lowStockThreshold: {
          gt: 0,
        },
      },
      orderBy: {
        description: 'asc',
      },
    });
    res.json(lowStockProducts);
  } catch (error) {
    console.error("Error al obtener productos con bajo stock:", error.message);
    res.status(500).json({ error: 'Failed to fetch low stock products.' });
  }
});

// Actualizar el umbral de bajo stock para un producto
app.put('/api/inventory/low-stock-threshold', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  const { productId, newThreshold } = req.body;

  if (!productId || newThreshold === undefined || newThreshold < 0) {
    return res.status(400).json({ error: 'productId and a non-negative newThreshold are required.' });
  }

  try {
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { lowStockThreshold: newThreshold },
    });
    res.json(updatedProduct);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found.' });
    }
    console.error("Error al actualizar el umbral de bajo stock:", error.message);
    res.status(500).json({ error: 'Failed to update low stock threshold.' });
  }
});

// Obtener historial de movimientos con filtros y paginación
app.get('/api/inventory/movements', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const {
    page = 1,
    pageSize = 20,
    productId,
    userId,
    type,
    startDate,
    endDate,
    isCorrection
  } = req.query;

  const pageNum = parseInt(page);
  const pageSizeNum = parseInt(pageSize);

  const where = {};

  if (productId) {
    where.productId = productId;
  }
  if (userId) {
    where.userId = parseInt(userId);
  }
  if (type) {
    where.type = type;
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }
  if (isCorrection === 'true') {
    where.OR = [
      { type: 'ADJUSTMENT_IN' },
      { type: 'ADJUSTMENT_OUT' },
      { type: 'WASTAGE' },
    ];
  }

  try {
    const movements = await prisma.inventoryMovement.findMany({
      where,
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        product: {
          select: { description: true, internalCode: true },
        },
        user: {
          select: { name: true, email: true },
        },
      },
    });

    const totalMovements = await prisma.inventoryMovement.count({ where });

    res.json({
      movements,
      totalMovements,
      currentPage: pageNum,
      totalPages: Math.ceil(totalMovements / pageSizeNum),
    });

  } catch (error) {
    console.error("Error al obtener historial de movimientos:", error.message);
    res.status(500).json({ error: 'Failed to fetch inventory movements.' });
  }
});

// NUEVO ENDPOINT: Obtener productos no clasificados
app.get('/api/products/unclassified', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  console.log('[/api/products/unclassified] Request received.');
  try {
    const unclassifiedProducts = await prisma.product.findMany({
      where: { isClassified: false },
      select: {
        id: true,
        internalCode: true,
        description: true,
        type: true, // Para mostrar el tipo actual
      },
      orderBy: { description: 'asc' },
    });
    console.log(`[/api/products/unclassified] Found ${unclassifiedProducts.length} unclassified products.`);
    res.json(unclassifiedProducts);
  } catch (error) {
    console.error("[/api/products/unclassified] Error al obtener productos no clasificados:", error.message);
    res.status(500).json({ error: 'Failed to fetch unclassified products.' });
  }
});


app.listen(port, () => {
  console.log(`Backend escuchando en http://localhost:${port}`);
});
