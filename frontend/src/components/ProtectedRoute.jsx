import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ element, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to. This allows us to send them back to that page after a
    // successful login.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has any of the allowed roles
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Optionally, navigate to an unauthorized page or show a message
    return <p>Acceso denegado. No tienes permisos para ver esta página.</p>;
  }

  return element;
};

export default ProtectedRoute;
