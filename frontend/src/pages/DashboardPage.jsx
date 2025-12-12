import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../services/api';

// Componente auxiliar para renderizar Tareas
const TaskList = ({ title, tasks }) => (
  <div style={{ marginBottom: '1rem', border: '1px solid #eee', padding: '1rem', borderRadius: '4px' }}>
    <h3>{title}</h3>
    {tasks?.length > 0 ? (
      <ul>
        {tasks.map((task, index) => (
          <li key={index}>
            {task.text} {task.link && <a href={task.link}>(Ir)</a>}
          </li>
        ))}
      </ul>
    ) : (
      <p>No hay tareas pendientes.</p>
    )}
  </div>
);

// Componente auxiliar para renderizar Alertas
const AlertList = ({ alerts }) => (
  <div style={{ marginTop: '2rem', border: '1px solid orange', padding: '1rem', borderRadius: '4px' }}>
    <h3>Alertas Importantes</h3>
    {alerts?.length > 0 ? (
      <ul>
        {alerts.map((alert, index) => (
          <li key={index} style={{ color: alert.severity === 'high' ? 'red' : 'orange' }}>
            {alert.message} {alert.link && <a href={alert.link}>(Resolver)</a>}
          </li>
        ))}
      </ul>
    ) : (
      <p>No hay alertas por el momento.</p>
    )}
  </div>
);

// Componente auxiliar para renderizar KPIs (ejemplo muy básico)
const KpiDisplay = ({ kpis }) => (
  <div style={{ marginBottom: '1rem', border: '1px solid #eee', padding: '1rem', borderRadius: '4px' }}>
    <h3>Indicadores Clave</h3>
    {kpis && Object.keys(kpis).length > 0 ? (
      <ul>
        {Object.entries(kpis).map(([key, value]) => (
          <li key={key}><strong>{key}:</strong> {value}</li>
        ))}
      </ul>
    ) : (
      <p>No hay KPIs disponibles.</p>
    )}
  </div>
);


const DashboardPage = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSupervisorView, setShowSupervisorView] = useState(false); // Estado para la vista de supervisor en ADMIN

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
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

  if (loading) {
    return <div style={{ padding: '2rem' }}>Cargando panel de control...</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', color: 'red' }}>{error}</div>;
  }

  if (!dashboardData) {
    return <div style={{ padding: '2rem' }}>No hay datos disponibles para el panel.</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Bienvenido, {user?.name || user?.email}!</h2>

      {user?.role === 'EMPLOYEE' && (
        <>
          <TaskList title="Mis Tareas" tasks={dashboardData.tasks} />
          <AlertList alerts={dashboardData.alerts} /> {/* Las alertas generales si las hay */}
        </>
      )}

      {user?.role === 'SUPERVISOR' && (
        <>
          <KpiDisplay kpis={dashboardData.kpis} />
          <TaskList title="Tareas de Logística" tasks={dashboardData.tasks} />
          <AlertList alerts={dashboardData.alerts} />
        </>
      )}

      {user?.role === 'ADMIN' && (
        <>
          <KpiDisplay kpis={dashboardData.adminData.kpis} />
          <TaskList title="Tareas de Administración" tasks={dashboardData.adminData.tasks} />
          <AlertList alerts={dashboardData.adminData.alerts || dashboardData.alerts} /> {/* ADMIN también ve alertas generales */}

          <div style={{ border: '1px solid #ccc', padding: '1rem', marginTop: '1.5rem', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4>Panel de Supervisor (Vista Integrada)</h4>
              <button
                onClick={() => setShowSupervisorView(!showSupervisorView)}
                style={{ padding: '8px 12px', border: 'none', backgroundColor: '#007bff', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
              >
                {showSupervisorView ? 'Ocultar' : 'Ver'}
              </button>
            </div>
            {showSupervisorView && dashboardData.supervisorData && (
              <div style={{ marginTop: '1rem' }}>
                <KpiDisplay kpis={dashboardData.supervisorData.kpis} />
                <TaskList title="Tareas de Logística (Supervisor)" tasks={dashboardData.supervisorData.tasks} />
                <AlertList alerts={dashboardData.supervisorData.alerts} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;