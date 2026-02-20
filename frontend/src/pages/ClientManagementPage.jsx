import React, { useState, useEffect } from 'react';
import { clientService } from '../services/clientService';
import { priceTierService } from '../services/priceTierService';
import Modal from '../components/Modal';
import './ClientManagementPage.css';

const ClientManagementPage = () => {
  const [clients, setClients] = useState([]);
  const [priceTiers, setPriceTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    priceTierId: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [clientsData, tiersData] = await Promise.all([
        clientService.getAll(),
        priceTierService.getAll()
      ]);
      setClients(clientsData);
      setPriceTiers(tiersData);
      setError(null);
    } catch (err) {
      setError('Error al cargar la información de clientes.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        address: client.address || '',
        phone: client.phone || '',
        email: client.email || '',
        priceTierId: client.priceTierId || ''
      });
    } else {
      setEditingClient(null);
      setFormData({ name: '', address: '', phone: '', email: '', priceTierId: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
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
        priceTierId: formData.priceTierId === '' ? null : formData.priceTierId
      };

      if (editingClient) {
        await clientService.update(editingClient.id, dataToSend);
      } else {
        await clientService.create(dataToSend);
      }
      
      handleCloseModal();
      fetchInitialData();
      alert(editingClient ? 'Cliente actualizado con éxito.' : 'Cliente creado con éxito.');
    } catch (err) {
      alert(err.message || 'Error al guardar el cliente.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
      try {
        await clientService.delete(id);
        fetchInitialData();
        alert('Cliente eliminado con éxito.');
      } catch (err) {
        alert(err.message || 'Error al eliminar el cliente.');
      }
    }
  };

  if (loading && clients.length === 0) return <div className="client-page-container">Cargando clientes...</div>;

  return (
    <div className="client-page-container">
      <header className="client-header">
        <h1>Gestión de Clientes</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          + Nuevo Cliente
        </button>
      </header>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Vista Escritorio (Tabla) */}
      <div className="client-table-container">
        <table className="client-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Contacto</th>
              <th>Nivel de Precio</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(client => (
              <tr key={client.id}>
                <td>
                  <strong>{client.name}</strong>
                  <div style={{fontSize: '0.85rem', color: '#666'}}>{client.address || 'Sin dirección'}</div>
                </td>
                <td>
                  <div style={{fontSize: '0.9rem'}}>{client.phone || '-'}</div>
                  <div style={{fontSize: '0.8rem', color: '#666'}}>{client.email || '-'}</div>
                </td>
                <td>
                  <span className="client-tier-badge">
                    {client.priceTier ? client.priceTier.name : 'Precio Base'}
                  </span>
                </td>
                <td>
                  <div className="client-actions">
                    <button className="btn btn-outline-primary btn-sm" onClick={() => handleOpenModal(client)}>Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(client.id)}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista Móvil (Tarjetas) */}
      <div className="client-cards-container">
        {clients.map(client => (
          <div key={client.id} className="client-card">
            <div className="client-card-header">
              <span className="client-name">{client.name}</span>
              <span className="client-tier-badge">{client.priceTier ? client.priceTier.name : 'Base'}</span>
            </div>
            <div className="client-info-row">
              <span>📞 {client.phone || 'N/A'}</span>
            </div>
            <div className="client-info-row" style={{color: '#666', fontSize: '0.8rem'}}>
              <span>📍 {client.address || 'Sin dirección'}</span>
            </div>
            <div className="client-actions">
              <button className="btn btn-outline-primary btn-sm" onClick={() => handleOpenModal(client)}>Editar</button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(client.id)}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Formulario */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
      >
        <form onSubmit={handleSubmit} className="client-form">
          <div className="form-group">
            <label>Nombre Completo / Razón Social *</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleInputChange} 
              required 
              placeholder="Ej: Distribuidora Norte"
            />
          </div>
          <div className="form-group">
            <label>Dirección</label>
            <input 
              type="text" 
              name="address" 
              value={formData.address} 
              onChange={handleInputChange} 
              placeholder="Ej: Av. Principal 123"
            />
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <input 
              type="text" 
              name="phone" 
              value={formData.phone} 
              onChange={handleInputChange} 
              placeholder="Ej: +54 9 11 ..."
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              name="email" 
              value={formData.email} 
              onChange={handleInputChange} 
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div className="form-group">
            <label>Nivel de Precio (Descuento)</label>
            <select 
              name="priceTierId" 
              value={formData.priceTierId} 
              onChange={handleInputChange}
            >
              <option value="">Precio Base (Sin descuento)</option>
              {priceTiers.map(tier => (
                <option key={tier.id} value={tier.id}>
                  {tier.name} ({(tier.discountPercentage * 100).toFixed(0)}%)
                </option>
              ))}
            </select>
          </div>
          <div className="client-actions" style={{justifyContent: 'flex-end', marginTop: '1rem'}}>
            <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancelar</button>
            <button type="submit" className="btn btn-success">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ClientManagementPage;
