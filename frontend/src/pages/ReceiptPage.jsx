import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { salesService } from '../services/salesService';
import PrintableReceipt from '../components/PrintableReceipt';

const ReceiptPage = () => {
  const { id } = useParams();
  const [saleData, setSaleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const printTriggered = useRef(false); // Evitar doble impresión

  useEffect(() => {
    const fetchSale = async () => {
      try {
        const data = await salesService.getSalesOrderById(id);
        setSaleData(data);
      } catch (err) {
        console.error("Error fetching sale:", err);
        setError("Error al cargar el recibo.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchSale();
    }
  }, [id]);

  useEffect(() => {
    // Auto-print solo una vez cuando los datos están listos
    if (saleData && !printTriggered.current) {
      printTriggered.current = true;
      const timer = setTimeout(() => {
        window.print();
      }, 800); // Un poco más de tiempo para asegurar renderizado de imágenes
      return () => clearTimeout(timer);
    }
  }, [saleData]);

  if (loading) return <div className="no-print" style={{padding: '2rem', textAlign: 'center'}}>Cargando recibo...</div>;
  if (error) return <div className="no-print" style={{padding: '2rem', textAlign: 'center', color: 'red'}}>{error}</div>;
  if (!saleData) return null;

  return (
    <div className="receipt-page-bg">
      <PrintableReceipt data={saleData} />
      
      <style>{`
        .receipt-page-bg {
          display: flex;
          justify-content: center;
          padding: 40px 20px;
          background-color: #525659; /* Fondo tipo visor de PDF */
          min-height: 100vh;
        }
        @media print {
          .receipt-page-bg {
            padding: 0 !important;
            background-color: white !important;
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ReceiptPage;
