import React, { useState, useEffect, useCallback } from 'react';
import { assemblyJobService } from '../services/assemblyJobService';


const AssemblyJobPage = () => {
  // Main list state
  const [assemblyJobs, setAssemblyJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail pane state
  const [selectedAssemblyJob, setSelectedAssemblyJob] = useState(null); // Will now include _count
  const [linkedProducts, setLinkedProducts] = useState([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Form state
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: '', price: '', description: '' });

  const fetchAssemblyJobs = useCallback(async () => {
    setLoading(true);
    try {
      // The backend now returns _count.products
      const data = await assemblyJobService.getAll();
      setAssemblyJobs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssemblyJobs();
  }, [fetchAssemblyJobs]);

  useEffect(() => {
    if (selectedAssemblyJob && selectedAssemblyJob.id) {
      setIsLoadingDetails(true);
      assemblyJobService.getLinkedProducts(selectedAssemblyJob.id)
        .then(setLinkedProducts)
        .catch(err => console.error("Failed to fetch linked products", err))
        .finally(() => setIsLoadingDetails(false));
    } else {
      setLinkedProducts([]);
    }
  }, [selectedAssemblyJob]);

  const handleSelectAssemblyJob = (assemblyJob) => {
    setSelectedAssemblyJob(assemblyJob);
    setIsCreating(false);
    setFormData({
      id: assemblyJob.id,
      name: assemblyJob.name || '',
      price: String(assemblyJob.price || ''),
      description: assemblyJob.description || ''
    });
  };
  
  const handleShowCreateForm = () => {
    setSelectedAssemblyJob(null);
    setIsCreating(true);
    setFormData({ id: null, name: '', price: '', description: '' });
  };

  const handleCancel = () => {
    setSelectedAssemblyJob(null);
    setIsCreating(false);
    setFormData({ id: null, name: '', price: '', description: '' });
  };
  
  const handleDelete = async () => {
    if (!formData.id) return;

    // Use the _count information from selectedAssemblyJob
    const linkedCount = selectedAssemblyJob?._count?.products || 0;
    const confirmMessage = linkedCount > 0
      ? `This assembly job is assigned to ${linkedCount} product(s). Are you SURE you want to delete it? This can cause serious inconsistencies.`
      : `Are you sure you want to delete the assembly job "${formData.name}"?`;

    if (window.confirm(confirmMessage)) {
      if (linkedCount > 0) {
        alert('Error: Cannot delete an assembly job that is assigned to one or more products. Unlink the products first.');
        return;
      }
      try {
        await assemblyJobService.delete(formData.id);
        handleCancel();
        fetchAssemblyJobs();
      } catch (err) {
        alert(`Error deleting: ${err.message}`);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      price: parseFloat(formData.price || '0') // Ensure that empty string becomes 0
    };

    try {
      let updatedAssemblyJob;
      if (isCreating) {
        updatedAssemblyJob = await assemblyJobService.create(dataToSave);
        alert(`Assembly job "${updatedAssemblyJob.name}" created successfully.`);
      } else {
        // Confirmation before update
        const linkedCount = selectedAssemblyJob?._count?.products || 0;
        const confirmMessage = linkedCount > 0
          ? `This assembly job is assigned to ${linkedCount} product(s). Do you confirm that you want to update it? The price change will affect all of them.`
          : `Do you confirm that you want to update the assembly job "${formData.name}"?`;

        if (!window.confirm(confirmMessage)) {
          return; // User cancelled the update
        }

        updatedAssemblyJob = await assemblyJobService.update(formData.id, dataToSave);
        alert(`Assembly job "${updatedAssemblyJob.name}" updated successfully.`); // Confirmation after update
      }
      
      // After save, refetch all assembly jobs to get updated list and re-select the item
      const newAssemblyJobsList = await assemblyJobService.getAll();
      setAssemblyJobs(newAssemblyJobsList);
      
      const newSelectedAssemblyJob = newAssemblyJobsList.find(t => t.id === updatedAssemblyJob.id);

      if (newSelectedAssemblyJob) {
        handleSelectAssemblyJob(newSelectedAssemblyJob);
      } else {
        handleCancel(); // Fallback to reset view if not found
      }

    } catch (err) {
      alert(`Error saving: ${err.message}`);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading) return <p>Loading assembly jobs catalog...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div style={pageStyle}>
      <div style={leftColumnStyle}>
        <h2>Assembly Jobs Catalog</h2>
        <button onClick={handleShowCreateForm} style={createButtonStyle}>+ Create New Assembly Job</button>
        <ul style={listStyle}>
          {assemblyJobs.map(assemblyJob => (
            <li 
              key={assemblyJob.id} 
              onClick={() => handleSelectAssemblyJob(assemblyJob)}
              style={selectedAssemblyJob?.id === assemblyJob.id ? {...listItemStyle, ...selectedListItemStyle} : listItemStyle}
            >
              <span style={assemblyJob._count.products > 0 ? dotStyleActive : dotStyleOrphan}></span>
              {assemblyJob.name}
            </li>
          ))}
        </ul>
      </div>

      <div style={rightColumnStyle}>
        {!selectedAssemblyJob && !isCreating ? (
          <div style={placeholderStyle}>Select an assembly job to see its details or create a new one.</div>
        ) : (
          <div>
            <h3>{isCreating ? 'Create New Assembly Job' : `Edit Assembly Job: ${formData.name}`}</h3>
            <form onSubmit={handleSubmit} style={formStyle}>
              <label>Name:</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required />
              
              <label>Price (ARS - no decimals):</label>
              <input type="number" name="price" value={formData.price} onChange={handleChange} required min="0" step="1" />
              
              <label>Description (Optional):</label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows="3"></textarea>

              <div style={formActionsStyle}>
                <button type="submit">{isCreating ? 'Create' : 'Update'}</button>
                <button type="button" onClick={handleCancel}>Cancel</button>
                {!isCreating && (
                  <button type="button" onClick={handleDelete} style={deleteButtonStyle}>
                    Delete
                  </button>
                )}
              </div>
            </form>
            
            {!isCreating && (
              <div style={linkedProductsStyle}>
                <h4>Linked Products ({linkedProducts.length})</h4>
                {isLoadingDetails ? <p>Loading...</p> : (
                  <ul>
                    {linkedProducts.length > 0 ? (
                      linkedProducts.map(p => <li key={p.id}>{p.internalCode} - {p.description}</li>)
                    ) : (
                      <li>This assembly job is not assigned to any product.</li>
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Styles
const pageStyle = { display: 'flex', height: 'calc(100vh - 120px)', gap: '2rem', padding: '2rem' };
const leftColumnStyle = { flex: '1', border: '1px solid #ccc', borderRadius: '8px', padding: '1rem', overflowY: 'auto' };
const rightColumnStyle = { flex: '2', border: '1px solid #ccc', borderRadius: '8px', padding: '2rem' };
const createButtonStyle = { width: '100%', padding: '10px', marginBottom: '1rem' };
const listStyle = { listStyleType: 'none', padding: 0, margin: 0 };
const listItemStyle = { 
  padding: '10px', 
  borderBottom: '1px solid #eee', 
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center', // Align dot and text vertically
};
const selectedListItemStyle = { backgroundColor: '#e0e0e0' };
const placeholderStyle = { textAlign: 'center', color: '#888', marginTop: '4rem' };
const formStyle = { display: 'flex', flexDirection: 'column', gap: '0.5rem' };
const formActionsStyle = { display: 'flex', gap: '1rem', marginTop: '1rem' };
const deleteButtonStyle = { backgroundColor: '#dc3545', color: 'white' };
const linkedProductsStyle = { marginTop: '2rem', borderTop: '1px solid #ccc', paddingTop: '1rem' };

const dotStyle = {
  display: 'inline-block',
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  marginRight: '8px',
};

const dotStyleActive = { ...dotStyle, backgroundColor: '#28a745' }; // Green
const dotStyleOrphan = { ...dotStyle, backgroundColor: '#6c757d' }; // Gray

export default AssemblyJobPage;
