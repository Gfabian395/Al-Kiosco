import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { collection, getDocs, getDoc, addDoc, doc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "../firebase";
import CardProduct from "../components/CardProduct";
import Loader from "../components/Loader";
import SelectMesa from "../components/SelectMesa";
import { useCart } from "../context/CartContext";
import styles from "../components/styles/Productos.module.css";

export const Productos = () => {
  const { categoryId } = useParams();
  const formatARS = (valor) => `$${(valor || 0).toLocaleString("es-AR")}`;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartVisible, setCartVisible] = useState(false);
  const {
    mesaId,
    cart,
    total,
    clearMesa,
    addToCart,
    removeFromCart,
  } = useCart();

  const [mesaData, setMesaData] = useState(null);
  const [modalCobroOpen, setModalCobroOpen] = useState(false);
  const [modalProductOpen, setModalProductOpen] = useState(false);
  const [role, setRole] = useState(null);

  // 🔥 NUEVO
  const [modalPagoOpen, setModalPagoOpen] = useState(false);
  const [pago, setPago] = useState("");
  const [vuelto, setVuelto] = useState(0);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [price, setPrice] = useState("");
  const [imageFile, setImageFile] = useState(null);

  const [saving, setSaving] = useState(false);

  // 🔥 traer productos
  const fetchProducts = async () => {
    try {
      const productsRef = collection(
        db,
        "categories",
        categoryId,
        "products"
      );

      const snapshot = await getDocs(productsRef);
      const prods = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setProducts(prods);
    } catch (err) {
      console.error("Error cargando productos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mesaId) {
      setCartVisible(true); // 🔥 abre al seleccionar mesa
    }
  }, [mesaId]);

  useEffect(() => {
    const obtenerRol = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const docRef = doc(db, "usuarios", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setRole(docSnap.data().role);
      }
    };

    obtenerRol();
  }, []);

  const handleSelectMesa = () => {
    setCartVisible(true);
  };

  useEffect(() => {
    fetchProducts();
  }, [categoryId]);

  // 🔥 traer datos mesa
  useEffect(() => {
    if (!mesaId) {
      setMesaData(null);
      return;
    }

    const refMesa = doc(db, "mesas", mesaId);

    const unsubscribe = onSnapshot(refMesa, (docSnap) => {
      if (docSnap.exists()) {
        setMesaData(docSnap.data());
      }
    });

    return () => unsubscribe();
  }, [mesaId]);

  // 🔹 modal producto
  const openProductModal = () => setModalProductOpen(true);

  const closeProductModal = () => {
    if (saving) return;

    setModalProductOpen(false);
    setName("");
    setDescription("");
    setIngredients("");
    setPrice("");
    setImageFile(null);
  };

  // 🔥 guardar producto
  const handleSaveProduct = async () => {
    if (saving) return;

    if (!name || !description || !price) {
      alert("Completá los campos obligatorios");
      return;
    }

    try {
      setSaving(true);

      let imageUrl = "";

      if (imageFile) {
        const storageRef = ref(
          storage,
          `products/${Date.now()}-${imageFile.name}`
        );

        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      const newProduct = {
        name,
        description,
        ingredients,
        price: parseFloat(price),
        image: imageUrl,
      };

      const productsRef = collection(
        db,
        "categories",
        categoryId,
        "products"
      );

      const docRef = await addDoc(productsRef, newProduct);

      setProducts((prev) => [
        ...prev,
        { id: docRef.id, ...newProduct },
      ]);

      closeProductModal();
    } catch (err) {
      console.error("Error guardando producto:", err);
      alert("Error al guardar producto");
    } finally {
      setSaving(false);
    }
  };

  // 🔥 modal cobrar/liberar
  const openCobroModal = () => setModalCobroOpen(true);
  const closeCobroModal = () => setModalCobroOpen(false);

  const handleLiberar = async () => {
    await clearMesa(false);
    closeCobroModal();
  };

  // 🔥 NUEVO → abrir paso de pago
  const handleOpenPago = () => {
    setModalPagoOpen(true);
  };

  // 🔥 calcular vuelto automático
  useEffect(() => {
    const pagoNum = parseFloat(pago) || 0;
    setVuelto(pagoNum - total);
  }, [pago, total]);

  // 🔥 confirmar cobro final
  const handleCobrar = async () => {
    if (!mesaData) return;

    try {
      // 🔹 Crear array de items con detalle
      const items = cart.map((p) => ({
        name: p.name,
        price: p.price,
        quantity: p.quantity || 1,
        total: p.total || (p.price * (p.quantity || 1)),
      }));

      const now = new Date();

      await addDoc(collection(db, "cobros"), {
        mesa: mesaData.numero,
        sector: mesaData.sector,
        total,
        pago: parseFloat(pago),
        vuelto,
        fecha: now.toLocaleDateString("es-AR"),
        hora: now.toLocaleTimeString("es-AR"),
        items, // 🔥 detalle de productos
      });

      // 🔹 Limpiar mesa y UI
      await clearMesa(true);
      setModalPagoOpen(false);
      closeCobroModal();
      setPago("");
      setVuelto(0);
    } catch (error) {
      console.error("Error cobrando:", error);
      alert("Error al cobrar");
    }
  };

  if (loading) return <p>Cargando productos...</p>;

  return (
    <>
      <div className={styles.layout}>

        <div className={styles.mesasPanel}>
          {/* 🔥 CARRITO AHORA ABAJO */}
          {mesaId && cartVisible && (
            <div className={`${styles.cartPanel} ${styles.cartFloating}`}>

              {/* 🔥 HEADER CON BOTÓN CERRAR */}
              <div className={styles.cartHeader}>
                <h3>
                  {mesaData
                    ? `Mesa ${mesaData.numero} (${mesaData.sector})`
                    : "Seleccioná una mesa"}
                </h3>

                <button
                  className={styles.closeCart}
                  onClick={() => setCartVisible(false)}
                >
                  ✕
                </button>
              </div>

              {!mesaId && <p>Seleccioná una mesa</p>}
              {mesaId && cart.length === 0 && <p>Sin productos</p>}

              {cart.map((p) => (
                <div key={p.id} className={styles.cartItem}>
                  <span>{p.name}</span>

                  <div className={styles.cartControls}>
                    <button onClick={() => removeFromCart(p.id)}>-</button>
                    <span>{p.quantity}</span>
                    <button onClick={() => addToCart(p)}>+</button>
                  </div>

                  <span>{formatARS(p.total)}</span>
                </div>
              ))}

              {mesaId && (
                <>
                  <h4>Total: {formatARS(total)}</h4>

                  {role && role !== "mozo" && (
                    <button
                      className={styles.payBtn}
                      onClick={openCobroModal}
                    >
                      💰 Cobrar / Liberar mesa
                    </button>
                  )}
                </>
              )}
            </div>
          )}
          <h3 className={styles.mesasTitle}>Mesas</h3>
          <SelectMesa onSelectMesa={handleSelectMesa} />

        </div>

        <div className={styles.productosPanel}>
          <div className={styles.productContainer}>
            {products.map((prod) => (
              <CardProduct
                key={prod.id}
                name={prod.name}
                description={prod.description}
                ingredients={prod.ingredients}
                price={prod.price}
                image={prod.image}
                onAdd={() => addToCart(prod)}
              />
            ))}
          </div>
        </div>

      </div>

      {/* 🔥 MODAL COBRO */}
      {modalCobroOpen && role !== "mozo" && (
        <div className={styles.modalOverlay} onClick={closeCobroModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>¿Qué querés hacer?</h2>

            <div className={styles.actions}>
              <button onClick={handleOpenPago}>
                💰 Cobrar mesa
              </button>

              <button onClick={handleLiberar}>
                ❌ Liberar mesa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 MODAL PAGO */}
      {modalPagoOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalPagoOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Total: {formatARS(total)}</h2>

            <input
              type="number"
              placeholder="¿Con cuánto paga?"
              value={pago}
              onChange={(e) => setPago(e.target.value)}
            />

            <h1 style={{ fontSize: "40px", marginTop: "20px" }}>
              Vuelto: {formatARS(vuelto >= 0 ? vuelto : 0)}
            </h1>

            <div className={styles.actions}>
              <button onClick={handleCobrar}>
                Confirmar cobro
              </button>

              <button onClick={() => setModalPagoOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.fab} onClick={openProductModal}>
        +
      </div>

      {modalProductOpen && (
        <div className={styles.modalOverlay} onClick={closeProductModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Agregar Producto</h2>

            <input type="text" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
            <input type="text" placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
            <input type="text" placeholder="Ingredientes" value={ingredients} onChange={(e) => setIngredients(e.target.value)} />
            <input type="number" placeholder="Precio" value={price} onChange={(e) => setPrice(e.target.value)} />
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />

            <div className={styles.actions}>
              <button onClick={handleSaveProduct} disabled={saving}>
                {saving ? "Guardando..." : "Guardar"}
              </button>

              <button onClick={closeProductModal} disabled={saving}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {saving && (
        <div className={styles.loadingOverlay}>
          <Loader />
          <p className={styles.loadingText}>
            Guardando producto...
          </p>
        </div>
      )}
    </>
  );
};