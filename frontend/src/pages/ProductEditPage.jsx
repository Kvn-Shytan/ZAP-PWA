import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProductForm from '../components/ProductForm';
import ProductComponents from '../components/ProductComponents'; // Import the new component

const ProductEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authFetch, user } = useAuth(); // Get user role
  
  const isEdit = Boolean(id);
  const [product, setProduct] = useState({ type: 'RAW_MATERIAL', lowStockThreshold: 0 });
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [allProducts, setAllProducts] = useState([]); // State for all products list
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const catPromise = authFetch('/categories');
      const supPromise = authFetch('/suppliers');
      const allProdPromise = authFetch('/products'); // Fetch all products
      let prodPromise = Promise.resolve(null);

      if (isEdit) {
        prodPromise = authFetch(`/products/${id}`);
      }

      const [catData, supData, prodData, allProdData] = await Promise.all([catPromise, supPromise, prodPromise, allProdPromise]);

      setCategories(catData || []);
      setSuppliers(supData || []);
      setAllProducts(allProdData || []); // Set all products
      if (prodData) {
        setProduct(prodData);
      }

    } catch (err) {
      setError('Error al cargar los datos necesarios para el formulario.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [authFetch, id, isEdit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const method = isEdit ? 'PUT' : 'POST';
      const endpoint = isEdit ? `/products/${id}` : '/products';
      
      const payload = {
        ...product,
        categoryId: product.categoryId ? parseInt(product.categoryId) : null,
        supplierId: product.supplierId ? parseInt(product.supplierId) : null,
        priceARS: product.priceARS ? parseFloat(product.priceARS) : null,
        priceUSD: product.priceUSD ? parseFloat(product.priceUSD) : null,
        lowStockThreshold: product.lowStockThreshold ? parseFloat(product.lowStockThreshold) : 0,
      };

      await authFetch(endpoint, { method, body: JSON.stringify(payload) });

      alert(`Producto ${isEdit ? 'actualizado' : 'creado'} correctamente.`);
      navigate('/products');

    } catch (err) {
      setError(err.message || 'Ocurrió un error al guardar el producto.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (isSubmitting) return;

    const confirmed = window.confirm('¿Estás SEGURO de que quieres eliminar este producto? Esta acción es permanente e irreversible.');
    if (!confirmed) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await authFetch(`/products/${id}`, { method: 'DELETE' });
      alert('Producto eliminado correctamente.');
      navigate('/products');
    } catch (err) {
      setError(err.message || 'Ocurrió un error al eliminar el producto.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div>Cargando datos del producto...</div>;
  }

  if (error && !product.id && isEdit) {
    return <div style={{ color: 'red' }}>{error}</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2>{isEdit ? 'Editar Producto' : 'Crear Nuevo Producto'}</h2>
      <ProductForm 
        product={product} 
        setProduct={setProduct} 
        categories={categories} 
        suppliers={suppliers} 
        isEdit={isEdit}
      />
      {error && <p style={{ color: 'red', marginTop: '1rem' }}>Error: {error}</p>}
      <div style={actionsContainerStyle}>
        <div>
          <button onClick={handleSubmit} disabled={isSubmitting} style={buttonStyle}>
            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <button onClick={() => navigate('/products')} style={cancelButtonStyle}>
            Cancelar
          </button>
        </div>
        {isEdit && user.role === 'ADMIN' && (
          <button onClick={handleDelete} disabled={isSubmitting} style={deleteButtonStyle}>
            Eliminar Producto
          </button>
        )}
      </div>

      {isEdit && (product.type === 'PRE_ASSEMBLED' || product.type === 'FINISHED') && (
        <ProductComponents 
          product={product} 
          allProducts={allProducts}
          user={user}
          reloadData={loadData}
        />
      )}
    </div>
  );
};

// Styles
const actionsContainerStyle = { marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const buttonStyle = { padding: '10px 15px', border: 'none', backgroundColor: '#007bff', color: 'white', borderRadius: '4px', cursor: 'pointer', marginRight: '1rem' };
const cancelButtonStyle = { ...buttonStyle, backgroundColor: '#6c757d' };
const deleteButtonStyle = { ...buttonStyle, backgroundColor: '#dc3545', marginRight: 0 };

export default ProductEditPage;
