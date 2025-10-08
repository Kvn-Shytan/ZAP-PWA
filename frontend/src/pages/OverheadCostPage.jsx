import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../services/api';

const OverheadCostPage = () => {
  const [costs, setCosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingCost, setEditingCost] = useState(null); // State to hold the cost being edited

  const fetchCosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/overhead-costs');
      if (!response.ok) {
        throw new Error('Error al obtener los costos indirectos.');
      }
      const data = await response.json();
      setCosts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  const handleEdit = (cost) => {
    setEditingCost({ ...cost }); // Create a copy to avoid direct state mutation
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de que desea eliminar este costo?')) {
      try {
        const response = await apiFetch(`/overhead-costs/${id}`, { method: 'DELETE' });
        if (!response.ok) {
          throw new Error('Error al eliminar el costo.');
        }
        fetchCosts(); // Refresh list
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const isEditing = !!editingCost.id;
    const url = isEditing ? `/overhead-costs/${editingCost.id}` : '/overhead-costs';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCost),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar el costo.');
      }

      setEditingCost(null); // Close form
      fetchCosts(); // Refresh list
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setEditingCost(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Gestionar Costos Indirectos</h1>
      <p>Define y gestiona costos no materiales, como horas de máquina o servicios.</p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Form for adding/editing */}
      {editingCost ? (
        <form onSubmit={handleFormSubmit} style={formStyle}>
          <h2>{editingCost.id ? 'Editar' : 'Nuevo'} Costo</h2>
          <input
            type="text"
            name="name"
            placeholder="Nombre (ej: HORA-MAQUINA-LASER)"
            value={editingCost.name || ''}
            onChange={handleFormChange}
            required
          />
          <input
            type="text"
            name="description"
            placeholder="Descripción (opcional)"
            value={editingCost.description || ''}
            onChange={handleFormChange}
          />
          <input
            type="number"
            name="cost"
            placeholder="Costo por unidad"
            value={editingCost.cost || ''}
            onChange={handleFormChange}
            required
            step="0.01"
          />
          <input
            type="text"
            name="unit"
            placeholder="Unidad (ej: HORA, UNIDAD)"
            value={editingCost.unit || ''}
            onChange={handleFormChange}
            required
          />
          <select name="type" value={editingCost.type || 'OTHER'} onChange={handleFormChange}>
            <option value="MACHINE_HOUR">Hora de Máquina</option>
            <option value="SERVICE">Servicio</option>
            <option value="DESIGN">Diseño</option>
            <option value="OTHER">Otro</option>
          </select>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit">Guardar</button>
            <button type="button" onClick={() => setEditingCost(null)}>Cancelar</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setEditingCost({})}>Añadir Nuevo Costo</button>
      )}

      {/* Table of costs */}
      {isLoading ? (
        <p>Cargando...</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Costo</th>
              <th>Unidad</th>
              <th>Tipo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {costs.map(cost => (
              <tr key={cost.id}>
                <td>{cost.name}</td>
                <td>{cost.description}</td>
                <td>{cost.cost}</td>
                <td>{cost.unit}</td>
                <td>{cost.type}</td>
                <td>
                  <button onClick={() => handleEdit(cost)}>Editar</button>
                  <button onClick={() => handleDelete(cost.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// Basic styles
const tableStyle = {
  width: '100%',
  marginTop: '2rem',
  borderCollapse: 'collapse',
};

const formStyle = {
  margin: '2rem 0',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  maxWidth: '400px',
  padding: '1rem',
  border: '1px solid #ccc',
  borderRadius: '8px',
};

export default OverheadCostPage;