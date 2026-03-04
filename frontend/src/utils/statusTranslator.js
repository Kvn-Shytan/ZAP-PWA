export const ORDER_STATUS_TRANSLATIONS = {
  PENDING_DELIVERY: 'Pendiente de Envío',
  OUT_FOR_DELIVERY: 'En Reparto (Hacia Armador)',
  DELIVERY_FAILED: 'Entrega Fallida',
  IN_ASSEMBLY: 'En Armado',
  PENDING_PICKUP: 'Listo para Retiro',
  RETURN_IN_TRANSIT: 'En Tránsito (Hacia Depósito)',
  PARTIALLY_RECEIVED: 'Recibido Parcialmente',
  COMPLETED: 'Completado',
  COMPLETED_WITH_NOTES: 'Cerrado con Notas',
  COMPLETED_WITH_DISCREPANCY: 'Cerrado con Discrepancia',
  CANCELLED: 'Cancelado',
};

export const translateOrderStatus = (status) => {
  return ORDER_STATUS_TRANSLATIONS[status] || status;
};
