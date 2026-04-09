import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { collection, getDocs, getDoc, addDoc, doc, onSnapshot, updateDoc, runTransaction } from "firebase/firestore";
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
  const [userData, setUserData] = useState(null);
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
    const obtenerUsuario = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setRole(data.role);
        setUserData(data); // 🔥 GUARDÁS TODO
      }
    };

    obtenerUsuario(); // ✅ acá estaba el error
  }, []);

  const handleSelectMesa = () => {
    setCartVisible(true);
  };

  useEffect(() => {
    const productsRef = collection(
      db,
      "categories",
      categoryId,
      "products"
    );

    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setProducts(prods);
      setLoading(false);
    });

    return () => unsubscribe();
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

    if (!name || !price) {
      alert("Nombre y precio son obligatorios");
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
        stock: 0, // 👈 IMPORTANTE
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
    if (!mesaData) return;

    try {
      // 🔹 Armar items desde el carrito
      const items = cart.map((p) => ({
        id: p.productId || null,        // 🔥 ESTE ES EL ID REAL DEL PRODUCTO
        categoryId: p.categoryId || null,
        name: p.name || "",
        price: p.price || 0,
        quantity: p.quantity || 1,
        total: p.total || (p.price * (p.quantity || 1)),
      }));

      const now = new Date();

      // 🟢 GUARDAR EN mesasLiberadas
      await addDoc(collection(db, "mesasLiberadas"), {
        mesa: mesaData?.numero ?? "Sin mesa",
        sector: mesaData?.sector ?? "Sin sector",
        total: total ?? 0,
        pago: parseFloat(pago) || 0,
        vuelto: vuelto ?? 0,
        fecha: now.toLocaleDateString("es-AR"),
        hora: now.toLocaleTimeString("es-AR"),
        items: items ?? [],
        userId: auth.currentUser?.uid ?? null,
        userName: userData?.name ?? "Empleado",
        createdAt: new Date(),
      });

      // 🔥 limpiar mesa
      await clearMesa(false);

      closeCobroModal();
    } catch (error) {
      console.error("Error liberando mesa:", error);
    }
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
      // 🔥 VALIDACIÓN UX (no crítica)
      for (const item of cart) {
        const product = products.find(p => p.id === item.id);
        const quantity = Number(item.quantity ?? 1);

        if (product && quantity > (product.stock ?? 0)) {
          alert(`No hay suficiente stock de ${item.name}`);
          return;
        }
      }

      // 🔹 ARRAY SEGURO
      const items = cart.map((p) => ({
  id: p.productId ?? null,        // 🔥 CORREGIDO
  categoryId: p.categoryId ?? null,
  name: p.name ?? "",
  price: Number(p.price ?? 0),
  quantity: Number(p.quantity ?? 1),
  total: Number(p.total ?? (p.price ?? 0) * (p.quantity ?? 1)),
}));

      console.log("🧾 ITEMS A COBRAR:", items);

      const now = new Date();

      // 🔥 DESCONTAR STOCK (UNA SOLA TRANSACTION)
      await runTransaction(db, async (transaction) => {

        const productRefs = [];
        const snaps = [];

        // 🔹 1. PREPARAR referencias
        for (const item of items) {
          const { id: productId, categoryId } = item;

          if (!productId || !categoryId) continue;

          const ref = doc(db, "categories", categoryId, "products", productId);
          productRefs.push({ ref, item });
        }

        // 🔹 2. LEER TODO PRIMERO
        for (const { ref } of productRefs) {
          const snap = await transaction.get(ref);
          snaps.push(snap);
        }

        // 🔹 3. VALIDAR + ACTUALIZAR
        for (let i = 0; i < productRefs.length; i++) {
          const { ref, item } = productRefs[i];
          const snap = snaps[i];

          if (!snap.exists()) {
            throw new Error(`Producto no encontrado: ${item.name}`);
          }

          const currentStock = Number(snap.data().stock ?? 0);

          if (item.quantity > currentStock) {
            throw new Error(`Sin stock suficiente de ${item.name}`);
          }

          transaction.update(ref, {
            stock: currentStock - item.quantity,
          });

          console.log(`✅ ${item.name}: ${currentStock} → ${currentStock - item.quantity}`);
        }

      });

      // 🔥 GUARDAR COBRO
      await addDoc(collection(db, "cobros"), {
        mesa: mesaData.numero ?? "Sin mesa",
        sector: mesaData.sector ?? "Sin sector",
        total: Number(total ?? 0),
        pago: parseFloat(pago ?? 0),
        vuelto: Number(vuelto ?? 0),
        fecha: now.toLocaleDateString("es-AR"),
        hora: now.toLocaleTimeString("es-AR"),
        items,
        userId: auth.currentUser?.uid ?? null,
        userName: userData?.name ?? "Empleado",
        createdAt: new Date(),
      });

      await clearMesa(true);

      setModalPagoOpen(false);
      closeCobroModal();
      setPago("");
      setVuelto(0);

      alert("✅ Cobrado y stock actualizado");

    } catch (error) {
      console.error("❌ Error cobrando:", error.message, error);

      alert(error.message || "Error al cobrar");
    }
  };

  // 🔹 Función para imprimir tickets de mesas
  // 🔹 Función para imprimir tickets de mesas (usando cart)
  const imprimirTicket = (mesa, cartItems) => {
    const ventana = window.open("", "PRINT", "height=600,width=300");
    const ahora = new Date().toLocaleString();

    const ticketCocina = `
    <div class="ticket">
      <h2>👨‍🍳 COCINA</h2>
      <h3>Mesa ${mesa.numero}</h3>
      <p>${mesa.sector}</p>
      <p>${ahora}</p>
      <hr/>
      ${cartItems
        .map(
          (p) => `
            <div class="item">
              <span>${p.name}</span>
              <span>x${p.quantity || 1}</span>
            </div>
          `
        )
        .join("")}
      <hr/>
      <p style="text-align:center;">---------------------------</p>
    </div>
  `;

    const ticketCaja = `
    <div class="ticket">
      <h2>💰 CAJA</h2>
      <h3>Mesa ${mesa.numero}</h3>
      <p>${mesa.sector}</p>
      <p>${ahora}</p>
      <hr/>
      ${cartItems
        .map(
          (p) => `
            <div class="item">
              <span>${p.name} x${p.quantity}</span>
              <span>$${p.total}</span>
            </div>
          `
        )
        .join("")}
      <div class="total">TOTAL: $${cartItems.reduce((acc, p) => acc + (p.total || 0), 0)}</div>
      <p style="text-align:center;">---------------------------</p>
    </div>
  `;

    const contenido = `
    <html>
      <head>
        <title>Ticket</title>
        <style>
          body { font-family: monospace; width: 220px; padding: 5px; }
          .ticket { margin-bottom: 20px; }
          h2, h3, p { margin: 4px 0; text-align: center; }
          .item { display: flex; justify-content: space-between; font-size: 12px; }
          .total { border-top: 1px dashed black; margin-top: 10px; padding-top: 5px; font-size: 16px; text-align: center; }
          hr { border: none; border-top: 1px dashed black; margin: 5px 0; }
        </style>
      </head>
      <body>
        ${ticketCocina}
        ${ticketCaja}
      </body>
    </html>
  `;

    ventana.document.write(contenido);
    ventana.document.close();
    ventana.focus();

    setTimeout(() => {
      ventana.print();
      ventana.close();
    }, 500);
  };

  // 🔹 Función para enviar pedido
 const enviarPedido = async (mesa) => {
  if (!mesa) return alert("No hay mesa seleccionada");

  try {
    imprimirTicket(mesa, cart); // abrir ticket

    // 🔹 retrasar el alert para que la ventana tenga tiempo de aparecer
    setTimeout(() => {
      alert(`Pedido enviado para Mesa ${mesa.numero}`);
    }, 500); // 0.5 segundos, ajustable
  } catch (error) {
    console.error("Error enviando pedido:", error);
    alert("Error enviando pedido");
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
              {/* HEADER */}
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

              {/* ITEMS */}
              {cart.map((p) => (
                <div key={p.id} className={styles.cartItem}>
                  <span>{p.name}</span>
                  <div className={styles.cartControls}>
                    <button onClick={() => removeFromCart(p.id)}>-</button>
                    <span>{p.quantity}</span>
                    <button
                      onClick={() => {
                        const product = products.find(prod => prod.id === p.id);
                        if (product && p.quantity >= (product.stock || 0)) {
                          alert("No hay más stock disponible");
                          return;
                        }
                        addToCart(p);
                      }}
                    >
                      +
                    </button>
                  </div>
                  <span>{formatARS(p.total)}</span>
                </div>
              ))}

              {/* TOTAL Y BOTONES */}
              {mesaId && cart.length > 0 && (
                <>
                  <h4>Total: {formatARS(total)}</h4>

                  {/* COBRAR SOLO SI NO ES MOZO */}
                  {role && role !== "mozo" && (
                    <button className={styles.payBtn} onClick={openCobroModal}>
                      💰 Cobrar / Liberar mesa
                    </button>
                  )}

                  {/* ENVIAR PEDIDO PARA TODOS */}
                  <button
                    className={styles.sendBtn}
                    onClick={() => enviarPedido(mesaData)}
                  >
                    🧾 Enviar pedido
                  </button>
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
                id={prod.id} // 🔥 FALTABA
                categoryId={categoryId} // 🔥 FALTABA
                name={prod.name}
                description={prod.description}
                ingredients={prod.ingredients}
                price={prod.price}
                image={prod.image}
                stock={prod.stock} // 👈 CLAVE
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

            <h1 style={{ fontSize: "40px", marginTop: "20px", background:"transparent" }}>
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