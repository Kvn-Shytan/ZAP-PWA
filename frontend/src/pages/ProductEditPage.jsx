import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../services/api';
import ProductForm from '../components/ProductForm';
import AssignTrabajoModal from '../components/AssignTrabajoModal'; // Import the new modal
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { supplierService } from '../services/supplierService';
import { trabajoDeArmadoService } from '../services/trabajoDeArmadoService';

const ProductEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const isEdit = Boolean(id);
  const [product, setProduct] = useState({ type: 'RAW_MATERIAL', lowStockThreshold: 0 });
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [trabajosOptions, setTrabajosOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New state for modal management
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const catPromise = categoryService.getCategories();
      const supPromise = supplierService.getSuppliers();
      const trabajoPromise = trabajoDeArmadoService.getAll();
      let prodPromise = Promise.resolve(null);

      if (isEdit) {
        prodPromise = productService.getProductById(id);
      }

      const [catData, supData, prodData, trabajoData] = await Promise.all([catPromise, supPromise, prodPromise, trabajoPromise]);

      setCategories(catData || []);
      setSuppliers(supData || []);
      
      const options = (trabajoData || []).map(t => ({
        value: t.id,
        label: `${t.nombre} ($${Number(t.precio).toFixed(2)})`
      }));
      setTrabajosOptions(options);

      if (prodData) {
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

  // Modal Handlers
  const handleOpenAssignModal = () => setIsAssignModalOpen(true);
  const handleCloseAssignModal = () => setIsAssignModalOpen(false);

  const handleTrabajoAssigned = (assignedTrabajo) => {
    setProduct(prev => ({ ...prev, trabajoDeArmado: assignedTrabajo }));
    handleCloseAssignModal();
  };
  
  const handleTrabajoDisassociated = () => {
    setProduct(prev => ({ ...prev, trabajoDeArmado: null }));
    handleCloseAssignModal();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if ((product.type === 'PRE_ASSEMBLED' || product.type === 'FINISHED') && !product.trabajoDeArmado) {
        setError('Para productos pre-ensamblados o finales, es obligatorio asignar un trabajo de armado.');
        return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      const payload = { ...product };
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

      // Only attempt to assign a trabajo de armado if the product type requires it
      if (product.type === 'PRE_ASSEMBLED' || product.type === 'FINISHED') {
        await apiFetch(`/product-design/${productId}/trabajo-armado`, {
            method: 'PUT',
            body: JSON.stringify({ 
              trabajoDeArmadoId: product.trabajoDeArmado ? product.trabajoDeArmado.value : null 
            })
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
    } catch (err)
 {
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
        onOpenAssignModal={handleOpenAssignModal} // Pass the modal opener
        isEdit={isEdit}
      />

      {isEdit && (
        <div style={manageComponentsContainerStyle}>
          <Link to={`/products/${id}/components`} style={manageComponentsButtonStyle}>
            Gestionar Componentes
          </Link>
        </div>
      )}

      <AssignTrabajoModal
        isOpen={isAssignModalOpen}
        onClose={handleCloseAssignModal}
        onAssign={handleTrabajoAssigned}
        onDisassociate={handleTrabajoDisassociated}
        existingTrabajos={trabajosOptions}
        currentTrabajo={product.trabajoDeArmado}
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
    </div>
  );
};

// Styles
const actionsContainerStyle = { marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const buttonStyle = { padding: '10px 15px', border: 'none', backgroundColor: '#007bff', color: 'white', borderRadius: '4px', cursor: 'pointer', marginRight: '1rem' };
const cancelButtonStyle = { ...buttonStyle, backgroundColor: '#6c757d' };
const deleteButtonStyle = { ...buttonStyle, backgroundColor: '#dc3545', marginRight: 0 };

const manageComponentsContainerStyle = { marginTop: '1rem', textAlign: 'right' };
const manageComponentsButtonStyle = {
  ...buttonStyle,
  backgroundColor: '#17a2b8', // A different color for differentiation
  marginRight: 0,
};

export default ProductEditPage;
