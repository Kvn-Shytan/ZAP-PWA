import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { externalProductionOrderService } from '../services/externalProductionOrderService';
import ThermalTicket from '../components/ThermalTicket';
import './ExternalOrderTicketPage.css';

const ExternalOrderTicketPage = () => {
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

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    window.close();
  };

  if (loading) {
    return (
      <div className="ticket-loading no-print">
        <p>Generando comanda térmica...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ticket-error no-print">
        <p style={{ color: 'red' }}>Error al generar comanda: {error}</p>
        <button onClick={handleClose}>Cerrar Ventana</button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="ticket-error no-print">
        <p>No se encontró la orden especificada.</p>
        <button onClick={handleClose}>Cerrar Ventana</button>
      </div>
    );
  }

  return (
    <div className="ticket-page-bg">
      {/* Control bar - Hidden during printing */}
      <div className="ticket-controls no-print">
        <button className="btn-print" onClick={handlePrint}>
          🖨️ Imprimir Comanda
        </button>
        <button className="btn-close" onClick={handleClose}>
          ❌ Cerrar Vista
        </button>
      </div>

      {/* Printable Ticket */}
      <div className="ticket-paper-wrapper">
        <ThermalTicket order={order} />
      </div>
    </div>
  );
};

export default ExternalOrderTicketPage;
