import React, { useState, useEffect, useCallback } from 'react';
import { trabajoDeArmadoService } from '../services/trabajoDeArmadoService';

const TrabajoDeArmadoPage = () => {
  const [trabajos, setTrabajos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState({ id: null, nombre: '', precio: '0.00', descripcion: '' });

  const fetchTrabajos = useCallback(async () => {
    setLoading(true);
    try {
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

  const handleEdit = (trabajo) => {
    setIsEditing(true);
    setCurrentItem({ ...trabajo, precio: String(trabajo.precio) });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setCurrentItem({ id: null, nombre: '', precio: '0.00', descripcion: '' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de que desea eliminar este trabajo? No se podrá deshacer.')) {
      try {
        await trabajoDeArmadoService.delete(id);
        fetchTrabajos(); // Refresh list
      } catch (err) {
        alert(`Error al eliminar: ${err.message}`);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dataToSave = {
        ...currentItem,
        precio: parseFloat(currentItem.precio)
    };

    try {
      if (isEditing) {
        await trabajoDeArmadoService.update(currentItem.id, dataToSave);
      } else {
        await trabajoDeArmadoService.create(dataToSave);
      }
      handleCancel(); // Reset form
      fetchTrabajos(); // Refresh list
    } catch (err) {
      alert(`Error al guardar: ${err.message}`);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentItem(prev => ({ ...prev, [name]: value }));
  };

  if (loading) return <p>Cargando trabajos de armado...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Gestión de Trabajos de Armado</h2>

      <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>{isEditing ? 'Editar Trabajo' : 'Crear Nuevo Trabajo'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label>Nombre:</label>
            <input type="text" name="nombre" value={currentItem.nombre} onChange={handleChange} required style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Precio:</label>
            <input type="number" name="precio" value={currentItem.precio} onChange={handleChange} required min="0" step="0.01" style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Descripción (Opcional):</label>
            <input type="text" name="descripcion" value={currentItem.descripcion} onChange={handleChange} style={{ width: '100%' }} />
          </div>
          <button type="submit">{isEditing ? 'Actualizar' : 'Crear'}</button>
          {isEditing && <button type="button" onClick={handleCancel} style={{ marginLeft: '1rem' }}>Cancelar</button>}
        </form>
      </div>

      <h3>Catálogo Actual</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Precio</th>
            <th>Descripción</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {trabajos.map(trabajo => (
            <tr key={trabajo.id}>
              <td>{trabajo.nombre}</td>
              <td>${Number(trabajo.precio).toFixed(2)}</td>
              <td>{trabajo.descripcion}</td>
              <td>
                <button onClick={() => handleEdit(trabajo)}>Editar</button>
                <button onClick={() => handleDelete(trabajo.id)} style={{ marginLeft: '8px' }}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TrabajoDeArmadoPage;
