// backend/routes/dashboard.routes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../authMiddleware');
const prisma = require('../prisma/client'); // Importar Prisma Client

// Endpoint para el panel de control
router.get('/', authenticateToken, async (req, res) => { // Convertir a async
  const user = req.user; // req.user es establecido por authenticateToken

  let dashboardData = {
    tasks: [],
    alerts: [],
    kpis: {}
  };

  if (!user || !user.role) {
    return res.status(401).json({ message: 'Unauthorized: User role not found' });
  }

  try {
    // --- LÓGICA REAL PARA EL ROL EMPLOYEE ---
    if (user.role === 'EMPLOYEE') {
      try {
        const [deliveries, pickups] = await Promise.all([
          // Tareas de Entrega
          prisma.externalProductionOrder.findMany({
            where: {
              deliveryUserId: user.userId, // CORRECTED
              status: 'OUT_FOR_DELIVERY',
            },
            include: { assembler: true },
          }),
          // Tareas de Recolección
          prisma.externalProductionOrder.findMany({
            where: {
              pickupUserId: user.userId, // CORRECTED
              status: { in: ['PENDING_PICKUP', 'RETURN_IN_TRANSIT'] },
            },
            include: { assembler: true },
          }),
        ]);

        const deliveryTasks = deliveries.map(order => ({
          id: `delivery-${order.id}`,
          text: `Entregar orden ${order.orderNumber} a ${order.assembler?.name || '[Armador no especificado]'}`,
          link: `/external-orders/${order.id}`,
        }));

        const pickupTasks = pickups.map(order => ({
          id: `pickup-${order.id}`,
          text: `Recoger orden ${order.orderNumber} de ${order.assembler?.name || '[Armador no especificado]'}`,
          link: `/external-orders/${order.id}`,
        }));

        dashboardData.tasks = [...deliveryTasks, ...pickupTasks];

      } catch (dbError) {
        console.error("Error específico en la consulta del dashboard:", dbError);
        return res.status(500).json({ 
          message: "La consulta a la base de datos para el dashboard falló.", 
          error: dbError.message 
        });
      }
    }

    // --- LÓGICA REAL PARA EL ROL SUPERVISOR ---
    if (user.role === 'SUPERVISOR') {
      try {
        const [
          pendingAssignmentOrders,
          failedDeliveryOrders,
          productsWithThreshold,
          ordersInProgressCount
        ] = await Promise.all([
          prisma.externalProductionOrder.findMany({
            where: { status: 'PENDING_DELIVERY' },
            include: { assembler: true },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.externalProductionOrder.findMany({
            where: { status: 'DELIVERY_FAILED' },
            include: { assembler: true },
            orderBy: { updatedAt: 'desc' },
          }),
          // Alerta: Productos con bajo stock (se filtran en memoria)
          prisma.product.findMany({
            where: { lowStockThreshold: { gt: 0 } },
          }),
          // KPI: Conteo de órdenes en proceso
          prisma.externalProductionOrder.count({
            where: {
              status: { in: ['OUT_FOR_DELIVERY', 'IN_ASSEMBLY', 'PENDING_PICKUP', 'RETURN_IN_TRANSIT', 'PARTIALLY_RECEIVED'] }
            }
          }),
        ]);

        // Mapear Tareas
        const pendingTasks = pendingAssignmentOrders.map(order => ({
          id: `task-pending-${order.id}`,
          text: `Asignar reparto para orden ${order.orderNumber} (${order.assembler?.name || 'N/A'})`,
          link: `/logistics-dashboard`, // Link al panel para que pueda usar las acciones
        }));

        const failedTasks = failedDeliveryOrders.map(order => ({
          id: `task-failed-${order.id}`,
          text: `Revisar entrega fallida para orden ${order.orderNumber} (${order.assembler?.name || 'N/A'})`,
          link: `/external-orders/${order.id}`,
        }));
        
        dashboardData.tasks = [...pendingTasks, ...failedTasks];

        // Mapear Alertas
        const lowStockAlerts = productsWithThreshold
          .filter(p => p.stock < p.lowStockThreshold)
          .map(p => {
            const link = p.type === 'RAW_MATERIAL'
              ? `/purchase-order?productId=${p.id}`
              : `/external-production-orders/new?productId=${p.id}`;

            return {
              id: `alert-stock-${p.id}`,
              type: 'LOW_STOCK',
              severity: 'high',
              message: `Bajo stock para ${p.description} (${p.internalCode}). Stock actual: ${p.stock}, umbral: ${p.lowStockThreshold}.`,
              link: link,
              timestamp: new Date().toISOString(),
            };
          });
        
        dashboardData.alerts = lowStockAlerts;

        // Asignar KPIs
        dashboardData.kpis = {
          'Órdenes en Proceso': ordersInProgressCount,
          'Tareas Pendientes': pendingTasks.length,
          'Entregas Fallidas': failedTasks.length,
        };

      } catch (dbError) {
        console.error("Error específico en la consulta del dashboard para SUPERVISOR:", dbError);
        return res.status(500).json({ 
          message: "La consulta a la base de datos para el dashboard falló.", 
          error: dbError.message 
        });
      }
    }

    if (user.role === 'ADMIN') {
      try {
        const [
          pendingPaymentOrders,
          // Supervisor data (re-using supervisor queries)
          pendingAssignmentOrders,
          failedDeliveryOrders,
          productsWithThreshold,
          ordersInProgressCount
        ] = await Promise.all([
          // ADMIN: Tareas - Pagos pendientes a armadores (se contará por armador)
          prisma.externalProductionOrder.findMany({
            where: {
              status: { in: ['COMPLETED', 'COMPLETED_WITH_NOTES', 'COMPLETED_WITH_DISCREPANCY'] },
              assemblerPaymentId: null,
              assemblerId: { not: null },
            },
            distinct: ['assemblerId'], // Contar ensambladores distintos
            select: {
              assembler: { select: { id: true, name: true } },
            },
          }),
          // SUPERVISOR: Tarea: Órdenes pendientes de asignación de reparto
          prisma.externalProductionOrder.findMany({
            where: { status: 'PENDING_DELIVERY' },
            include: { assembler: true },
            orderBy: { createdAt: 'desc' },
          }),
          // SUPERVISOR: Tarea: Órdenes con entrega fallida
          prisma.externalProductionOrder.findMany({
            where: { status: 'DELIVERY_FAILED' },
            include: { assembler: true },
            orderBy: { updatedAt: 'desc' },
          }),
          // SUPERVISOR: Alerta: Productos con bajo stock (se filtran en memoria)
          prisma.product.findMany({
            where: { lowStockThreshold: { gt: 0 } },
          }),
          // SUPERVISOR: KPI: Conteo de órdenes en proceso
          prisma.externalProductionOrder.count({
            where: {
              status: { in: ['OUT_FOR_DELIVERY', 'IN_ASSEMBLY', 'PENDING_PICKUP', 'RETURN_IN_TRANSIT', 'PARTIALLY_RECEIVED'] }
            }
          }),
        ]);

        // ADMIN: Mapear Tareas (Pagos pendientes)
        const adminPaymentTasks = pendingPaymentOrders
          .filter(order => order.assembler) // Safely filter out orders with null assembler
          .map(order => ({
            id: `task-admin-payment-${order.assembler.id}`,
            text: `Liquidar pagos pendientes para ${order.assembler.name}`,
            link: `/assembler-payment-batch`,
        }));
        
        // ADMIN: Mapear Alertas (Placeholder)
        const adminAlerts = [
          { id: 'alert-admin-general', type: 'INFO', severity: 'medium', message: 'Revisar informes financieros del último mes.', link: '/admin-tools/overhead-costs', timestamp: new Date().toISOString() },
        ];

        // ADMIN: KPIs
        const adminKpis = {
          'Armadores con Pagos Pendientes': adminPaymentTasks.length,
          'Ingresos Totales Último Mes (Simulado)': 'USD 150,000.00', // Mock de KPI
        };

        dashboardData.adminData = {
          tasks: adminPaymentTasks,
          alerts: adminAlerts,
          kpis: adminKpis,
        };


        // SUPERVISOR: Mapear Tareas (re-usando lógica del supervisor)
        const supervisorPendingTasks = pendingAssignmentOrders.map(order => ({
            id: `task-s-adminview-pending-${order.id}`,
            text: `Asignar reparto para orden ${order.orderNumber} (${order.assembler?.name || 'N/A'})`,
            link: `/logistics-dashboard`,
        }));

        const supervisorFailedTasks = failedDeliveryOrders.map(order => ({
            id: `task-s-adminview-failed-${order.id}`,
            text: `Revisar entrega fallida para orden ${order.orderNumber} (${order.assembler?.name || 'N/A'})`,
            link: `/external-orders/${order.id}`,
        }));
        
        const supervisorTasks = [...supervisorPendingTasks, ...supervisorFailedTasks];


        // SUPERVISOR: Mapear Alertas (re-usando lógica del supervisor)
        const supervisorLowStockAlerts = productsWithThreshold
          .filter(p => p.stock < p.lowStockThreshold)
          .map(p => {
            const link = p.type === 'RAW_MATERIAL'
              ? `/purchase-order?productId=${p.id}`
              : `/external-production-orders/new?productId=${p.id}`;
            return {
              id: `alert-s-adminview-stock-${p.id}`,
              type: 'LOW_STOCK',
              severity: 'high',
              message: `Bajo stock para ${p.description} (${p.internalCode}). Stock actual: ${p.stock}, umbral: ${p.lowStockThreshold}. (SUPERVISOR)`,
              link: link,
              timestamp: new Date().toISOString(),
            };
          });

        dashboardData.supervisorData = {
          tasks: supervisorTasks,
          alerts: supervisorLowStockAlerts,
          kpis: {
            'Órdenes en Proceso': ordersInProgressCount,
            'Tareas Pendientes': supervisorPendingTasks.length,
            'Entregas Fallidas': supervisorFailedTasks.length,
          },
        };

      } catch (dbError) {
        console.error("Error específico en la consulta del dashboard para ADMIN:", dbError);
        return res.status(500).json({ 
          message: "La consulta a la base de datos para el dashboard de ADMIN falló.", 
          error: dbError.message 
        });
      }
    }

    res.json(dashboardData);

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data.' });
  }
});

module.exports = router;