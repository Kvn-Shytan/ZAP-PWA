import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../services/api';
import CriticalAlertCard from '../components/CriticalAlertCard';
import PrecautionCard from '../components/PrecautionCard';
import { Link } from 'react-router-dom';
import './DashboardPage.css';

const TaskList = ({ title, tasks }) => (
  <div className="dashboard-card">
    <h3 className="dashboard-card-title">{title}</h3>
    {tasks?.length > 0 ? (
      <ul className="dashboard-task-list">
        {tasks.map((task) => (
          <li key={task.id} className="dashboard-task-item">
            <span className="task-text">{task.text}</span>
            {task.link && <Link to={task.link} className="btn btn-outline-primary btn-sm">Resolver</Link>}
          </li>
        ))}
      </ul>
    ) : (
      <p className="dashboard-empty-text">No hay tareas pendientes. ¡Buen trabajo!</p>
    )}
  </div>
);

const KpiDisplay = ({ kpis }) => (
  <div className="dashboard-kpi-grid">
    {kpis && Object.entries(kpis).map(([key, value]) => (
      <div key={key} className="dashboard-kpi-card">
        <div className="kpi-value">{value}</div>
        <div className="kpi-label">{key}</div>
      </div>
    ))}
  </div>
);

const DashboardContent = ({ data, title }) => {
  return (
    <div className="dashboard-content-wrapper">
      {title && <h2 className="dashboard-section-title">{title}</h2>}
      
      {/* --- ZONA ROJA: Alertas Críticas --- */}
      {data?.criticalAlerts?.length > 0 && (
        <div className="dashboard-red-zone">
          {data.criticalAlerts.map(alert => (
            <CriticalAlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}

      {/* --- ZONA KPI --- */}
      {data?.kpis && Object.keys(data.kpis).length > 0 && (
        <KpiDisplay kpis={data.kpis} />
      )}

      {/* --- ZONA CENTRAL: Tareas y Precauciones --- */}
      <div className="dashboard-body-grid">
        <div className="dashboard-main-col">
          <TaskList title="Mis Tareas Activas" tasks={data?.tasks || []} />
        </div>
        
        <div className="dashboard-side-col">
          <div className="dashboard-card precaution-container">
            <h3 className="dashboard-card-title">Precauciones</h3>
            {data?.precautions?.length > 0 ? (
              <div className="precaution-list">
                {data.precautions.map(prec => (
                  <PrecautionCard key={prec.id} precaution={prec} />
                ))}
              </div>
            ) : (
              <div className="empty-precautions">
                <span className="empty-icon">✓</span>
                <p>Todo en orden. No hay advertencias.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch('/dashboard');
        setDashboardData(data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(`Error al cargar el panel: ${err.message || 'Error desconocido'}`);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

  if (loading) return <div className="dashboard-loading">Cargando panel de control inteligente...</div>;
  if (error) return <div className="dashboard-error">{error}</div>;
  if (!dashboardData) return <div className="dashboard-empty">No hay datos disponibles.</div>;

  return (
    <div className="dashboard-page-container">
      <div className="dashboard-header">
        <h1 className="dashboard-greeting">¡Hola, {user?.name || user?.email}!</h1>
        <p className="dashboard-subtitle">Este es tu resumen logístico al día de hoy.</p>
      </div>

      {user?.role === 'EMPLOYEE' && (
        <DashboardContent data={dashboardData} />
      )}

      {user?.role === 'SUPERVISOR' && (
        <DashboardContent data={dashboardData} />
      )}

      {user?.role === 'ADMIN' && (
        <div className="admin-dashboards-wrapper">
          <DashboardContent data={dashboardData.adminData} title="Panel Financiero y Administrativo" />
          
          <div className="supervisor-view-section">
            <DashboardContent data={dashboardData.supervisorData} title="Panel Logístico (Vista Supervisor)" />
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
