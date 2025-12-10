import React, { useState, useMemo } from 'react';
import Select from 'react-select';
import { trabajoDeArmadoService } from '../services/trabajoDeArmadoService';

const AssignTrabajoModal = ({ isOpen, onClose, onAssign, onDisassociate, existingTrabajos, currentTrabajo }) => {
  const [selected, setSelected] = useState(currentTrabajo);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newItem, setNewItem] = useState({ nombre: '', precio: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  const trabajoOptions = useMemo(() => existingTrabajos, [existingTrabajos]);

  if (!isOpen) {
    return null;
  }

  const handleCreate = async () => {
    if (!newItem.nombre || !newItem.precio) {
      setError('Nombre y precio son obligatorios para crear un nuevo trabajo.');
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const created = await trabajoDeArmadoService.create({
        nombre: newItem.nombre,
        precio: parseFloat(newItem.precio),
      });
      // Directly assign the newly created job
      onAssign({
        value: created.id,
        label: `${created.nombre} ($${Number(created.precio).toFixed(2)})`
      });
    } catch (err) {
      setError(err.message || 'Error al crear el trabajo.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirm = () => {
    if (selected) {
      onAssign(selected);
    }
  };
  
  const handleDisassociate = () => {
    onDisassociate();
  };

  const resetAndClose = () => {
    setSelected(currentTrabajo);
    setShowCreateForm(false);
    setNewItem({ nombre: '', precio: '' });
    setError(null);
    onClose();
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <h3>Asignar Trabajo de Armado</h3>
        
        {!showCreateForm ? (
          <>
            <div style={inputGroupStyle}>
              <label>Seleccionar un trabajo existente</label>
              <Select
                options={trabajoOptions}
                value={selected}
                onChange={setSelected}
                placeholder="Busque o seleccione un trabajo..."
                isClearable
              />
            </div>
            <div style={actionsContainerStyle}>
              <button style={linkButtonStyle} onClick={() => setShowCreateForm(true)}>
                + Crear Nuevo Trabajo
              </button>
            </div>
            <div style={{...actionsContainerStyle, marginTop: '2rem'}}>
                <button onClick={resetAndClose} style={cancelButtonStyle}>Cancelar</button>
                {currentTrabajo && <button onClick={handleDisassociate} style={disassociateButtonStyle}>Desvincular</button>}
                <button onClick={handleConfirm} style={buttonStyle} disabled={!selected}>Confirmar Selección</button>
            </div>
          </>
        ) : (
          <>
            <div style={inputGroupStyle}>
              <label>Nombre del Nuevo Trabajo</label>
              <input 
                type="text"
                value={newItem.nombre}
                onChange={(e) => setNewItem(prev => ({...prev, nombre: e.target.value}))}
                style={inputStyle}
                placeholder="Ej: Armado Cartera Cuero"
              />
            </div>
            <div style={inputGroupStyle}>
              <label>Precio Unitario (ARS)</label>
              <input
                type="number"
                value={newItem.precio}
                onChange={(e) => setNewItem(prev => ({...prev, precio: e.target.value}))}
                style={inputStyle}
                min="0"
                step="0.01"
              />
            </div>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <div style={actionsContainerStyle}>
                <button onClick={() => setShowCreateForm(false)} style={cancelButtonStyle} disabled={isCreating}>Volver</button>
                <button onClick={handleCreate} style={buttonStyle} disabled={isCreating}>
                    {isCreating ? 'Creando...' : 'Crear y Asignar'}
                </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Styles
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { background: 'white', padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '500px', boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)' };
const inputGroupStyle = { display: 'flex', flexDirection: 'column', marginBottom: '1rem' };
const inputStyle = { padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' };
const actionsContainerStyle = { marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' };
const buttonStyle = { padding: '10px 20px', border: 'none', backgroundColor: '#007bff', color: 'white', borderRadius: '4px', cursor: 'pointer' };
const cancelButtonStyle = { ...buttonStyle, backgroundColor: '#6c757d' };
const linkButtonStyle = { background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', padding: 0 };
const disassociateButtonStyle = { ...buttonStyle, backgroundColor: '#dc3545' };

export default AssignTrabajoModal;
