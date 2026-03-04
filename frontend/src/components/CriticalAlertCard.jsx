import React from 'react';
import { Link } from 'react-router-dom';
import './CriticalAlertCard.css';

const CriticalAlertCard = ({ alert }) => {
  return (
    <div className="critical-alert-card">
      <div className="critical-alert-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="icon-svg">
          <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="critical-alert-content">
        <h4 className="critical-alert-title">ACCIÓN REQUERIDA</h4>
        <p className="critical-alert-message">{alert.message}</p>
        {alert.link && (
          <Link to={alert.link} className="critical-alert-link">Resolver problema →</Link>
        )}
      </div>
    </div>
  );
};

export default CriticalAlertCard;
