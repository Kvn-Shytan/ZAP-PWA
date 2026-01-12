import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../services/api';
import './UserManagementPage.css';

function UserManagementPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', name: '', password: '', role: '' });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/users');
      setUsers(data);
    } catch (e) {
      setError('Failed to fetch users: ' + e.message);
      console.error('Error fetching users:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'SUPERVISOR')) {
      fetchUsers();
    }
  }, [user, fetchUsers]);

  const handleNewUserChange = (e) => {
    setNewUser({ ...newUser, [e.target.name]: e.target.value });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });
      setNewUser({ email: '', name: '', password: '', role: '' });
      setShowCreateForm(false);
      fetchUsers(); // Refresh list
    } catch (e) {
      setError('Failed to create user: ' + e.message);
      console.error('Error creating user:', e);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setError(null);
    try {
      await apiFetch(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });
      fetchUsers(); // Refresh list
    } catch (e) {
      setError('Failed to update role: ' + e.message);
      console.error('Error updating role:', e);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      return;
    }
    setError(null);
    try {
      await apiFetch(`/users/${userId}`, { method: 'DELETE' });
      fetchUsers(); // Refresh list
    } catch (e) {
      setError('Failed to delete user: ' + e.message);
      console.error('Error deleting user:', e);
    }
  };

  const handleResetPassword = async (userId) => {
    if (!window.confirm('¿Estás seguro de que quieres reiniciar la contraseña de este usuario? Se generará una nueva contraseña por defecto.')) {
      return;
    }
    setError(null);
    try {
      const result = await apiFetch(`/users/${userId}/reset-password`, {
        method: 'PUT',
      });
      alert(`La nueva contraseña para el usuario es: ${result.newPassword}. Por favor, comunícasela al usuario.`);
      fetchUsers(); // Refresh list (optional)
    } catch (e) {
      setError('Failed to reset password: ' + e.message);
      console.error('Error resetting password:', e);
    }
  };

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERVISOR')) {
    return <p>Acceso denegado. No tienes permisos para ver esta página.</p>;
  }

  if (loading) {
    return <p>Cargando usuarios...</p>;
  }

  if (error) {
    return <p className="error-message">Error: {error}</p>;
  }

  const roles = ['ADMIN', 'SUPERVISOR', 'EMPLOYEE', 'NO_ROLE'];

  return (
    <div className="user-management-page">
      <h2>Gestión de Usuarios</h2>

      {user.role === 'ADMIN' && (
        <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn btn-primary">
          {showCreateForm ? 'Cancelar' : 'Crear Nuevo Usuario'}
        </button>
      )}

      {showCreateForm && user.role === 'ADMIN' && (
        <form onSubmit={handleCreateUser} className="create-user-form">
          <h3>Crear Nuevo Usuario</h3>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={newUser.email}
            onChange={handleNewUserChange}
            required
          />
          <input
            type="text"
            name="name"
            placeholder="Nombre (opcional)"
            value={newUser.name}
            onChange={handleNewUserChange}
          />
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            value={newUser.password}
            onChange={handleNewUserChange}
            required
          />
          <select name="role" value={newUser.role} onChange={handleNewUserChange}>
            <option value="">Seleccionar Rol (por defecto NO_ROLE)</option>
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button type="submit" className="btn btn-success">Crear Usuario</button>
        </form>
      )}

      <h3 style={{ marginTop: '30px' }}>Lista de Usuarios</h3>
      <div className="table-responsive">
        <table className="user-list-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Creado</th>
              <th>Actualizado</th>
              {user.role === 'ADMIN' && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td data-label="ID"><span>{u.id}</span></td>
                <td data-label="Email"><span>{u.email}</span></td>
                <td data-label="Nombre"><span>{u.name || '-'}</span></td>
                <td data-label="Rol">
                  {user.role === 'ADMIN' ? (
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    >
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <span>{u.role}</span>
                  )}
                </td>
                <td data-label="Creado"><span>{new Date(u.createdAt).toLocaleDateString()}</span></td>
                <td data-label="Actualizado"><span>{new Date(u.updatedAt).toLocaleDateString()}</span></td>
                {user.role === 'ADMIN' && (
                  <td data-label="Acciones">
                    <div>
                      <button className="btn btn-secondary" onClick={() => handleResetPassword(u.id)}>Resetear Contraseña</button>
                      <button className="btn btn-danger" onClick={() => handleDeleteUser(u.id)}>Eliminar</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UserManagementPage;
