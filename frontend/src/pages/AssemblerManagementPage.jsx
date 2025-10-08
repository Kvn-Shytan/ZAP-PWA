import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext'; // Keep useAuth for user role
import { armadorService } from '../services/armadorService';

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
      <button type="submit">Guardar Cambios</button>
      <button type="button" onClick={onCancel}>Cancelar</button>
    </form>
  );
}

function AssemblerManagementPage() {
  const { user } = useAuth(); // Keep useAuth only for user role
  const [assemblers, setAssemblers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAssembler, setNewAssembler] = useState(INITIAL_FORM_STATE);

  // State for editing
  const [editingAssembler, setEditingAssembler] = useState(null);

  const fetchAssemblers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await armadorService.getArmadores();
      setAssemblers(data);
    } catch (e) {
      setError('Failed to fetch assemblers: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []); // No authFetch dependency needed anymore

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
      await armadorService.create(newAssembler);
      setNewAssembler(INITIAL_FORM_STATE);
      setShowCreateForm(false);
      fetchAssemblers();
    } catch (e) {
      setError('Failed to create assembler: ' + e.message);
    }
  };

  const handleDeleteAssembler = async (assemblerId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este armador?')) return;
    setError(null);
    try {
      await armadorService.delete(assemblerId);
      fetchAssemblers();
    } catch (e) {
      setError('Failed to delete assembler: ' + e.message);
    }
  };

  const handleUpdateAssembler = async (assemblerToUpdate) => {
    setError(null);
    try {
      await armadorService.update(assemblerToUpdate.id, assemblerToUpdate);
      setEditingAssembler(null); // Exit edit mode
      fetchAssemblers();
    } catch (e) {
      setError('Failed to update assembler: ' + e.message);
    }
  };

  if (loading) return <p>Cargando armadores...</p>;
  if (error) return <p className="error-message">Error: {error}</p>;

  const isPrivilegedUser = user && (user.role === 'ADMIN' || user.role === 'SUPERVISOR');
  const paymentTermOptions = ['BI_WEEKLY', 'MONTHLY', 'PER_UNIT'];

  // If editing, show only the edit form
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
      <h2>Gestión de Armadores</h2>
      
      {isPrivilegedUser && (
        <button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancelar' : 'Crear Nuevo Armador'}
        </button>
      )}

      {showCreateForm && isPrivilegedUser && (
        <form onSubmit={handleCreateAssembler} className="create-form">
          <h3>Crear Nuevo Armador</h3>
          <input type="text" name="name" placeholder="Nombre Completo" value={newAssembler.name} onChange={handleNewAssemblerChange} required />
          <input type="text" name="contactInfo" placeholder="Persona de Contacto" value={newAssembler.contactInfo} onChange={handleNewAssemblerChange} />
          <input type="text" name="address" placeholder="Dirección" value={newAssembler.address} onChange={handleNewAssemblerChange} />
          <input type="text" name="phone" placeholder="Teléfono" value={newAssembler.phone} onChange={handleNewAssemblerChange} />
          <input type="email" name="email" placeholder="Email" value={newAssembler.email} onChange={handleNewAssemblerChange} />
          <select name="paymentTerms" value={newAssembler.paymentTerms} onChange={handleNewAssemblerChange}>
            {paymentTermOptions.map(term => <option key={term} value={term}>{term}</option>)}
          </select>
          <button type="submit">Guardar Armador</button>
        </form>
      )}

      <h3>Lista de Armadores</h3>
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
              <td>{assembler.name}</td>
              <td>{assembler.phone || '-'}</td>
              <td>{assembler.address || '-'}</td>
              {isPrivilegedUser && (
                <>
                  <td>{assembler.email || '-'}</td>
                  <td>{assembler.paymentTerms}</td>
                  <td>
                    <button onClick={() => setEditingAssembler(assembler)}>Editar</button>
                    {user.role === 'ADMIN' && <button onClick={() => handleDeleteAssembler(assembler.id)}>Eliminar</button>}
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