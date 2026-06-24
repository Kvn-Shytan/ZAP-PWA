import React from 'react';
import { translateOrderStatus } from '../utils/statusTranslator';
import './ThermalTicket.css';

const ThermalTicket = ({ order }) => {
  if (!order) return null;

  const dateObj = new Date(order.dateSent || Date.now());
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}`;

  // Get raw materials (items)
  const items = order.items || [];
  
  // Get expected finished products (expectedOutputs)
  const expectedOutputs = order.expectedOutputs || [];

  // Compute today's tracer label (DDMM + assembler's tracerCode)
  const today = new Date();
  const todayDay = String(today.getDate()).padStart(2, '0');
  const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
  const datePrefix = `${todayDay}${todayMonth}`;
  const tracerLabel = order.assembler?.tracerCode ? `${datePrefix}${order.assembler.tracerCode}` : null;

  return (
    <div className="thermal-ticket-container">
      <div className="thermal-ticket">
        {/* Header */}
        <div className="thermal-header">
          <h1 className="thermal-logo">*** ZAP ***</h1>
          <p className="thermal-sub">CONTROL DE PRODUCCIÓN EXTERNA</p>
          <div className="thermal-divider">--------------------------------</div>
        </div>

        {/* Order Meta Info */}
        <div className="thermal-section">
          <div className="thermal-row large-text">
            <span>ORDEN:</span>
            <strong>{order.orderNumber}</strong>
          </div>
          <div className="thermal-row">
            <span>FECHA:</span>
            <span>{formattedDate}</span>
          </div>
          <div className="thermal-row">
            <span>ESTADO:</span>
            <span>{translateOrderStatus(order.status).toUpperCase()}</span>
          </div>
          <div className="thermal-divider">--------------------------------</div>
        </div>

        {/* Assembler Info */}
        <div className="thermal-section">
          <h2 className="thermal-sec-title">ARMADOR ASIGNADO</h2>
          <p className="thermal-assembler-name">
            {order.assembler?.name} {order.assembler?.tracerCode && `(${order.assembler.tracerCode})`}
          </p>
          {order.assembler?.phone && (
            <p className="thermal-assembler-detail">Tel: {order.assembler.phone}</p>
          )}
          {order.assembler?.address && (
            <p className="thermal-assembler-detail">Dir: {order.assembler.address}</p>
          )}
          
          {tracerLabel && (
            <div style={{ marginTop: '2mm', padding: '1.5mm', border: '1px dashed #000', textAlign: 'center', backgroundColor: '#fafafa' }} className="thermal-tracer-box">
              <span style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                ETIQUETA: {tracerLabel}
              </span>
            </div>
          )}
          <div className="thermal-divider">--------------------------------</div>
        </div>

        {/* Section 1: Expected Finished Products */}
        <div className="thermal-section">
          <h2 className="thermal-sec-title">1. PRODUCTO TERMINADO ESPERADO</h2>
          {expectedOutputs.length > 0 ? (
            <table className="thermal-table">
              <thead>
                <tr>
                  <th className="th-cant">CANT</th>
                  <th className="th-desc">DESCRIPCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {expectedOutputs.map((output, index) => (
                  <tr key={`output-${index}`}>
                    <td className="td-cant">{Number(output.quantityExpected).toFixed(0)} {output.product?.unit || 'un'}</td>
                    <td className="td-desc">{output.product?.internalCode} - {output.product?.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="thermal-empty">No hay productos esperados.</p>
          )}
          <div className="thermal-divider">--------------------------------</div>
        </div>

        {/* Section 2: Materials Sent (delivered) */}
        <div className="thermal-section">
          <h2 className="thermal-sec-title">2. MATERIALES ENTREGADOS</h2>
          {items.length > 0 ? (
            <table className="thermal-table">
              <thead>
                <tr>
                  <th className="th-cant">CANT</th>
                  <th className="th-desc">DESCRIPCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={`item-${index}`}>
                    <td className="td-cant">{Number(item.quantitySent).toFixed(0)} {item.product?.unit || 'un'}</td>
                    <td className="td-desc">{item.product?.internalCode} - {item.product?.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="thermal-empty">No hay materiales cargados.</p>
          )}
          <div className="thermal-divider">--------------------------------</div>
        </div>

        {/* Notes/Observaciones */}
        {order.notes && (
          <div className="thermal-section">
            <h2 className="thermal-sec-title">OBSERVACIONES</h2>
            <p className="thermal-notes">{order.notes}</p>
            <div className="thermal-divider">--------------------------------</div>
          </div>
        )}

        {/* Footer info */}
        <div className="thermal-footer">
          <p>SISTEMA DE GESTIÓN ZAP</p>
          <p>Trazabilidad y calidad asegurada</p>
          <p className="thermal-timestamp">Impreso: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default ThermalTicket;
