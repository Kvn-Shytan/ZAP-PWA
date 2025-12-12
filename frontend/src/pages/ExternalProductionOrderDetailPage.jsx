import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { externalProductionOrderService } from '../services/externalProductionOrderService';

const ExternalProductionOrderDetailPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const fetchedOrder = await externalProductionOrderService.getById(id);
        setOrder(fetchedOrder);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  if (loading) {
    return <p>Cargando detalles de la orden...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error al cargar la orden: {error}</p>;
  }

  if (!order) {
    return <p>No se encontró la orden.</p>;
  }

  // Helper to render product lists
  const renderProductList = (items, title) => (
    <div style={{ marginBottom: '1rem' }}>
      <h4>{title}</h4>
      {items.length > 0 ? (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {items.map((item, index) => (
            <li key={index} style={{ marginBottom: '0.5rem', borderBottom: '1px dotted #ccc', paddingBottom: '0.5rem' }}>
              {item.product.description} ({item.product.internalCode}) - Cantidad: {item.quantitySent || item.quantityExpected} {item.product.unit}
              {item.quantityReceived !== undefined && ` (Recibido: ${item.quantityReceived})`}
            </li>
          ))}
        </ul>
      ) : (
        <p>No hay {title.toLowerCase()} para esta orden.</p>
      )}
    </div>
  );

  // Helper to render assembly steps
  const renderAssemblySteps = (steps) => (
    <div style={{ marginBottom: '1rem' }}>
      <h4>Pasos de Armado</h4>
      {steps.length > 0 ? (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {steps.map((step, index) => (
            <li key={index} style={{ marginBottom: '0.5rem', borderBottom: '1px dotted #ccc', paddingBottom: '0.5rem' }}>
              {step.trabajoDeArmado.name} - Cantidad: {step.quantity}
            </li>
          ))}
        </ul>
      ) : (
        <p>No hay pasos de armado definidos para esta orden.</p>
      )}
    </div>
  );

  // Helper to render notes history
  const renderNotes = (notes) => (
    <div style={{ marginTop: '1.5rem' }}>
      <h3>Historial de Notas</h3>
      {notes && notes.length > 0 ? (
        <ul style={{ listStyleType: 'none', padding: 0, border: '1px solid #eee', borderRadius: '8px' }}>
          {notes.map((note) => (
            <li key={note.id} style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>
              <p style={{ margin: 0 }}>{note.content}</p>
              <small style={{ color: '#888' }}>
                - {note.author?.name || 'Sistema'} el {new Date(note.createdAt).toLocaleString()}
              </small>
            </li>
          ))}
        </ul>
      ) : (
        <p>No hay notas para esta orden.</p>
      )}
    </div>
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Detalle de Orden de Producción Externa #{order.orderNumber}</h2>
        <button onClick={() => window.print()} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Imprimir
        </button>
      </div>

      <div style={{ border: '1px solid #eee', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
        <h3>Información General</h3>
        <p><strong>Armador:</strong> {order.armador?.name}</p>
        {order.armador?.address && <p><strong>Dirección:</strong> {order.armador.address}</p>}
        {order.armador?.phone && <p><strong>Teléfono:</strong> {order.armador.phone}</p>}
        <p><strong>Estado:</strong> {order.status}</p>
        <p><strong>Fecha de Envío:</strong> {new Date(order.dateSent).toLocaleDateString()}</p>
        {order.expectedCompletionDate && <p><strong>Fecha de Finalización Esperada:</strong> {new Date(order.expectedCompletionDate).toLocaleDateString()}</p>}
        {order.deliveryUser && <p><strong>Asignado para Entrega:</strong> {order.deliveryUser.name}</p>}
        {order.pickupUser && <p><strong>Asignado para Recogida:</strong> {order.pickupUser.name}</p>}
      </div>

      {renderProductList(order.items, 'Materiales Enviados al Armador')}
      {renderProductList(order.expectedOutputs, 'Productos Esperados del Armador')}
      {renderAssemblySteps(order.assemblySteps)}
      {renderNotes(order.orderNotes)}

      <div style={{ marginTop: '2rem', textAlign: 'center', color: '#888' }}>
        <p>Generado el {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
};

export default ExternalProductionOrderDetailPage;
