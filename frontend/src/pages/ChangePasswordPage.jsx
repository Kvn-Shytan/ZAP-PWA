import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function ChangePasswordPage() {
  const { authFetch } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (newPassword !== confirmNewPassword) {
      setError('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    try {
      const data = await authFetch('/users/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
      });

      setMessage(data.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');

    } catch (e) {
      setError(e.message);
      console.error('Error changing password:', e);
    }
  };

  return (
    <div className="change-password-page">
      <h2>Cambiar Contraseña</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="currentPassword">Contraseña Actual:</label>
          <input
            type="password"
            id="currentPassword"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="newPassword">Nueva Contraseña:</label>
          <input
            type="password"
            id="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmNewPassword">Confirmar Nueva Contraseña:</label>
          <input
            type="password"
            id="confirmNewPassword"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Cambiar Contraseña</button>
      </form>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default ChangePasswordPage;
