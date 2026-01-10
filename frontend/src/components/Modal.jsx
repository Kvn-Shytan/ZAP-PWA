import React from 'react';
import './Modal.css'; // Import the new CSS file

// Simple Modal component for reusability
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-content">
        <h3>{title}</h3>
        {children}
      </div>
    </>
  );
};

export default Modal;
