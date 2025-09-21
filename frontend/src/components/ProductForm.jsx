import React from 'react';

const PRODUCT_TYPES = ['RAW_MATERIAL', 'PRE_ASSEMBLED', 'FINISHED'];

const ProductForm = ({ product, setProduct, categories, suppliers, isEdit = false }) => {

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? parseFloat(value) : value;
    setProduct(prev => ({ ...prev, [name]: val }));
  };

  return (
    <form style={formStyle}>
      <div style={inputGroupStyle}>
        <label>Código Interno</label>
        <input 
          type="text" 
          name="internalCode" 
          value={product.internalCode || ''} 
          onChange={handleChange} 
          style={inputStyle} 
          disabled={isEdit} // Cannot edit internal code
        />
      </div>
      <div style={inputGroupStyle}>
        <label>Descripción</label>
        <input type="text" name="description" value={product.description || ''} onChange={handleChange} style={inputStyle} required />
      </div>
      <div style={inputGroupStyle}>
        <label>Unidad</label>
        <input type="text" name="unit" value={product.unit || ''} onChange={handleChange} style={inputStyle} required />
      </div>
      <div style={inputGroupStyle}>
        <label>Tipo de Producto</label>
        <select name="type" value={product.type || ''} onChange={handleChange} style={inputStyle} required>
          <option value="" disabled>Seleccione un tipo</option>
          {PRODUCT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>
      <div style={inputGroupStyle}>
        <label>Umbral de Bajo Stock</label>
        <input type="number" name="lowStockThreshold" value={product.lowStockThreshold || 0} onChange={handleChange} style={inputStyle} min="0" />
      </div>
      <div style={inputGroupStyle}>
        <label>Categoría</label>
        <select name="categoryId" value={product.categoryId || ''} onChange={handleChange} style={inputStyle}>
          <option value="">Ninguna</option>
          {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
      </div>
       <div style={inputGroupStyle}>
        <label>Proveedor</label>
        <select name="supplierId" value={product.supplierId || ''} onChange={handleChange} style={inputStyle}>
          <option value="">Ninguno</option>
          {suppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
        </select>
      </div>
      {/* Price fields could be restricted by role here if needed */}
      <div style={inputGroupStyle}>
        <label>Precio ARS</label>
        <input type="number" name="priceARS" value={product.priceARS || ''} onChange={handleChange} style={inputStyle} min="0" step="0.01" />
      </div>
      <div style={inputGroupStyle}>
        <label>Precio USD</label>
        <input type="number" name="priceUSD" value={product.priceUSD || ''} onChange={handleChange} style={inputStyle} min="0" step="0.01" />
      </div>
    </form>
  );
};

// Styles
const formStyle = { display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px', margin: 'auto' };
const inputGroupStyle = { display: 'flex', flexDirection: 'column' };
const inputStyle = { padding: '8px', border: '1px solid #ccc', borderRadius: '4px' };

export default ProductForm;
