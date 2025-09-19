import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

function UserManagementPage() {
  const { user, token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', name: '', password: '', role: '' });
  const [editingUser, setEditingUser] = useState(null); // User being edited

  const API_BASE_URL = 'http://localhost:3001'; // Assuming backend runs on 3001

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setUsers(data);
    } catch (e) {
      setError('Failed to fetch users: ' + e.message);
      console.error('Error fetching users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user && (user.role === 'ADMIN' || user.role === 'SUPERVISOR')) {
      fetchUsers();
    }
  }, [token, user]);

  const handleNewUserChange = (e) => {
    setNewUser({ ...newUser, [e.target.name]: e.target.value });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
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
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
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
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
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
      const response = await fetch(`${API_BASE_URL}/users/${userId}/reset-password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      alert(`La nueva contraseña para el usuario ${userId} es: ${result.newPassword}. Por favor, comunícasela al usuario.`);
      fetchUsers(); // Refresh list (optional, as password change doesn't affect displayed data)
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

  const roles = ['ADMIN', 'SUPERVISOR', 'EMPLOYEE', 'NO_ROLE']; // Available roles

  return (
    <div className="user-management-page">
      <h2>Gestión de Usuarios</h2>

      {user.role === 'ADMIN' && (
        <button onClick={() => setShowCreateForm(!showCreateForm)}>
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
            <option value={undefined}>Seleccionar Rol (por defecto NO_ROLE)</option>
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button type="submit">Crear Usuario</button>
        </form>
      )}

      <h3>Lista de Usuarios</h3>
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
              <td>{u.id}</td>
              <td>{u.email}</td>
              <td>{u.name || '-'}</td>
              <td>
                {user.role === 'ADMIN' ? (
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  >
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : (
                  u.role
                )}
              </td>
              <td>{new Date(u.createdAt).toLocaleDateString()}</td>
              <td>{new Date(u.updatedAt).toLocaleDateString()}</td>
              {user.role === 'ADMIN' && (
                <td>
                  <button onClick={() => handleResetPassword(u.id)}>Resetear Contraseña</button>
                  <button onClick={() => handleDeleteUser(u.id)}>Eliminar</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UserManagementPage;
