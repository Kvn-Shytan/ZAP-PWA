import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { assemblerService } from '../services/assemblerService';
import './AssemblerManagementPage.css';

const INITIAL_FORM_STATE = {
  name: '',
  contactInfo: '',
  address: '',
  phone: '',
  email: '',
  paymentTerms: 'BI_WEEKLY',
};

// Edit Form Sub-Component
function EditForm({ assembler, onSave, onCancel }) {
  const [editedAssembler, setEditedAssembler] = useState(assembler);

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
        <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn btn-primary">
          {showCreateForm ? 'Cancelar' : 'Crear Nuevo Ensamblador'}
        </button>
      )}

      {showCreateForm && isPrivilegedUser && (
        <form onSubmit={handleCreateAssembler} className="create-form">
          <h3>Crear Nuevo Ensamblador</h3>
          <input type="text" name="name" placeholder="Nombre Completo" value={newAssembler.name} onChange={handleNewAssemblerChange} required />
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
      <table className="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
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
          {assemblers.map((assembler) => (
            <tr key={assembler.id}>
              <td data-label="Nombre"><span>{assembler.name}</span></td>
              <td data-label="Teléfono"><span>{assembler.phone || '-'}</span></td>
              <td data-label="Dirección"><span>{assembler.address || '-'}</span></td>
              {isPrivilegedUser && (
                <>
                  <td data-label="Email"><span>{assembler.email || '-'}</span></td>
                  <td data-label="Condiciones de Pago"><span>{assembler.paymentTerms}</span></td>
                  <td data-label="Acciones">
                    <div>
                      <button className="btn btn-secondary" onClick={() => setEditingAssembler(assembler)}>Editar</button>
                      {user.role === 'ADMIN' && <button className="btn btn-danger" onClick={() => handleDeleteAssembler(assembler.id)}>Eliminar</button>}
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AssemblerManagementPage;