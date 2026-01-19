import React from 'react';
import { Link } from 'react-router-dom';
import './AdminToolsPage.css'; // Import the new CSS file

const AdminToolsPage = () => {
  return (
    <div className="admin-tools-page">
      <h1>Panel de Herramientas de Administración</h1>
      <p>Este es el centro de control para las utilidades de mantenimiento y configuración del sistema.</p>

      <div className="tools-grid">
        <Link to="/admin-tools/classify-products" className="tool-card">
          <h2>Clasificar Productos</h2>
          <p>Asigna tipos (Materia Prima, Pre-ensamblado, Terminado) a productos no clasificados.</p>
        </Link>
        <Link to="/admin-tools/overhead-costs" className="tool-card">
          <h2>Gestionar Costos Indirectos</h2>
          <p>Define y gestiona costos no materiales, como horas de máquina o servicios.</p>
        </Link>
        <Link to="/admin-tools/assembly-jobs" className="tool-card">
          <h2>Gestionar Trabajos de Ensamblaje</h2>
          <p>Define y gestiona los tipos de trabajos de ensamblaje y sus precios.</p>
        </Link>
        {/* Próximamente: aquí irán más tarjetas o enlaces a las herramientas */}
      </div>
    </div>
  );
};

export default AdminToolsPage;