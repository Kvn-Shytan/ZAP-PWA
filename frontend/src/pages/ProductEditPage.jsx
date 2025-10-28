import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../services/api';
import ProductForm from '../components/ProductForm';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { supplierService } from '../services/supplierService';
import { trabajoDeArmadoService } from '../services/trabajoDeArmadoService'; // Import the new service

const ProductEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // Get user role
  
  const isEdit = Boolean(id);
  const [product, setProduct] = useState({ type: 'RAW_MATERIAL', lowStockThreshold: 0 });
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [trabajosOptions, setTrabajosOptions] = useState([]); // New state for react-select options
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const catPromise = categoryService.getCategories();
      const supPromise = supplierService.getSuppliers();
      const trabajoPromise = trabajoDeArmadoService.getAll(); // Fetch assembly jobs
      let prodPromise = Promise.resolve(null);

      if (isEdit) {
        prodPromise = productService.getProductById(id);
      }

      const [catData, supData, prodData, trabajoData] = await Promise.all([catPromise, supPromise, prodPromise, trabajoPromise]);

      setCategories(catData || []);
      setSuppliers(supData || []);
      
      // Transform trabajos for react-select
      const options = (trabajoData || []).map(t => ({
        value: t.id,
        label: `${t.nombre} ($${Number(t.precio).toFixed(2)})`
      }));
      setTrabajosOptions(options);

      if (prodData) {
        // Find the selected trabajo option object from the fetched list
        const currentTrabajo = (prodData.trabajosDeArmado && prodData.trabajosDeArmado[0])
          ? options.find(opt => opt.value === prodData.trabajosDeArmado[0].trabajoId)
          : null;
        setProduct({ ...prodData, trabajoDeArmado: currentTrabajo });
      }

    } catch (err) {
      setError('Error al cargar los datos necesarios para el formulario.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, isEdit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Updated validation for react-select object
    if ((product.type === 'PRE_ASSEMBLED' || product.type === 'FINISHED') && !product.trabajoDeArmado) {
        setError('Para productos pre-ensamblados o finales, es obligatorio seleccionar un trabajo de armado.');
        return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      const payload = { ...product };
      // Delete relation objects before sending to product endpoint
      delete payload.trabajoDeArmado;
      delete payload.trabajosDeArmado;
      delete payload.components;
      delete payload.componentOf;
      delete payload.movements;
      delete payload.overheadCosts;
      delete payload.externalProductionItems;
      delete payload.expectedInOrders;

      let savedProduct;
      if (isEdit) {
        await productService.updateProduct(id, payload);
        savedProduct = { ...payload, id }; 
      } else {
        savedProduct = await productService.createProduct(payload);
      }

      const productId = savedProduct.id;

      // After saving the product, if it's an assemblable one, save the assembly job link.
      if ((product.type === 'PRE_ASSEMBLED' || product.type === 'FINISHED') && product.trabajoDeArmado) {
        await apiFetch(`/product-design/${productId}/trabajo-armado`, {
            method: 'PUT',
            body: JSON.stringify({ trabajoDeArmadoId: product.trabajoDeArmado.value }) // Extract value from react-select object
        });
      }

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
      await productService.deleteProduct(id);
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
        trabajosOptions={trabajosOptions} // Pass react-select options
        isEdit={isEdit}
      />
      {error && <p style={{ color: 'red', marginTop: '1rem' }}>Error: {error}</p>}
      <div style={actionsContainerStyle}>
        <div>
          <button onClick={handleSubmit} disabled={isSubmitting} style={buttonStyle}>
            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
          </button>

          {isEdit && (
            <Link to={`/products/${id}/components`} style={buttonStyle}>
              Gestionar Componentes
            </Link>
          )}

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
    </div>
  );
};

// Styles
const actionsContainerStyle = { marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const buttonStyle = { padding: '10px 15px', border: 'none', backgroundColor: '#007bff', color: 'white', borderRadius: '4px', cursor: 'pointer', marginRight: '1rem' };
const cancelButtonStyle = { ...buttonStyle, backgroundColor: '#6c757d' };
const deleteButtonStyle = { ...buttonStyle, backgroundColor: '#dc3545', marginRight: 0 };

export default ProductEditPage;
