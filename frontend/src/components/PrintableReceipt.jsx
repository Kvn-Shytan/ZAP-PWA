import React from 'react';
import './PrintableReceipt.css';
import logo from '../assets/ZAP-LogoRemito.jpg'; // Asegúrate de que la extensión sea correcta (.jpg o .png)
import { parseClientName } from '../utils/clientParser';

const PrintableReceipt = ({ data }) => {
  if (!data) return null;

  const parsedClient = parseClientName(data);

  // Formatear fecha
  const dateObj = new Date(data.date || Date.now());
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = String(dateObj.getFullYear()).slice(-2); // YY

  // Usar el número de orden oficial del backend (formato SO-YYMMDD-0001)
  const formattedRemitNumber = data.orderNumber || 'PENDIENTE'; 

  // Preparar ítems para la tabla (rellenar hasta X filas)
  const minRows = 8;
  const items = data.items || [];
  const emptyRows = Math.max(0, minRows - items.length);

  const formatCurrency = (amount) => {
    return `$ ${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="printable-receipt-container">
      <div className="receipt-box">
        {/* Caja de Tipo de Documento */}
        <div className="receipt-type-box">
          <div className="receipt-type-letter">X</div>
          <div>DOCUMENTO NO VALIDO COMO FACTURA</div>
        </div>

        {/* Encabezado */}
        <div className="receipt-header">
          <div className="header-left">
            <img src={logo} alt="ZAP4" className="logo-img" />
            
            <div className="company-info">
              <div className="company-info-item">📍 Republica de Chile 1521, Villa Luzuriaga</div>
              <div className="company-info-item">✉️ ventas.zap4@gmail.com</div>
              <div className="company-info-item">📞 011 2397 2271</div>
            </div>
          </div>

          <div className="header-right">
            <div className="receipt-date">
              Fecha: {day} / {month} / {year}
            </div>
            <div className="receipt-title-row">
              <div className="receipt-title">REMITO Nº</div>
              <div className="receipt-number">{formattedRemitNumber}</div>
            </div>
          </div>
        </div>

        {/* Datos del Cliente */}
        <div className="client-section">
          <div className="client-info-box">
            <div className="client-row">
              <span className="client-label">SEÑOR(ES):</span>
              <span className="client-value">{parsedClient.name}</span>
            </div>
            <div className="client-row">
              <span className="client-label">TELEFONO:</span>
              <span className="client-value">{data.client?.phone || ''}</span>
            </div>
            <div className="client-row">
              <span className="client-label">DIRECCION:</span>
              <span className="client-value">{data.client?.address || ''}</span>
            </div>
          </div>
        </div>

        {/* Tabla de Productos */}
        <table className="items-table">
          <thead>
            <tr>
              <th className="col-cant">Cant.</th>
              <th className="col-art">Articulo</th>
              <th className="col-precio">Precio unitario</th>
              <th className="col-total">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td className="col-cant">{item.quantity}</td>
                <td className="col-art">{item.product?.internalCode} - {item.product?.description}</td>
                <td className="col-precio">{formatCurrency(item.unitPrice)}</td>
                <td className="col-total">{formatCurrency(item.unitPrice * item.quantity)}</td>
              </tr>
            ))}
            {/* Rellenar con filas vacías */}
            {[...Array(Math.max(0, minRows - items.length))].map((_, i) => (
              <tr key={`empty-${i}`} className="empty-row">
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pie de Tabla (Observaciones y Total) */}
        <div className="footer-section">
          <div className="observations-box">
            <div className="observations-title">OBSERVACIONES</div>
            <div>{parsedClient.cleanNotes || ''}</div>
          </div>
          <div className="total-container">
            <div className="total-label-box">TOTAL</div>
            <div className="total-value-box">{formatCurrency(data.totalAmount)}</div>
          </div>
        </div>

        {/* Firma */}
        <div className="signature-section">
          <div className="signature-box">FIRMA CLIENTE</div>
        </div>

        {/* Legal Footer */}
        <div className="legal-footer">
          Documento NO VALIDO como factura. Industria Argentina
        </div>
      </div>
    </div>
  );
};

export default PrintableReceipt;
