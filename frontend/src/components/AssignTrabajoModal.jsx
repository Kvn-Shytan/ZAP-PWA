import React, { useState, useMemo } from 'react';
import Select from 'react-select';
import { trabajoDeArmadoService } from '../services/trabajoDeArmadoService';
import Modal from './Modal'; // Import the reusable Modal component
import './AssignTrabajoModal.css'; // Import the new CSS file

const AssignTrabajoModal = ({ isOpen, onClose, onAssign, onDisassociate, existingTrabajos, currentTrabajo }) => {
  const [selected, setSelected] = useState(currentTrabajo);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newItem, setNewItem] = useState({ nombre: '', precio: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  const trabajoOptions = useMemo(() => existingTrabajos, [existingTrabajos]);

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
    <Modal isOpen={isOpen} onClose={resetAndClose} title="Asignar Trabajo de Armado">
      {!showCreateForm ? (
        <>
          <div className="assign-trabajo-input-group">
            <label>Seleccionar un trabajo existente</label>
            <Select
              options={trabajoOptions}
              value={selected}
              onChange={setSelected}
              placeholder="Busque o seleccione un trabajo..."
              isClearable
            />
          </div>
          <div className="assign-trabajo-actions-container">
            <button className="assign-trabajo-link-button" onClick={() => setShowCreateForm(true)}>
              + Crear Nuevo Trabajo
            </button>
          </div>
          <div className="assign-trabajo-actions-container" style={{ marginTop: '2rem' }}>
              <button onClick={resetAndClose} className="btn btn-secondary">Cancelar</button>
              {currentTrabajo && <button onClick={handleDisassociate} className="btn btn-danger">Desvincular</button>}
              <button onClick={handleConfirm} className="btn btn-primary" disabled={!selected}>Confirmar Selección</button>
          </div>
        </>
      ) : (
        <>
          <div className="assign-trabajo-input-group">
            <label>Nombre del Nuevo Trabajo</label>
            <input 
              type="text"
              value={newItem.nombre}
              onChange={(e) => setNewItem(prev => ({...prev, nombre: e.target.value}))}
              className="assign-trabajo-input"
              placeholder="Ej: Armado Cartera Cuero"
            />
          </div>
          <div className="assign-trabajo-input-group">
            <label>Precio Unitario (ARS)</label>
            <input
              type="number"
              value={newItem.precio}
              onChange={(e) => setNewItem(prev => ({...prev, precio: e.target.value}))}
              className="assign-trabajo-input"
              min="0"
              step="0.01"
            />
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <div className="assign-trabajo-actions-container">
              <button onClick={() => setShowCreateForm(false)} className="btn btn-secondary" disabled={isCreating}>Volver</button>
              <button onClick={handleCreate} className="btn btn-primary" disabled={isCreating}>
                  {isCreating ? 'Creando...' : 'Crear y Asignar'}
              </button>
          </div>
        </>
      )}
    </Modal>
  );
};

export default AssignTrabajoModal;

