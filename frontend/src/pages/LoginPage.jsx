import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ZAPLogo from '../assets/LogoZap - login PWA.png'; // Import the new ZAP logo
import FondoLogin from '../assets/Fondo login PWA.png'; // Import the background image

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Apply styles to the body element
    document.body.style.backgroundImage = `url(${FondoLogin})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.height = '100vh';
    document.body.style.margin = '0';


    // Cleanup function to remove styles when the component unmounts
    return () => {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundRepeat = '';
      document.body.style.height = '';
      document.body.style.margin = '';
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount and cleanup on unmount

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:3001/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to login. Please check your credentials.');
      }

      // On successful login, call the login function from AuthContext
      login(data.user, data.token);

      // Redirect to the home page or dashboard
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Top: Logo only */}
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <img src={ZAPLogo} alt="ZAP Logo" style={{ width: '80%', maxWidth: '450px', height: 'auto' }} />
      </div>

      {/* Spacer Div */}
      <div style={{ flexGrow: 1 }}></div>

      {/* Bottom: Title and Form */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <h2 style={{ color: 'var(--color-neutral-white)', margin: '0 0 var(--spacing-md) 0' }}>Iniciar Sesión</h2>
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-md)',
          padding: 'var(--spacing-xl)',
          borderRadius: '8px',
          backgroundColor: 'var(--color-neutral-gray-dark)',
          width: '100%',
          maxWidth: '380px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            <label htmlFor="email" style={{ color: 'var(--color-neutral-white)' }}>Email:</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                padding: 'var(--spacing-sm)',
                borderRadius: '4px',
                border: '1px solid var(--color-neutral-gray-light)',
                backgroundColor: 'var(--color-neutral-white)',
                color: 'var(--color-neutral-black)'
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            <label htmlFor="password" style={{ color: 'var(--color-neutral-white)' }}>Contraseña:</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                padding: 'var(--spacing-sm)',
                borderRadius: '4px',
                border: '1px solid var(--color-neutral-gray-light)',
                backgroundColor: 'var(--color-neutral-white)',
                color: 'var(--color-neutral-black)'
              }}
            />
          </div>
          {error && <p style={{ color: 'var(--color-error)', marginTop: 'var(--spacing-md)' }}>{error}</p>}
          <button type="submit" style={{
            padding: 'var(--spacing-sm) var(--spacing-md)',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: 'var(--color-primary-cyan)',
            color: 'var(--color-neutral-white)',
            cursor: 'pointer',
            marginTop: 'var(--spacing-md)'
          }}>Login</button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
