const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../authMiddleware');
const prisma = require('../prisma/client');

// --- Funciones Auxiliares para Fechas ---
const isBusinessDay = (date) => {
  const day = date.getDay();
  return day !== 0; // 0 es Domingo
};

const getThreeBusinessDaysAgo = () => {
  let result = new Date();
  let subtractedDays = 0;
  while (subtractedDays < 3) {
    result.setDate(result.getDate() - 1);
    if (isBusinessDay(result)) subtractedDays++;
  }
  return result;
};

const get24HoursAgo = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

const getNextFortnightEnd = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();
  if (date <= 15) {
    return new Date(year, month, 15, 23, 59, 59, 999);
  } else {
    return new Date(year, month + 1, 0, 23, 59, 59, 999); // Último día del mes
  }
};

const getDaysUntil = (targetDate) => {
  const diffTime = targetDate - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

router.get('/', authenticateToken, async (req, res) => {
  const user = req.user;

  let dashboardData = {
    criticalAlerts: [],
    precautions: [],
    tasks: [],
    kpis: {}
  };

  if (!user || !user.role) {
    return res.status(401).json({ message: 'Unauthorized: User role not found' });
  }

  try {
    const now = new Date();
    const threeBusinessDaysAgo = getThreeBusinessDaysAgo();
    const twentyFourHoursAgo = get24HoursAgo();
    const nextFortnightEnd = getNextFortnightEnd();
    const daysToFortnight = getDaysUntil(nextFortnightEnd);
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

    // --- LÓGICA COMPARTIDA DE MERMAS (ADMIN / SUPERVISOR) ---
    let recentWastages = [];
    if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') {
      recentWastages = await prisma.wastageLog.findMany({
        where: {
          createdAt: { gte: fifteenDaysAgo },
          assemblerId: { not: null }
        },
        include: { assembler: true }
      });
    }

    const processWastageAlerts = (cAlerts, precs) => {
      const wastageByAssembler = {};
      recentWastages.forEach(w => {
        if (!wastageByAssembler[w.assemblerId]) {
          wastageByAssembler[w.assemblerId] = { assembler: w.assembler, count: 0, pending: 0 };
        }
        wastageByAssembler[w.assemblerId].count++;
        if (!w.costDeducted) wastageByAssembler[w.assemblerId].pending++;
      });

      Object.values(wastageByAssembler).forEach(info => {
        if (info.count >= 3) {
          cAlerts.push({
            id: `crit-waste-${info.assembler.id}`, type: 'POOR_PERFORMANCE', severity: 'critical',
            message: `Bajo rendimiento: El armador ${info.assembler.name} ha arruinado material ${info.count} veces en 15 días.`, link: `/wastage-management`
          });
        } else if (info.pending > 0) {
          precs.push({
            id: `prec-waste-${info.assembler.id}`, type: 'WASTAGE_WARNING', severity: 'warning',
            message: `Precaución: Nueva merma registrada para ${info.assembler.name}. Recordar dar aviso.`, link: `/wastage-management`
          });
        }
      });
    };

    // --- LÓGICA PARA EMPLOYEE ---
    if (user.role === 'EMPLOYEE') {
      const [deliveries, pickups] = await Promise.all([
        prisma.externalProductionOrder.findMany({
          where: { deliveryUserId: user.userId, status: 'OUT_FOR_DELIVERY' },
          include: { assembler: true },
        }),
        prisma.externalProductionOrder.findMany({
          where: { pickupUserId: user.userId, status: { in: ['PENDING_PICKUP', 'RETURN_IN_TRANSIT'] } },
          include: { assembler: true },
        }),
      ]);

      const deliveryTasks = deliveries.map(order => ({
        id: `delivery-${order.id}`,
        text: `Entregar orden ${order.orderNumber} a ${order.assembler?.name || 'N/A'}`,
        link: `/logistics-dashboard`,
      }));

      const pickupTasks = pickups.map(order => ({
        id: `pickup-${order.id}`,
        text: `Recoger orden ${order.orderNumber} de ${order.assembler?.name || 'N/A'}`,
        link: `/logistics-dashboard`,
      }));

      dashboardData.tasks = [...deliveryTasks, ...pickupTasks];
    }

    // --- LÓGICA PARA SUPERVISOR ---
    if (user.role === 'SUPERVISOR') {
      const [
        orders,
        productsWithThreshold,
        pickupTasksData
      ] = await Promise.all([
        prisma.externalProductionOrder.findMany({
          include: { assembler: true },
        }),
        prisma.product.findMany({
          where: { lowStockThreshold: { gt: 0 } },
        }),
        prisma.externalProductionOrder.findMany({
          where: { pickupUserId: user.userId, status: { in: ['PENDING_PICKUP', 'RETURN_IN_TRANSIT'] } },
          include: { assembler: true },
        }),
      ]);

      let criticalAlerts = [];
      let precautions = [];
      let tasks = [];
      let inProcessCount = 0;

      // Procesar Productos (Stock)
      productsWithThreshold.forEach(p => {
        const link = p.type === 'RAW_MATERIAL' ? `/purchase-order?productId=${p.id}` : `/external-production-orders/new?productId=${p.id}`;
        if (Number(p.stock) <= 0) {
          criticalAlerts.push({
            id: `crit-stock-${p.id}`, type: 'STOCK_OUT', severity: 'critical',
            message: `¡RUPTURA DE STOCK! ${p.description} (${p.internalCode}) se ha agotado.`, link
          });
        } else if (Number(p.stock) <= Number(p.lowStockThreshold)) {
          precautions.push({
            id: `prec-stock-${p.id}`, type: 'LOW_STOCK', severity: 'warning',
            message: `Bajo stock: ${p.description}. Actual: ${p.stock}, Umbral: ${p.lowStockThreshold}.`, link
          });
        }
      });

      // Procesar Órdenes
      orders.forEach(order => {
        const link = `/logistics-dashboard`;
        
        // KPIs
        if (['OUT_FOR_DELIVERY', 'IN_ASSEMBLY', 'PENDING_PICKUP', 'RETURN_IN_TRANSIT', 'PARTIALLY_RECEIVED'].includes(order.status)) {
          inProcessCount++;
        }

        // Críticas
        if (order.status === 'DELIVERY_FAILED') {
          criticalAlerts.push({
            id: `crit-fail-${order.id}`, type: 'DELIVERY_FAILED', severity: 'critical',
            message: `Entrega fallida: Orden ${order.orderNumber} para ${order.assembler?.name}. Requiere acción.`, link
          });
        }
        if (order.status === 'IN_ASSEMBLY' && new Date(order.updatedAt) < threeBusinessDaysAgo) {
          criticalAlerts.push({
            id: `crit-inact-${order.id}`, type: 'INACTIVITY', severity: 'critical',
            message: `Inactividad: Orden ${order.orderNumber} en manos de ${order.assembler?.name} por más de 3 días hábiles.`, link
          });
        }

        // Precauciones
        if (['PENDING_DELIVERY', 'OUT_FOR_DELIVERY', 'PENDING_PICKUP'].includes(order.status) && new Date(order.updatedAt) < twentyFourHoursAgo) {
          precautions.push({
            id: `prec-delay-${order.id}`, type: 'DELAY', severity: 'warning',
            message: `Retraso logístico: Orden ${order.orderNumber} estancada en ${order.status} por más de 24hs.`, link
          });
        }
        if (order.status === 'COMPLETED_WITH_DISCREPANCY') {
          precautions.push({
            id: `prec-disc-${order.id}`, type: 'DISCREPANCY', severity: 'warning',
            message: `Discrepancia: Orden ${order.orderNumber} cerrada con diferencias en cantidades.`, link: `/external-orders/${order.id}`
          });
        }

        // Tareas (Solo asignación pendiente si no es un retraso severo)
        if (order.status === 'PENDING_DELIVERY' && new Date(order.updatedAt) >= twentyFourHoursAgo) {
          tasks.push({
            id: `task-assign-${order.id}`, text: `Asignar reparto: Orden ${order.orderNumber}`, link
          });
        }
      });

      // Tareas propias del supervisor
      pickupTasksData.forEach(order => {
        tasks.push({
          id: `pickup-${order.id}`, text: `Recoger orden ${order.orderNumber} de ${order.assembler?.name}`, link: `/logistics-dashboard`
        });
      });

      processWastageAlerts(criticalAlerts, precautions);

      dashboardData = { criticalAlerts, precautions, tasks, kpis: { 'Órdenes en Proceso': inProcessCount } };
    }

    // --- LÓGICA PARA ADMIN ---
    if (user.role === 'ADMIN') {
      const [
        orders,
        productsWithThreshold,
        unpaidOrders,
        adminDeliveries,
        adminPickups
      ] = await Promise.all([
        prisma.externalProductionOrder.findMany({ include: { assembler: true } }),
        prisma.product.findMany({ where: { lowStockThreshold: { gt: 0 } } }),
        prisma.externalProductionOrder.findMany({
          where: { status: { in: ['COMPLETED', 'COMPLETED_WITH_NOTES', 'COMPLETED_WITH_DISCREPANCY'] }, assemblerPaymentId: null },
          distinct: ['assemblerId'],
          select: { assembler: { select: { id: true, name: true } } },
        }),
        prisma.externalProductionOrder.findMany({ where: { deliveryUserId: user.userId, status: 'OUT_FOR_DELIVERY' }, include: { assembler: true } }),
        prisma.externalProductionOrder.findMany({ where: { pickupUserId: user.userId, status: { in: ['PENDING_PICKUP', 'RETURN_IN_TRANSIT'] } }, include: { assembler: true } }),
      ]);

      let criticalAlerts = [];
      let precautions = [];
      let tasks = [];
      let inProcessCount = 0;

      // Fechas de Pago
      if (daysToFortnight <= 1) {
        criticalAlerts.push({
          id: `crit-pay`, type: 'PAYMENT_DUE', severity: 'critical',
          message: `¡ALERTA DE PAGO! Cierre de quincena en menos de 24 horas.`, link: `/assembler-payment-batch`
        });
      } else if (daysToFortnight <= 5) {
        precautions.push({
          id: `prec-pay`, type: 'PAYMENT_UPCOMING', severity: 'warning',
          message: `Precaución: Faltan ${daysToFortnight} días para el cierre de quincena.`, link: `/assembler-payment-batch`
        });
      }

      // Tareas de Pago
      unpaidOrders.filter(o => o.assembler).forEach(o => {
        tasks.push({
          id: `task-pay-${o.assembler.id}`, text: `Liquidar pagos para ${o.assembler.name}`, link: `/assembler-payment-batch`
        });
      });

      // Misma lógica de Supervisor para el resto
      productsWithThreshold.forEach(p => {
        const link = p.type === 'RAW_MATERIAL' ? `/purchase-order?productId=${p.id}` : `/external-production-orders/new?productId=${p.id}`;
        if (Number(p.stock) <= 0) {
          criticalAlerts.push({ id: `crit-stock-${p.id}`, type: 'STOCK_OUT', severity: 'critical', message: `¡RUPTURA DE STOCK! ${p.description} se ha agotado.`, link });
        } else if (Number(p.stock) <= Number(p.lowStockThreshold)) {
          precautions.push({ id: `prec-stock-${p.id}`, type: 'LOW_STOCK', severity: 'warning', message: `Bajo stock: ${p.description}. Actual: ${p.stock}`, link });
        }
      });

      orders.forEach(order => {
        const link = `/logistics-dashboard`;
        if (['OUT_FOR_DELIVERY', 'IN_ASSEMBLY', 'PENDING_PICKUP', 'RETURN_IN_TRANSIT', 'PARTIALLY_RECEIVED'].includes(order.status)) inProcessCount++;
        if (order.status === 'DELIVERY_FAILED') criticalAlerts.push({ id: `crit-fail-${order.id}`, type: 'DELIVERY_FAILED', severity: 'critical', message: `Entrega fallida: Orden ${order.orderNumber}.`, link });
        if (order.status === 'IN_ASSEMBLY' && new Date(order.updatedAt) < threeBusinessDaysAgo) criticalAlerts.push({ id: `crit-inact-${order.id}`, type: 'INACTIVITY', severity: 'critical', message: `Inactividad: Orden ${order.orderNumber} estancada por > 3 días.`, link });
        if (['PENDING_DELIVERY', 'OUT_FOR_DELIVERY', 'PENDING_PICKUP'].includes(order.status) && new Date(order.updatedAt) < twentyFourHoursAgo) precautions.push({ id: `prec-delay-${order.id}`, type: 'DELAY', severity: 'warning', message: `Retraso logístico: Orden ${order.orderNumber} estancada por > 24hs.`, link });
        if (order.status === 'COMPLETED_WITH_DISCREPANCY') precautions.push({ id: `prec-disc-${order.id}`, type: 'DISCREPANCY', severity: 'warning', message: `Discrepancia: Orden ${order.orderNumber} cerrada con diferencias.`, link: `/external-orders/${order.id}` });
        if (order.status === 'PENDING_DELIVERY' && new Date(order.updatedAt) >= twentyFourHoursAgo) tasks.push({ id: `task-assign-${order.id}`, text: `Asignar reparto: Orden ${order.orderNumber}`, link });
      });

      adminDeliveries.forEach(order => tasks.push({ id: `delivery-admin-${order.id}`, text: `Entregar orden ${order.orderNumber}`, link: `/logistics-dashboard` }));
      adminPickups.forEach(order => tasks.push({ id: `pickup-admin-${order.id}`, text: `Recoger orden ${order.orderNumber}`, link: `/logistics-dashboard` }));

      processWastageAlerts(criticalAlerts, precautions);

      dashboardData.adminData = { criticalAlerts, precautions, tasks, kpis: { 'Armadores con Pagos Pendientes': unpaidOrders.length } };
      dashboardData.supervisorData = { criticalAlerts, precautions, tasks: tasks.filter(t => !t.id.includes('admin')), kpis: { 'Órdenes en Proceso': inProcessCount } };
    }

    res.json(dashboardData);

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data.' });
  }
});

module.exports = router;
