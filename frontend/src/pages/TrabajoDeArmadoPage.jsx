import React, { useState, useEffect, useCallback } from 'react';
import { trabajoDeArmadoService } from '../services/trabajoDeArmadoService';

const TrabajoDeArmadoPage = () => {
  // Main list state
  const [trabajos, setTrabajos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail pane state
  const [selectedTrabajo, setSelectedTrabajo] = useState(null); // Will now include _count
  const [linkedProducts, setLinkedProducts] = useState([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Form state
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ id: null, nombre: '', precio: '', descripcion: '' });

  const fetchTrabajos = useCallback(async () => {
    setLoading(true);
    try {
      // The backend now returns _count.productos
      const data = await trabajoDeArmadoService.getAll();
      setTrabajos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrabajos();
  }, [fetchTrabajos]);

  useEffect(() => {
    if (selectedTrabajo && selectedTrabajo.id) {
      setIsLoadingDetails(true);
      trabajoDeArmadoService.getLinkedProducts(selectedTrabajo.id)
        .then(setLinkedProducts)
        .catch(err => console.error("Failed to fetch linked products", err))
        .finally(() => setIsLoadingDetails(false));
    } else {
      setLinkedProducts([]);
    }
  }, [selectedTrabajo]);

  const handleSelectTrabajo = (trabajo) => {
    setSelectedTrabajo(trabajo);
    setIsCreating(false);
    setFormData({
      id: trabajo.id,
      nombre: trabajo.nombre || '',
      precio: String(trabajo.precio || ''),
      descripcion: trabajo.descripcion || ''
    });
  };
  
  const handleShowCreateForm = () => {
    setSelectedTrabajo(null);
    setIsCreating(true);
    setFormData({ id: null, nombre: '', precio: '', descripcion: '' });
  };

  const handleCancel = () => {
    setSelectedTrabajo(null);
    setIsCreating(false);
    setFormData({ id: null, nombre: '', precio: '', descripcion: '' });
  };
  
  const handleDelete = async () => {
    if (!formData.id) return;

    // Use the _count information from selectedTrabajo
    const linkedCount = selectedTrabajo?._count?.productos || 0;
    const confirmMessage = linkedCount > 0
      ? `Este trabajo está asignado a ${linkedCount} producto(s). ¿Está SEGURO de que desea eliminarlo? Esto puede causar inconsistencias graves.`
      : `¿Está seguro de que desea eliminar el trabajo "${formData.nombre}"?`;

    if (window.confirm(confirmMessage)) {
      if (linkedCount > 0) {
        alert('Error: No se puede eliminar un trabajo que está asignado a uno o más productos. Desvincule los productos primero.');
        return;
      }
      try {
        await trabajoDeArmadoService.delete(formData.id);
        handleCancel();
        fetchTrabajos();
      } catch (err) {
        alert(`Error al eliminar: ${err.message}`);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      precio: parseInt(formData.precio || '0', 10) // Ensure that empty string becomes 0
    };

    try {
      let updatedTrabajo;
      if (isCreating) {
        updatedTrabajo = await trabajoDeArmadoService.create(dataToSave);
        alert(`Trabajo "${updatedTrabajo.nombre}" creado exitosamente.`);
      } else {
        // Confirmation before update
        const linkedCount = selectedTrabajo?._count?.productos || 0;
        const confirmMessage = linkedCount > 0
          ? `Este trabajo está asignado a ${linkedCount} producto(s). ¿Confirma que desea actualizarlo? El cambio de precio afectará a todos ellos.`
          : `¿Confirma que desea actualizar el trabajo "${formData.nombre}"?`;

        if (!window.confirm(confirmMessage)) {
          return; // User cancelled the update
        }

        updatedTrabajo = await trabajoDeArmadoService.update(formData.id, dataToSave);
        alert(`Trabajo "${updatedTrabajo.nombre}" actualizado exitosamente.`); // Confirmation after update
      }
      
      // After save, refetch all trabajos to get updated list and re-select the item
      const newTrabajosList = await trabajoDeArmadoService.getAll();
      setTrabajos(newTrabajosList);
      
      const newSelectedTrabajo = newTrabajosList.find(t => t.id === updatedTrabajo.id);

      if (newSelectedTrabajo) {
        handleSelectTrabajo(newSelectedTrabajo);
      } else {
        handleCancel(); // Fallback to reset view if not found
      }

    } catch (err) {
      alert(`Error al guardar: ${err.message}`);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading) return <p>Cargando catálogo de trabajos...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div style={pageStyle}>
      <div style={leftColumnStyle}>
        <h2>Catálogo de Trabajos</h2>
        <button onClick={handleShowCreateForm} style={createButtonStyle}>+ Crear Nuevo Trabajo</button>
        <ul style={listStyle}>
          {trabajos.map(trabajo => (
            <li 
              key={trabajo.id} 
              onClick={() => handleSelectTrabajo(trabajo)}
              style={selectedTrabajo?.id === trabajo.id ? {...listItemStyle, ...selectedListItemStyle} : listItemStyle}
            >
              <span style={trabajo._count.productos > 0 ? dotStyleActive : dotStyleOrphan}></span>
              {trabajo.nombre}
            </li>
          ))}
        </ul>
      </div>

      <div style={rightColumnStyle}>
        {!selectedTrabajo && !isCreating ? (
          <div style={placeholderStyle}>Seleccione un trabajo para ver sus detalles o cree uno nuevo.</div>
        ) : (
          <div>
            <h3>{isCreating ? 'Crear Nuevo Trabajo' : `Editar Trabajo: ${formData.nombre}`}</h3>
            <form onSubmit={handleSubmit} style={formStyle}>
              <label>Nombre:</label>
              <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required />
              
              <label>Precio (ARS - sin decimales):</label>
              <input type="number" name="precio" value={formData.precio} onChange={handleChange} required min="0" step="1" />
              
              <label>Descripción (Opcional):</label>
              <textarea name="descripcion" value={formData.descripcion} onChange={handleChange} rows="3"></textarea>

              <div style={formActionsStyle}>
                <button type="submit">{isCreating ? 'Crear' : 'Actualizar'}</button>
                <button type="button" onClick={handleCancel}>Cancelar</button>
                {!isCreating && (
                  <button type="button" onClick={handleDelete} style={deleteButtonStyle}>
                    Eliminar
                  </button>
                )}
              </div>
            </form>
            
            {!isCreating && (
              <div style={linkedProductsStyle}>
                <h4>Productos Vinculados ({linkedProducts.length})</h4>
                {isLoadingDetails ? <p>Cargando...</p> : (
                  <ul>
                    {linkedProducts.length > 0 ? (
                      linkedProducts.map(p => <li key={p.id}>{p.internalCode} - {p.description}</li>)
                    ) : (
                      <li>Este trabajo no está asignado a ningún producto.</li>
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

export default TrabajoDeArmadoPage;