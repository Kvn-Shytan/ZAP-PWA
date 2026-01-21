import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { assemblerService } from '../services/assemblerService';
import EditForm from '../components/EditForm'; // Assuming EditForm will be moved to components
import './AssemblerDetailsPage.css'; // NEW: Add a CSS file for styling

function AssemblerDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [assembler, setAssembler] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'edit', 'pending'

  const [pendingInventory, setPendingInventory] = useState(null);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState(null);

  useEffect(() => {
    const fetchAssemblerDetails = async () => {
      try {
        setLoading(true);
        const data = await assemblerService.getAssemblerById(id);
        setAssembler(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAssemblerDetails();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'pending' && assembler?.id) {
      const fetchPendingInventory = async () => {
        try {
          setPendingLoading(true);
          setPendingError(null);
          const data = await assemblerService.getAssemblerInventory(assembler.id);
          setPendingInventory(data);
        } catch (err) {
          setPendingError(err.message);
        } finally {
          setPendingLoading(false);
        }
      };
      fetchPendingInventory();
    }
  }, [activeTab, assembler?.id]);

  const handleUpdateAssembler = async (assemblerToUpdate) => {
    setError(null);
    try {
      await assemblerService.update(assemblerToUpdate.id, assemblerToUpdate);
      setAssembler(assemblerToUpdate); // Update local state with new data
      setActiveTab('info'); // Go back to info tab after saving
    } catch (e) {
      setError('Failed to update assembler: ' + e.message);
    }
  };


  if (loading) return <p>Cargando detalles del ensamblador...</p>;
  if (error) return <p className="error-message">Error: {error}</p>;
  if (!assembler) return <p>No se encontró el ensamblador.</p>;

  return (
    <div className="assembler-details-page">
      <h2>Detalles del Ensamblador: {assembler.name}</h2>

      <div className="tabs">
        <button className={activeTab === 'info' ? 'active' : ''} onClick={() => setActiveTab('info')}>Información</button>
        {user && (user.role === 'ADMIN' || user.role === 'SUPERVISOR') && (
          <button className={activeTab === 'edit' ? 'active' : ''} onClick={() => setActiveTab('edit')}>Editar</button>
        )}
        {(user && (user.role === 'ADMIN' || user.role === 'SUPERVISOR')) && ( // Only ADMIN/SUPERVISOR can see pending tab
          <button className={activeTab === 'pending' ? 'active' : ''} onClick={() => setActiveTab('pending')}>Pendientes</button>
        )}
      </div>

      <div className="tab-content">
        {activeTab === 'info' && (
          <div>
            <h3>Información General</h3>
            <p>ID: {assembler.id}</p>
            <p>Contacto: {assembler.contactInfo}</p>
            <p>Dirección: {assembler.address}</p>
            <p>Teléfono: {assembler.phone}</p>
            <p>Email: {assembler.email}</p>
            <p>Condiciones de Pago: {assembler.paymentTerms}</p>
          </div>
        )}
        {activeTab === 'edit' && user && (user.role === 'ADMIN' || user.role === 'SUPERVISOR') && (
          <div>
            <h3>Editar Ensamblador</h3>
            <EditForm
                assembler={assembler}
                onSave={handleUpdateAssembler}
                onCancel={() => setActiveTab('info')} // Go back to info tab if cancelled
            />
          </div>
        )}
        {activeTab === 'pending' && user && (user.role === 'ADMIN' || user.role === 'SUPERVISOR') && (
          <div className="pending-inventory-tab">
            <h3>Inventario Pendiente</h3>
            {pendingLoading && <p>Cargando inventario pendiente...</p>}
            {pendingError && <p className="error-message">Error al cargar inventario: {pendingError}</p>}
            {pendingInventory && (
              <div className="pending-inventory-lists">
                <div className="pending-materials">
                  <h4>Materiales Enviados (en poder del armador)</h4>
                  {pendingInventory.pendingMaterials.length > 0 ? (
                    <ul className="pending-list">
                      {pendingInventory.pendingMaterials.map((item, index) => (
                        <li key={index} className="pending-item">
                          <span>{item.product.description} ({item.product.internalCode}):</span>
                          <span className="quantity">{item.quantity} {item.product.unit}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No hay materiales enviados pendientes.</p>
                  )}
                </div>

                <div className="pending-finished-products">
                  <h4>Productos Finales Esperados</h4>
                  {pendingInventory.pendingFinishedProducts.length > 0 ? (
                    <ul className="pending-list">
                      {pendingInventory.pendingFinishedProducts.map((item, index) => (
                        <li key={index} className="pending-item">
                          <span>{item.product.description} ({item.product.internalCode}):</span>
                          <span className="quantity">{item.quantity} {item.product.unit}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No hay productos finales pendientes.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AssemblerDetailsPage;
