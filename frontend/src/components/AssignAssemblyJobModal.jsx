import React, { useState, useMemo } from 'react';
import Select from 'react-select';
import { assemblyJobService } from '../services/assemblyJobService';
import Modal from './Modal';
import './AssignAssemblyJobModal.css';

const AssignAssemblyJobModal = ({ isOpen, onClose, onAssign, onDisassociate, existingAssemblyJobs, currentAssemblyJob }) => {
  const [selected, setSelected] = useState(currentAssemblyJob);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  const assemblyJobOptions = useMemo(() => existingAssemblyJobs, [existingAssemblyJobs]);

  const handleCreate = async () => {
    if (!newItem.name || !newItem.price) {
      setError('El nombre y el precio son obligatorios.');
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const created = await assemblyJobService.create({
        name: newItem.name,
        price: parseFloat(newItem.price),
      });
      const newOption = {
        value: created.id,
        label: `${created.name} ($${Number(created.price).toFixed(2)})`
      };
      onAssign(newOption);
    } catch (err) {
      setError(err.message || 'Error al crear el trabajo de ensamblaje.');
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
    setSelected(currentAssemblyJob);
    setShowCreateForm(false);
    setNewItem({ name: '', price: '' });
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="Asignar Trabajo de Ensamblaje">
      {!showCreateForm ? (
        <>
          <div className="form-group">
            <label>Seleccionar un trabajo existente</label>
            <Select
              options={assemblyJobOptions}
              value={selected}
              onChange={setSelected}
              placeholder="Busque o seleccione un trabajo..."
              isClearable
            />
          </div>
          <div className="assign-assembly-job-actions-container">
            <button className="assign-assembly-job-link-button" onClick={() => setShowCreateForm(true)}>
              + Crear Nuevo Trabajo
            </button>
          </div>
          <div className="assign-assembly-job-actions-container" style={{ marginTop: '2rem' }}>
              <button onClick={resetAndClose} className="btn btn-secondary">Cancelar</button>
              {currentAssemblyJob && <button onClick={handleDisassociate} className="btn btn-danger">Desvincular</button>}
              <button onClick={handleConfirm} className="btn btn-primary" disabled={!selected}>Confirmar Selección</button>
          </div>
        </>
      ) : (
        <>
          <div className="form-group">
            <label>Nombre del Nuevo Trabajo</label>
            <input 
              type="text"
              value={newItem.name}
              onChange={(e) => setNewItem(prev => ({...prev, name: e.target.value}))}
              className="form-input"
              placeholder="Ej: Armado Cartera Cuero"
            />
          </div>
          <div className="form-group">
            <label>Precio Unitario (ARS)</label>
            <input
              type="number"
              value={newItem.price}
              onChange={(e) => setNewItem(prev => ({...prev, price: e.target.value}))}
              className="form-input"
              min="0"
              step="0.01"
            />
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <div className="assign-assembly-job-actions-container">
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

export default AssignAssemblyJobModal;