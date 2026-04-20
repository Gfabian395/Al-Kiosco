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
import logo from "../assets/LaPancheria.png";
import { query, where } from "firebase/firestore";
import Buscador from "../components/Buscador";

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
  const [stock, setStock] = useState("");
  const [mesaData, setMesaData] = useState(null);
  const [modalCobroOpen, setModalCobroOpen] = useState(false);
  const [modalProductOpen, setModalProductOpen] = useState(false);
  const [role, setRole] = useState(null);
  const [userData, setUserData] = useState(null);
  // 🔥 NUEVO
  const [modalPagoOpen, setModalPagoOpen] = useState(false);
  const [pago, setPago] = useState("");
  const [vuelto, setVuelto] = useState(0);
  const [turno, setTurno] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [price, setPrice] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [cobrando, setCobrando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState([]);

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
      setFilteredProducts(prods);
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

  useEffect(() => {
    const obtenerTurno = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "turnos"),
        where("userId", "==", user.uid),
        where("activo", "==", true)
      );

      const res = await getDocs(q);

      if (!res.empty) {
        setTurno({
          id: res.docs[0].id,
          ...res.docs[0].data(),
        });
      }
    };

    obtenerTurno();
  }, []);

  // 🔹 modal producto
  const openProductModal = () => setModalProductOpen(true);

  const closeProductModal = () => {
    if (saving) return;

    setModalProductOpen(false);
    setName("");
    setDescription("");
    setIngredients("");
    setPrice("");
    setStock("");
    setImageFile(null);
  };

  // 🔥 guardar producto
  const handleSaveProduct = async () => {
    if (role !== "jefe" && role !== "encargado") {
      alert("No tenés permisos");
      return;
    }
    if (saving) return;

    const priceNum = Number(price);
    const stockNum = Number(stock); // 👈 VA ACÁ ARRIBA

    if (!name.trim()) {
      alert("El nombre es obligatorio");
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      alert("El precio debe ser mayor a 0");
      return;
    }

    if (isNaN(stockNum) || stockNum < 0) {
      alert("El stock debe ser 0 o mayor");
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
        price: priceNum,
        image: imageUrl,
        stock: stockNum, // ✔ correcto
      };

      await addDoc(
        collection(db, "categories", categoryId, "products"),
        newProduct
      );

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

    const pagoNum = parseFloat(pago);

    // 🔴 VALIDACIONES ANTES
    if (isNaN(pagoNum) || pagoNum <= 0) {
      alert("Ingresá un pago válido");
      return;
    }

    if (pagoNum < total) {
      alert("El pago es menor al total");
      return;
    }

    if (!turno) {
      alert("No hay turno activo");
      return;
    }

    // 🔒 evitar doble cobro
    if (cobrando) return;
    setCobrando(true);

    try {
      const items = cart.map((p) => ({
        id: p.productId || p.id,
        categoryId: p.categoryId,
        name: p.name ?? "",
        price: Number(p.price ?? 0),
        quantity: Number(p.quantity ?? 1),
        total: Number(p.total ?? (p.price ?? 0) * (p.quantity ?? 1)),
      }));

      // 🔴 VALIDACIÓN FUERTE
      for (const item of items) {
        if (!item.id || !item.categoryId) {
          throw new Error(`Item inválido: ${item.name}`);
        }
      }

      const now = new Date();

      await runTransaction(db, async (transaction) => {
        const refs = [];
        const snaps = [];

        for (const item of items) {
          const productRef = doc(
            db,
            "categories",
            item.categoryId,
            "products",
            item.id
          );

          const snap = await transaction.get(productRef);

          if (!snap.exists()) {
            throw new Error(`Producto no encontrado: ${item.name}`);
          }

          refs.push({ ref: productRef, item });
          snaps.push(snap);
        }

        for (let i = 0; i < refs.length; i++) {
          const { ref, item } = refs[i];
          const snap = snaps[i];

          const currentStock = Number(snap.data().stock ?? 0);

          if (item.quantity <= 0) {
            throw new Error(`Cantidad inválida en ${item.name}`);
          }

          if (item.quantity > currentStock) {
            throw new Error(`Sin stock suficiente de ${item.name}`);
          }

          transaction.update(ref, {
            stock: currentStock - item.quantity,
          });
        }
      });

      // 🧾 imprimir ticket
      imprimirTicket(mesaData, cart);

      await addDoc(collection(db, "cobros"), {
        mesa: mesaData.numero ?? "Sin mesa",
        sector: mesaData.sector ?? "Sin sector",
        total: Number(total ?? 0),
        pago: pagoNum,
        vuelto: pagoNum - total,
        fecha: now.toLocaleDateString("es-AR"),
        hora: now.toLocaleTimeString("es-AR"),
        items,
        userId: auth.currentUser?.uid ?? null,
        userName: userData?.name ?? "Empleado",
        turnoId: turno?.id ?? null,
        createdAt: new Date(),
      });

      await clearMesa(true);

      setModalPagoOpen(false);
      closeCobroModal();
      setPago("");
      setVuelto(0);

      alert("✅ Cobrado y stock actualizado");

    } catch (error) {
      console.error("❌ Error cobrando:", error);
      alert(error.message || "Error al cobrar");
    } finally {
      setCobrando(false);
    }
  };

  const imprimirTicket = (mesa, cartItems) => {
    const ventana = window.open("", "PRINT", "height=500,width=800");
    const ahora = new Date().toLocaleString();

    const total = cartItems.reduce((acc, p) => acc + (p.total || 0), 0);

    const ticketCocina = `
    <div style="margin-bottom:30px;">
      
      <div style="text-align:center; margin-bottom:10px;">
        <img src="${logo}" style="width:250px;" />
      </div>

      <h2 style="margin:6px 0; text-align:center; font-size:26px;">COCINA</h2>
      <h3 style="margin:6px 0; text-align:center; font-size:22px;">Mesa ${mesa.numero}</h3>
      <p style="margin:6px 0; text-align:center; font-size:18px;">${mesa.sector}</p>
      <p style="margin:6px 0; text-align:center; font-size:18px;">${ahora}</p>

      <hr style="border:none; border-top:2px dashed black; margin:10px 0;" />

      ${cartItems.map(p => `
        <div style="display:flex; justify-content:space-between; font-size:18px;">
          <span>${p.name}</span>
          <span>x${p.quantity || 1}</span>
        </div>
      `).join("")}

      <hr style="border:none; border-top:2px dashed black; margin:10px 0;" />

      <p style="text-align:center; font-size:16px;">---------------------------</p>
    </div>
  `;

    const ticketCaja = `
    <div style="margin-bottom:30px;">
      
      <div style="text-align:center; margin-bottom:10px;">
        <img src="${logo}" style="width:100%; max-width:400px;" />
      </div>

      <h2 style="margin:6px 0; text-align:center; font-size:26px;">💰 CAJA</h2>
      <h3 style="margin:6px 0; text-align:center; font-size:22px;">Mesa ${mesa.numero}</h3>
      <p style="margin:6px 0; text-align:center; font-size:18px;">${mesa.sector}</p>
      <p style="margin:6px 0; text-align:center; font-size:18px;">${ahora}</p>

      <hr style="border:none; border-top:2px dashed black; margin:10px 0;" />

      ${cartItems.map(p => `
        <div style="display:flex; justify-content:space-between; font-size:18px;">
          <span>${p.name} x${p.quantity}</span>
          <span>$${p.total}</span>
        </div>
      `).join("")}

      <div style="border-top:2px dashed black; margin-top:12px; padding-top:6px; font-size:22px; text-align:center; font-weight:bold;">
        TOTAL: $${total}
      </div>

      <p style="text-align:center; font-size:16px;">---------------------------</p>
    </div>
  `;

    const contenido = `
    <html>
      <head>
        <style>
          @media print {
            .corte {
              page-break-before: always;
            }
          }
        </style>
      </head>
      <body style="font-family: monospace; width: 250px; padding: 10px;">
        
        ${ticketCocina}

        <!-- 🔥 ESTO GENERA EL CORTE REAL -->
        <div class="corte"></div>

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
    }, 800);
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
                        const product = products.find(prod => prod.id === (p.productId || p.id));

                        if (!product) {
                          alert("Producto no encontrado");
                          return;
                        }

                        if (p.quantity >= (product.stock || 0)) {
                          alert("No hay más stock disponible");
                          return;
                        }

                        addToCart({
                          productId: product.id,
                          categoryId: categoryId,
                          name: product.name,
                          price: product.price,
                          quantity: 1
                        });
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
          <Buscador
            productos={products}
            onResultados={setFilteredProducts}
          />
          <div className={styles.productContainer}>
            {filteredProducts.map((prod) => (
              <CardProduct
                key={prod.id}
                id={prod.id}
                categoryId={categoryId}
                name={prod.name}
                description={prod.description}
                ingredients={prod.ingredients}
                price={prod.price}
                image={prod.image}
                stock={prod.stock}
                role={role} // 🔥 AGREGAR ESTO
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

            <h1 style={{ fontSize: "40px", marginTop: "20px", background: "transparent" }}>
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

      {(role === "jefe" || role === "encargado") && (
        <div className={styles.fab} onClick={openProductModal}>
          +
        </div>
      )}

      {modalProductOpen && (
        <div className={styles.modalOverlay} onClick={closeProductModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Agregar Producto</h2>

            <input type="text" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
            <input type="text" placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
            <input type="text" placeholder="Ingredientes" value={ingredients} onChange={(e) => setIngredients(e.target.value)} />
            <input type="number" placeholder="Precio" value={price} onChange={(e) => setPrice(e.target.value)} />
            <input type="number" placeholder="Stock" value={stock} onChange={(e) => setStock(e.target.value)} />
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