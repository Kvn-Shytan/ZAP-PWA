import React, { useState, useMemo } from 'react';
import Select from 'react-select';
import { assemblyJobService } from '../services/assemblyJobService';
import Modal from './Modal'; // Import the reusable Modal component
import './AssignAssemblyJobModal.css'; // Import the new CSS file

const AssignAssemblyJobModal = ({ isOpen, onClose, onAssign, onDisassociate, existingAssemblyJobs, currentAssemblyJob }) => {
  const [selected, setSelected] = useState(currentAssemblyJob);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  const assemblyJobOptions = useMemo(() => existingAssemblyJobs, [existingAssemblyJobs]);

  const handleCreate = async () => {
    if (!newItem.name || !newItem.price) {
      setError('Name and price are required to create a new assembly job.');
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const created = await assemblyJobService.create({
        name: newItem.name,
        price: parseFloat(newItem.price),
      });
      // Directly assign the newly created job
      onAssign({
        value: created.id,
        label: `${created.name} ($${Number(created.price).toFixed(2)})`
      });
    } catch (err) {
      setError(err.message || 'Error creating the assembly job.');
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
    <Modal isOpen={isOpen} onClose={resetAndClose} title="Assign Assembly Job">
      {!showCreateForm ? (
        <>
          <div className="assign-assembly-job-input-group">
            <label>Select an existing assembly job</label>
            <Select
              options={assemblyJobOptions}
              value={selected}
              onChange={setSelected}
              placeholder="Search or select an assembly job..."
              isClearable
            />
          </div>
          <div className="assign-assembly-job-actions-container">
            <button className="assign-assembly-job-link-button" onClick={() => setShowCreateForm(true)}>
              + Create New Assembly Job
            </button>
          </div>
          <div className="assign-assembly-job-actions-container" style={{ marginTop: '2rem' }}>
              <button onClick={resetAndClose} className="btn btn-secondary">Cancel</button>
              {currentAssemblyJob && <button onClick={handleDisassociate} className="btn btn-danger">Disassociate</button>}
              <button onClick={handleConfirm} className="btn btn-primary" disabled={!selected}>Confirm Selection</button>
          </div>
        </>
      ) : (
        <>
          <div className="assign-assembly-job-input-group">
            <label>Name of the New Assembly Job</label>
            <input 
              type="text"
              value={newItem.name}
              onChange={(e) => setNewItem(prev => ({...prev, name: e.target.value}))}
              className="assign-assembly-job-input"
              placeholder="Ej: Leather Bag Assembly"
            />
          </div>
          <div className="assign-assembly-job-input-group">
            <label>Unit Price (ARS)</label>
            <input
              type="number"
              value={newItem.price}
              onChange={(e) => setNewItem(prev => ({...prev, price: e.target.value}))}
              className="assign-assembly-job-input"
              min="0"
              step="0.01"
            />
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <div className="assign-assembly-job-actions-container">
              <button onClick={() => setShowCreateForm(false)} className="btn btn-secondary" disabled={isCreating}>Back</button>
              <button onClick={handleCreate} className="btn btn-primary" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create and Assign'}
              </button>
          </div>
        </>
      )}
    </Modal>
  );
};

export default AssignAssemblyJobModal;