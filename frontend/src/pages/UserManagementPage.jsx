import React from 'react';
import { useAuth } from '../contexts/AuthContext';

function UserManagementPage() {
  const { user } = useAuth();

  return (
    <div>
      <h2>Gestión de Usuarios</h2>
      {user && user.role === 'ADMIN' ? (
        <p>Aquí el administrador puede crear, editar y eliminar usuarios.</p>
      ) : (
        <p>Aquí el supervisor puede ver la lista de usuarios.</p>
      )}
      {/* Placeholder for user list */}
      <h3>Lista de Usuarios (Placeholder)</h3>
      <ul>
        <li>Usuario 1 (ADMIN)</li>
        <li>Usuario 2 (SUPERVISOR)</li>
        <li>Usuario 3 (EMPLOYEE)</li>
      </ul>
    </div>
  );
}

export default UserManagementPage;
