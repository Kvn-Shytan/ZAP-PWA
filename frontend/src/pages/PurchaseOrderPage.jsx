import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { apiFetch } from '../services/api'; // Import the new apiFetch
import './PurchaseOrderPage.css';

function PurchaseOrderPage() {
  const [rawMaterials, setRawMaterials] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchRawMaterials = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Use authFetch and remove /api prefix
        const data = await apiFetch('/products?type=RAW_MATERIAL');
        
        const products = data.products || [];
        
        const options = products.map(p => ({
          value: p.id,
          label: `${p.internalCode} - ${p.description}`,
          unit: p.unit, // Include the unit in the option object
        }));
        setRawMaterials(options);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRawMaterials();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !quantity || quantity <= 0) {
      setError('Por favor, seleccione un producto e ingrese una cantidad válida.');
      return;
    }

    // Add confirmation dialog
    const isConfirmed = window.confirm(
      `¿Está seguro de que desea registrar la compra de ${quantity} x ${selectedProduct.label}?`
    );

    if (!isConfirmed) {
      return; // Abort submission if user cancels
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage('');

    try {
      // Use authFetch and remove /api prefix
      await apiFetch('/inventory/purchase', {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedProduct.value,
          quantity: parseInt(quantity, 10),
          notes: notes,
        }),
      });

      setSuccessMessage('¡Compra registrada con éxito! El stock ha sido actualizado.');
      // Reset form
      setSelectedProduct(null);
      setQuantity('');
      setNotes('');
      
      // Hide success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = selectedProduct && quantity > 0;

  return (
    <div className="purchase-order-container">
      <h1>Registrar Compra de Materia Prima</h1>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <form onSubmit={handleSubmit} className="purchase-form">
        <div className="form-group">
          <label htmlFor="product-select">Producto</label>
          <Select
            id="product-select"
            options={rawMaterials}
            value={selectedProduct}
            onChange={setSelectedProduct}
            isLoading={isLoading}
            placeholder="Escriba para buscar un producto..."
            noOptionsMessage={() => 'No se encontraron materias primas'}
            isClearable
          />
        </div>

        <div className="form-group">
          <label htmlFor="quantity">Cantidad</label>
          <div className="quantity-wrapper">
            <input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ej: 100"
              min="1"
            />
            {selectedProduct && <span className="unit-display">{selectedProduct.unit}</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="notes">Notas (Opcional)</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Factura N° 1234, Proveedor Z"
            rows="3"
          ></textarea>
        </div>

        <button type="submit" disabled={!isFormValid || isSubmitting}>
          {isSubmitting ? 'Registrando...' : 'Registrar Compra'}
        </button>
      </form>
    </div>
  );
}

export default PurchaseOrderPage;