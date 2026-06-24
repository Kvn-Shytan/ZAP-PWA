import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { assemblerService } from '../services/assemblerService';
import Modal from '../components/Modal'; // Assuming a reusable Modal component exists
import './AssemblerManagementPage.css';

const INITIAL_FORM_STATE = {
  name: '',
  contactInfo: '',
  address: '',
  phone: '',
  email: '',
  paymentTerms: 'BI_WEEKLY',
  tracerCode: '',
};

// Sub-component for Pending Inventory Modal
function PendingInventoryModal({ assembler, onClose }) {
  const [pendingInventory, setPendingInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMaterialsVisible, setIsMaterialsVisible] = useState(false);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        const data = await assemblerService.getAssemblerInventory(assembler.id);
        setPendingInventory(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (assembler?.id) {
      fetchInventory();
    }
  }, [assembler?.id]);

  return (
    <Modal isOpen={true} title={`Inventario Pendiente de ${assembler.name}`} onClose={onClose}>
      {loading && <p>Cargando inventario pendiente...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {pendingInventory && (
        <div className="pending-inventory-details">
          <div className="pending-finished-products">
            <h4>Productos Finales Esperados</h4>
            {pendingInventory.pendingFinishedProducts.length > 0 ? (
              <ul className="pending-list">
                {pendingInventory.pendingFinishedProducts.map((item, index) => (
                  <tr key={`expected-prod-${index}`} className="pending-list-item">
                    <td>{Number(item.quantity).toFixed(0)} {item.product?.unit || 'un'}</td>
                    <td>{item.product?.internalCode} - {item.product?.description}</td>
                  </tr>
                ))}
              </ul>
            ) : (
              <p>No tiene productos pendientes de entrega.</p>
            )}
          </div>
          
          <div className="pending-materials-section">
            <div className="section-header-toggle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>
              <h4 style={{ margin: 0 }}>Materiales en su Poder</h4>
              <button 
                onClick={() => setIsMaterialsVisible(!isMaterialsVisible)} 
                className="btn btn-secondary" 
                style={{ padding: '2px 8px', fontSize: '11px' }}
              >
                {isMaterialsVisible ? 'Ocultar' : 'Ver Detalle'}
              </button>
            </div>
            
            {isMaterialsVisible && (
              <div className="pending-materials-detail" style={{ marginTop: '10px' }}>
                {pendingInventory.pendingMaterials.length > 0 ? (
                  <ul className="pending-list">
                    {pendingInventory.pendingMaterials.map((item, index) => (
                      <tr key={`material-hold-${index}`} className="pending-list-item">
                        <td>{Number(item.quantity).toFixed(0)} {item.product?.unit || 'un'}</td>
                        <td>{item.product?.internalCode} - {item.product?.description}</td>
                      </tr>
                    ))}
                  </ul>
                ) : (
                  <p>No tiene materiales registrados en su poder.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

// Edit Form Sub-Component
function EditForm({ assembler, onSave, onCancel }) {
  const [editedAssembler, setEditedAssembler] = useState({
    tracerCode: '',
    ...assembler
  });

  const handleChange = (e) => {
    setEditedAssembler({ ...editedAssembler, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(editedAssembler);
  };

  const paymentTermOptions = ['BI_WEEKLY', 'MONTHLY', 'PER_UNIT'];

  return (
    <form onSubmit={handleSubmit} className="edit-form">
      <h3>Editando a {assembler.name}</h3>
      <input type="text" name="name" placeholder="Nombre Completo" value={editedAssembler.name} onChange={handleChange} required />
      <input type="text" name="tracerCode" placeholder="Código Trazabilidad (ej. .002)" value={editedAssembler.tracerCode || ''} onChange={handleChange} maxLength="4" />
      <input type="text" name="contactInfo" placeholder="Persona de Contacto" value={editedAssembler.contactInfo} onChange={handleChange} />
      <input type="text" name="address" placeholder="Dirección" value={editedAssembler.address} onChange={handleChange} />
      <input type="text" name="phone" placeholder="Teléfono" value={editedAssembler.phone} onChange={handleChange} />
      <input type="email" name="email" placeholder="Email" value={editedAssembler.email} onChange={handleChange} />
      <select name="paymentTerms" value={editedAssembler.paymentTerms} onChange={handleChange}>
        {paymentTermOptions.map(term => <option key={term} value={term}>{term}</option>)}
      </select>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">Guardar Cambios</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}


function AssemblerManagementPage() {
  const { user } = useAuth();
  const [assemblers, setAssemblers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAssembler, setNewAssembler] = useState(INITIAL_FORM_STATE);
  const [editingAssembler, setEditingAssembler] = useState(null);

  const [showPendingInventoryModal, setShowPendingInventoryModal] = useState(false);
  const [selectedAssemblerForPending, setSelectedAssemblerForPending] = useState(null);

  // Search filter state
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAssemblers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await assemblerService.getAssemblers();
      setAssemblers(data);
    } catch (e) {
      setError('Failed to fetch assemblers: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssemblers();
  }, [fetchAssemblers]);

  const handleNewAssemblerChange = (e) => {
    setNewAssembler({ ...newAssembler, [e.target.name]: e.target.value });
  };

  const handleCreateAssembler = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await assemblerService.create(newAssembler);
      setNewAssembler(INITIAL_FORM_STATE);
      setShowCreateForm(false);
      fetchAssemblers();
    } catch (e) {
      setError('Failed to create assembler: ' + e.message);
    }
  };

  const handleDeleteAssembler = async (assemblerId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este ensamblador?')) return;
    setError(null);
    try {
      await assemblerService.delete(assemblerId);
      fetchAssemblers();
    } catch (e) {
      setError('Failed to delete assembler: ' + e.message);
    }
  };

  const handleUpdateAssembler = async (assemblerToUpdate) => {
    setError(null);
    try {
      await assemblerService.update(assemblerToUpdate.id, assemblerToUpdate);
      setEditingAssembler(null);
      fetchAssemblers();
    } catch (e) {
      setError('Failed to update assembler: ' + e.message);
    }
  };


  if (loading) return <p>Cargando ensambladores...</p>;
  if (error) return <p className="error-message">Error: {error}</p>;

  const isPrivilegedUser = user && (user.role === 'ADMIN' || user.role === 'SUPERVISOR');
  const paymentTermOptions = ['BI_WEEKLY', 'MONTHLY', 'PER_UNIT'];

  // Apply name and tracerCode filters
  const filteredAssemblers = assemblers.filter(assembler => {
    const searchLower = searchTerm.toLowerCase();
    const matchesName = assembler.name.toLowerCase().includes(searchLower);
    const matchesCode = assembler.tracerCode ? assembler.tracerCode.toLowerCase().includes(searchLower) : false;
    return matchesName || matchesCode;
  });

  if (editingAssembler) {
    return (
      <div className="assembler-management-page">
        <EditForm 
          assembler={editingAssembler} 
          onSave={handleUpdateAssembler} 
          onCancel={() => setEditingAssembler(null)} 
        />
      </div>
    );
  }

  return (
    <div className="assembler-management-page">
      <h2>Gestión de Ensambladores</h2>
      
      {isPrivilegedUser && (
        <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn btn-primary" style={{ marginBottom: '1.5rem' }}>
          {showCreateForm ? 'Cancelar' : 'Crear Nuevo Ensamblador'}
        </button>
      )}

      {showCreateForm && isPrivilegedUser && (
        <form onSubmit={handleCreateAssembler} className="create-form">
          <h3>Crear Nuevo Ensamblador</h3>
          <input type="text" name="name" placeholder="Nombre Completo" value={newAssembler.name} onChange={handleNewAssemblerChange} required />
          <input type="text" name="tracerCode" placeholder="Código Trazabilidad (ej. .002)" value={newAssembler.tracerCode || ''} onChange={handleNewAssemblerChange} maxLength="4" />
          <input type="text" name="contactInfo" placeholder="Persona de Contacto" value={newAssembler.contactInfo} onChange={handleNewAssemblerChange} />
          <input type="text" name="address" placeholder="Dirección" value={newAssembler.address} onChange={handleNewAssemblerChange} />
          <input type="text" name="phone" placeholder="Teléfono" value={newAssembler.phone} onChange={handleNewAssemblerChange} />
          <input type="email" name="email" placeholder="Email" value={newAssembler.email} onChange={handleNewAssemblerChange} />
          <select name="paymentTerms" value={newAssembler.paymentTerms} onChange={handleNewAssemblerChange}>
            {paymentTermOptions.map(term => <option key={term} value={term}>{term}</option>)}
          </select>
          <button type="submit" className="btn btn-success">Guardar Ensamblador</button>
        </form>
      )}

      <h3>Lista de Ensambladores</h3>

      {/* Name and TracerCode Filter Search Bar */}
      <div className="search-filter-container" style={{ marginBottom: '1rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="🔍 Buscar por nombre o código de armador (ej: .002)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '10px 14px', width: '320px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '12px' }}>
            Limpiar
          </button>
        )}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Cód. Trazabilidad</th>
            <th>Teléfono</th>
            <th>Dirección</th>
            {isPrivilegedUser && (
              <>
                <th>Email</th>
                <th>Condiciones de Pago</th>
                <th>Acciones</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {filteredAssemblers.map((assembler) => (
            <tr key={assembler.id}>
              <td data-label="Nombre"><span>{assembler.name}</span></td>
              <td data-label="Cód. Trazabilidad"><strong style={{ color: '#007bff' }}>{assembler.tracerCode || '-'}</strong></td>
              <td data-label="Teléfono"><span>{assembler.phone || '-'}</span></td>
              <td data-label="Dirección"><span>{assembler.address || '-'}</span></td>
              {isPrivilegedUser && (
                <>
                  <td data-label="Email"><span>{assembler.email || '-'}</span></td>
                  <td data-label="Condiciones de Pago"><span>{assembler.paymentTerms}</span></td>
                  <td data-label="Acciones">
                    <div className="action-buttons">
                      <button
                        className="btn btn-pending-inventory"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click if it were enabled
                          setSelectedAssemblerForPending(assembler);
                          setShowPendingInventoryModal(true);
                        }}
                      >
                        Pendientes
                      </button>
                      <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); setEditingAssembler(assembler); }}>Editar</button>
                      {user.role === 'ADMIN' && <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteAssembler(assembler.id); }}>Eliminar</button>}
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {showPendingInventoryModal && selectedAssemblerForPending && (
        <PendingInventoryModal
          assembler={selectedAssemblerForPending}
          onClose={() => {
            setShowPendingInventoryModal(false);
            setSelectedAssemblerForPending(null);
          }}
        />
      )}
    </div>
  );
}

export default AssemblerManagementPage;
