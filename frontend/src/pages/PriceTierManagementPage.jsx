import React, { useState, useEffect } from 'react';
import { priceTierService } from '../services/priceTierService';
import Modal from '../components/Modal';
import './PriceTierManagementPage.css';

const PriceTierManagementPage = () => {
  const [priceTiers, setPriceTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discountPercentage: ''
  });

  useEffect(() => {
    fetchPriceTiers();
  }, []);

  const fetchPriceTiers = async () => {
    try {
      setLoading(true);
      const data = await priceTierService.getAll();
      setPriceTiers(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar los niveles de precio.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (tier = null) => {
    if (tier) {
      setEditingTier(tier);
      setFormData({
        name: tier.name,
        description: tier.description || '',
        discountPercentage: (tier.discountPercentage * 100).toString()
      });
    } else {
      setEditingTier(null);
      setFormData({ name: '', description: '', discountPercentage: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTier(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        ...formData,
        discountPercentage: parseFloat(formData.discountPercentage) / 100
      };

      if (editingTier) {
        await priceTierService.update(editingTier.id, dataToSend);
      } else {
        await priceTierService.create(dataToSend);
      }
      
      handleCloseModal();
      fetchPriceTiers();
      alert(editingTier ? 'Nivel actualizado con éxito.' : 'Nivel creado con éxito.');
    } catch (err) {
      alert(err.message || 'Error al guardar el nivel de precio.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este nivel de precio?')) {
      try {
        await priceTierService.delete(id);
        fetchPriceTiers();
        alert('Nivel eliminado con éxito.');
      } catch (err) {
        alert(err.message || 'Error al eliminar el nivel de precio.');
      }
    }
  };

  const formatDiscount = (val) => {
    return `${(val * 100).toFixed(0)}%`;
  };

  if (loading && priceTiers.length === 0) return <div className="price-tier-page-container">Cargando niveles de precio...</div>;

  return (
    <div className="price-tier-page-container">
      <header className="price-tier-header">
        <h1>Niveles de Precio</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          + Nuevo Nivel
        </button>
      </header>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Vista Escritorio (Tabla) */}
      <div className="price-tier-table-container">
        <table className="price-tier-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Descuento</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {priceTiers.map(tier => (
              <tr key={tier.id}>
                <td><strong>{tier.name}</strong></td>
                <td>{tier.description || '-'}</td>
                <td><span className="price-tier-discount">{formatDiscount(tier.discountPercentage)}</span></td>
                <td>
                  <div className="price-tier-actions">
                    <button className="btn btn-outline-primary btn-sm" onClick={() => handleOpenModal(tier)}>Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tier.id)}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista Móvil (Tarjetas) */}
      <div className="price-tier-cards-container">
        {priceTiers.map(tier => (
          <div key={tier.id} className="price-tier-card">
            <div className="price-tier-card-header">
              <span className="price-tier-name">{tier.name}</span>
              <span className="price-tier-discount">{formatDiscount(tier.discountPercentage)}</span>
            </div>
            <div className="price-tier-description">
              {tier.description || 'Sin descripción'}
            </div>
            <div className="price-tier-actions">
              <button className="btn btn-outline-primary btn-sm" onClick={() => handleOpenModal(tier)}>Editar</button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tier.id)}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Formulario */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingTier ? 'Editar Nivel de Precio' : 'Nuevo Nivel de Precio'}
      >
        <form onSubmit={handleSubmit} className="price-tier-form">
          <div className="form-group">
            <label>Nombre del Nivel *</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleInputChange} 
              required 
              placeholder="Ej: Cliente Mayorista"
            />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleInputChange} 
              placeholder="Opcional: Detalles del nivel"
              rows="3"
            />
          </div>
          <div className="form-group">
            <label>Porcentaje de Descuento (0-100) *</label>
            <input 
              type="number" 
              name="discountPercentage" 
              value={formData.discountPercentage} 
              onChange={handleInputChange} 
              required 
              min="0"
              max="100"
              step="1"
              placeholder="Ej: 15"
            />
          </div>
          <div className="price-tier-actions" style={{justifyContent: 'flex-end', marginTop: '1rem'}}>
            <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancelar</button>
            <button type="submit" className="btn btn-success">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PriceTierManagementPage;
