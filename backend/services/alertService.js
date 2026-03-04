const prisma = require('../prisma/client');
const logger = require('../utils/logger');

/**
 * Checks if a date is a business day (Monday to Saturday)
 * @param {Date} date 
 * @returns {boolean}
 */
const isBusinessDay = (date) => {
  const day = date.getDay();
  return day !== 0; // 0 is Sunday
};

/**
 * Gets the date 3 business days ago
 * @returns {Date}
 */
const getThreeBusinessDaysAgo = () => {
  let result = new Date();
  let subtractedDays = 0;
  // We want to find the date that was 3 business days ago
  while (subtractedDays < 3) {
    result.setDate(result.getDate() - 1);
    if (isBusinessDay(result)) {
      subtractedDays++;
    }
  }
  // Set to end of day to be conservative (anything before the end of that day is "old")
  result.setHours(23, 59, 59, 999);
  return result;
};

const alertService = {
  /**
   * Scans for orders in IN_ASSEMBLY state that haven't changed in 3 business days
   */
  async checkInactivityAlerts() {
    logger.info('Iniciando escaneo de alertas por inactividad...');
    const thresholdDate = getThreeBusinessDaysAgo();

    try {
      const inactiveOrders = await prisma.externalProductionOrder.findMany({
        where: {
          status: 'IN_ASSEMBLY',
          updatedAt: {
            lt: thresholdDate,
          },
          // Evitar duplicar alertas activas para la misma orden
          alerts: {
            none: {
              type: 'INACTIVITY',
              status: 'ACTIVE',
            }
          }
        },
        include: {
          assembler: true,
        }
      });

      if (inactiveOrders.length > 0) {
        logger.info(`Se encontraron ${inactiveOrders.length} órdenes inactivas.`);
      }

      for (const order of inactiveOrders) {
        await prisma.alert.create({
          data: {
            type: 'INACTIVITY',
            status: 'ACTIVE',
            message: `La orden ${order.orderNumber} con el armador ${order.assembler.name} está inactiva hace más de 3 días hábiles.`,
            externalProductionOrderId: order.id,
          }
        });
        logger.info(`Alerta de inactividad creada para la orden ${order.orderNumber}`);
      }

      // Auto-resolver alertas para órdenes que ya no están en IN_ASSEMBLY
      const resolvedAlerts = await prisma.alert.updateMany({
        where: {
          type: 'INACTIVITY',
          status: 'ACTIVE',
          externalProductionOrder: {
            status: {
              not: 'IN_ASSEMBLY'
            }
          }
        },
        data: {
          status: 'RESOLVED'
        }
      });

      if (resolvedAlerts.count > 0) {
        logger.info(`Se auto-resolvieron ${resolvedAlerts.count} alertas de inactividad.`);
      }

    } catch (error) {
      logger.error('Error al escanear alertas de inactividad:', error);
    }
  },

  async getActiveAlerts() {
    return await prisma.alert.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        externalProductionOrder: {
          select: {
            orderNumber: true,
            status: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  },

  async dismissAlert(alertId) {
    return await prisma.alert.update({
      where: { id: alertId },
      data: { status: 'DISMISSED' }
    });
  }
};

module.exports = alertService;
