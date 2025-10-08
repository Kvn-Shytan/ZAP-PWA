import React from 'react';
import { Link } from 'react-router-dom';

const AdminToolsPage = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Panel de Herramientas de Administración</h1>
      <p>Este es el centro de control para las utilidades de mantenimiento y configuración del sistema.</p>

      <div style={toolsGridStyle}>
        <Link to="/admin-tools/classify-products" style={toolCardStyle}>
          <h2>Clasificar Productos</h2>
          <p>Asigna tipos (Materia Prima, Pre-ensamblado, Terminado) a productos no clasificados.</p>
        </Link>
        <Link to="/admin-tools/overhead-costs" style={toolCardStyle}>
          <h2>Gestionar Costos Indirectos</h2>
          <p>Define y gestiona costos no materiales, como horas de máquina o servicios.</p>
        </Link>
        <Link to="/admin-tools/assembly-work" style={toolCardStyle}>
          <h2>Gestionar Trabajos de Armado</h2>
          <p>Define y gestiona los tipos de trabajo de armado y sus precios.</p>
        </Link>
        {/* Próximamente: aquí irán más tarjetas o enlaces a las herramientas */}
      </div>
    </div>
  );
};

const toolsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '20px',
  marginTop: '2rem',
};

const toolCardStyle = {
  display: 'block',
  padding: '20px',
  border: '1px solid #ddd',
  borderRadius: '8px',
  textDecoration: 'none',
  color: '#333',
  backgroundColor: '#f9f9f9',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  transition: 'transform 0.2s ease-in-out',
};

export default AdminToolsPage;
