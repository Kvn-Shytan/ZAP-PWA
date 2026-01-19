import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // Add/remove body class to prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('nav-open');
    } else {
      document.body.classList.remove('nav-open');
    }
    // Cleanup function
    return () => {
      document.body.classList.remove('nav-open');
    };
  }, [isOpen]);

  // Add shadow on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span>
            <span style={{ color: 'var(--color-primary-cyan)' }}>Z</span>
            <span style={{ color: 'var(--color-primary-magenta)' }}>A</span>
            <span style={{ color: 'var(--color-primary-cyan)' }}>P</span>
          </span>
          <span className="brand-suffix"> - FlowApp -</span>
        </Link>
        <button className="navbar-toggle" onClick={() => setIsOpen(!isOpen)}>
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </button>
        <div className={`navbar-links ${isOpen ? 'active' : ''}`}>
          <ul>
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/products">Inventario</Link></li>

            {/* Produccion Dropdown */}
            {(user.role === 'ADMIN' || user.role === 'SUPERVISOR') && (
              <li className="nav-dropdown">
                <button className="dropdown-toggle">Producción</button>
                <ul className="dropdown-menu">
                  <li><Link to="/purchase-order">Registrar Compra</Link></li>
                  <li><Link to="/production-orders">Orden de Producción Interna</Link></li>
                  <li><Link to="/external-production-orders/new">Orden de Producción Externa</Link></li>
                </ul>
              </li>
            )}

            {(user.role === 'ADMIN' || user.role === 'SUPERVISOR') && (
              <li><Link to="/logistics-dashboard">Logística</Link></li>
            )}
            
            {/* Armado Dropdown */}
            {(user.role === 'ADMIN' || user.role === 'SUPERVISOR') && (
              <li className="nav-dropdown">
                <button className="dropdown-toggle">Armado</button>
                <ul className="dropdown-menu">
                  <li><Link to="/assemblers">Gestión de Armadores</Link></li>
                  <li><Link to="/assembler-payment-batch">Liquidación de Pagos</Link></li>
                  <li><Link to="/assembler-payments-history">Historial de Pagos</Link></li>
                  {user.role === 'ADMIN' && <li><Link to="/admin-tools/assembly-jobs">Assembly Jobs</Link></li>}
                </ul>
              </li>
            )}
            
            {(user.role === 'ADMIN' || user.role === 'SUPERVISOR') && (
              <li><Link to="/inventory-history">Historial</Link></li>
            )}

            {/* Admin Dropdown */}
            {user.role === 'ADMIN' && (
              <li className="nav-dropdown">
                <button className="dropdown-toggle">Administración</button>
                <ul className="dropdown-menu">
                  <li><Link to="/users">Gestión de Usuarios</Link></li>
                  <li><Link to="/admin-tools">Otras Herramientas</Link></li>
                </ul>
              </li>
            )}

            <li className="nav-dropdown user-menu">
               <button className="dropdown-toggle user-name">Cuenta</button>
               <ul className="dropdown-menu">
                <li><Link to="/change-password">Cambiar Contraseña</Link></li>
                <li><button onClick={handleLogout} className="logout-button">Cerrar Sesión</button></li>
               </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
