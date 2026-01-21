import React, { useState } from 'react';

const INITIAL_FORM_STATE = {
  name: '',
  contactInfo: '',
  address: '',
  phone: '',
  email: '',
  paymentTerms: 'BI_WEEKLY',
};

function EditForm({ assembler, onSave, onCancel }) {
  const [editedAssembler, setEditedAssembler] = useState(assembler);

  const handleChange = (e) => {
    setEditedAssembler({ ...editedAssembler, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(editedAssembler);
  };

  const paymentTermOptions = ['BI_WEEKLY', 'MONTHLY', 'PER_UNIT'];

  return (
    <form onSubmit={handleSubmit} className="edit-form">
      <h3>Editando a {assembler.name}</h3>
      <input type="text" name="name" placeholder="Nombre Completo" value={editedAssembler.name} onChange={handleChange} required />
      <input type="text" name="contactInfo" placeholder="Persona de Contacto" value={editedAssembler.contactInfo} onChange={handleChange} />
      <input type="text" name="address" placeholder="Dirección" value={editedAssembler.address} onChange={handleChange} />
      <input type="text" name="phone" placeholder="Teléfono" value={editedAssembler.phone} onChange={handleChange} />
      <input type="email" name="email" placeholder="Email" value={editedAssembler.email} onChange={handleChange} />
      <select name="paymentTerms" value={editedAssembler.paymentTerms} onChange={handleChange}>
        {paymentTermOptions.map(term => <option key={term} value={term}>{term}</option>)}
      </select>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">Guardar Cambios</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

export default EditForm;
