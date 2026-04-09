import React, { useEffect, useState } from "react";
import { collection, onSnapshot, getDocs, getDoc, deleteDoc, doc, addDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import SelectMesa from "../components/SelectMesa";
import { useCart } from "../context/CartContext";
import styles from "../components/styles/Mesas.module.css";
import { onAuthStateChanged } from "firebase/auth"; // 🔥 arriba del archivo

export const Mesas = () => {
  const [mesas, setMesas] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalPagoOpen, setModalPagoOpen] = useState(false);
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const formatARS = (valor) => `$${(valor || 0).toLocaleString("es-AR")}`;
  const { clearMesa } = useCart();
  const [role, setRole] = useState(null);
  const [pago, setPago] = useState("");
  const [vuelto, setVuelto] = useState(0);
  const [userReady, setUserReady] = useState(false);
  const abrirModal = (mesa) => {
    setMesaSeleccionada(mesa);
    setModalOpen(true);
  };

  const cerrarModal = () => setModalOpen(false);

  // 🔴 LIBERAR
  const liberarMesa = async () => {
  if (!mesaSeleccionada) return;

  try {
    const pedidoRef = collection(db, "mesas", mesaSeleccionada.id, "pedido");
    const snapshot = await getDocs(pedidoRef);

    let totalReal = 0;

    // 🔥 Armar items igual que en cobros
    const items = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();

      const cantidad = data.quantity || data.cantidad || 1;
      const precio = data.price || data.precio || 0;
      const total = data.total || precio * cantidad;

      totalReal += total;

      return {
        name: data.name || data.nombre,
        price: precio,
        quantity: cantidad,
        total,
      };
    });

    const now = new Date();

    // 🟢 GUARDAR EN HISTORIAL (CLAVE)
    await addDoc(collection(db, "mesasLiberadas"), {
      mesa: mesaSeleccionada.numero,
      sector: mesaSeleccionada.sector,
      items,
      total: totalReal,
      fecha: now.toLocaleDateString("es-AR"),
      hora: now.toLocaleTimeString("es-AR"),
      estado: "Liberada",
    });

    // 🔴 BORRAR PEDIDO
    const deletes = snapshot.docs.map((d) =>
      deleteDoc(doc(db, "mesas", mesaSeleccionada.id, "pedido", d.id))
    );

    await Promise.all(deletes);

    // 🔥 limpiar contexto
    await clearMesa(false);

    setModalOpen(false);

  } catch (error) {
    console.error("Error liberando mesa:", error);
  }
};

  const abrirPago = () => {
    setModalOpen(false); // 🔥 cerrar modal anterior
    setModalPagoOpen(true);
  };


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const userRole = docSnap.data().role;
          setRole(userRole);
        }
      } catch (error) {
        console.error("Error obteniendo rol:", error);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setRole(docSnap.data().role);
        }

        setUserReady(true); // 🔥 CLAVE
      } catch (error) {
        console.error("Error obteniendo rol:", error);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const total = mesaSeleccionada?.total || 0;
    const pagoNum = parseFloat(pago) || 0;

    const calculo = pagoNum - total;
    setVuelto(calculo > 0 ? calculo : 0);
  }, [pago, mesaSeleccionada]);
  
  // 🟢 COBRAR
  const confirmarCobro = async () => {
    if (!mesaSeleccionada) return;

    const total = mesaSeleccionada.total || 0;
    const pagoNum = parseFloat(pago) || 0;

    if (pagoNum < total) {
      alert("El monto es insuficiente");
      return;
    }

    try {
      const pedidoRef = collection(db, "mesas", mesaSeleccionada.id, "pedido");
      const snapshot = await getDocs(pedidoRef);

      let totalReal = 0;

      // 🔹 Generar array de items con cantidad y total
      const items = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const quantity = data.quantity || 1;
        const total = data.total || (data.price * quantity);

        totalReal += total;

        return {
          name: data.name,
          price: data.price,
          quantity,
          total,
        };
      });

      const now = new Date();

      // 🔹 Guardar cobro con detalle de productos
      await addDoc(collection(db, "cobros"), {
        mesa: mesaSeleccionada.numero,
        sector: mesaSeleccionada.sector,
        total: totalReal,
        pago: parseFloat(pago),
        vuelto,
        fecha: now.toLocaleDateString("es-AR"),
        hora: now.toLocaleTimeString("es-AR"),
        items, // 🔥 Aquí se guardan los productos
      });

      // 🔹 Borrar pedido de la mesa
      const deletes = snapshot.docs.map((d) =>
        deleteDoc(doc(db, "mesas", mesaSeleccionada.id, "pedido", d.id))
      );
      await Promise.all(deletes);

      // 🔥 Limpiar contexto
      await clearMesa(true);

      // 🔹 Reset UI
      setModalPagoOpen(false);
      setModalOpen(false);
      setPago("");
      setVuelto(0);

    } catch (error) {
      console.error("Error cobrando:", error);
    }
  };

  const cerrarPago = () => {
    setModalPagoOpen(false);
    setPago("");
    setVuelto(0);
  };

  useEffect(() => {
    if (!userReady) return; // 🔥 BLOQUEA ejecución

    const ref = collection(db, "mesas");

    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const mesasData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        pedido: [],
        total: 0,
        cantidad: 0,
      }));

      setMesas(mesasData);

      mesasData.forEach((mesa) => {
        const pedidoRef = collection(db, "mesas", mesa.id, "pedido");

        onSnapshot(pedidoRef, (pedidoSnap) => {
          let total = 0;
          let cantidad = 0;
          let productos = [];

          pedidoSnap.forEach((doc) => {
            const data = doc.data();

            total += data.total || 0;
            cantidad += data.quantity || 0;

            productos.push({
              id: doc.id,
              ...data,
            });
          });

          setMesas((prev) =>
            prev.map((m) =>
              m.id === mesa.id
                ? { ...m, pedido: productos, total, cantidad }
                : m
            )
          );
        });
      });
    });

    return () => unsubscribe();
  }, [userReady]); // 🔥 DEPENDENCIA

  const mesasOrdenadas = [...mesas].sort((a, b) => {
    const sectorA = a.sector?.toLowerCase() || "";
    const sectorB = b.sector?.toLowerCase() || "";

    if (sectorA < sectorB) return -1;
    if (sectorA > sectorB) return 1;

    return Number(a.numero) - Number(b.numero);
  });

  const imprimirTicket = (mesa) => {
    const ventana = window.open("", "PRINT", "height=600,width=300");

    const ahora = new Date().toLocaleString();

    const ticketCocina = `
    <div class="ticket">
      <h2>👨‍🍳 COCINA</h2>
      <h3>Mesa ${mesa.numero}</h3>
      <p>${mesa.sector}</p>
      <p>${ahora}</p>
      <hr/>

      ${mesa.pedido
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

      ${mesa.pedido
        .map(
          (p) => `
            <div class="item">
              <span>${p.name} x${p.quantity}</span>
              <span>$${p.total}</span>
            </div>
          `
        )
        .join("")}

      <div class="total">
        TOTAL: $${mesa.total}
      </div>

      <p style="text-align:center;">---------------------------</p>
    </div>
  `;

    const contenido = `
    <html>
      <head>
        <title>Ticket</title>
        <style>
          body {
            font-family: monospace;
            width: 220px;
            padding: 5px;
          }

          .ticket {
            margin-bottom: 20px;
          }

          h2, h3, p {
            margin: 4px 0;
            text-align: center;
          }

          .item {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
          }

          .total {
            border-top: 1px dashed black;
            margin-top: 10px;
            padding-top: 5px;
            font-size: 16px;
            text-align: center;
          }

          hr {
            border: none;
            border-top: 1px dashed black;
            margin: 5px 0;
          }
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

  const enviarPedido = async (mesa) => {
    try {

      imprimirTicket(mesa);

    } catch (error) {
      console.error("Error enviando pedido:", error);
    }
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <h1>Mesas</h1>
      </header>

      <div className={styles.section}>
        <h2>Pedidos en tiempo real</h2>

        <div className={styles.grid}>
          {mesasOrdenadas.map((mesa, index) => {
            const isOcupada = mesa.cantidad > 0;

            const sectorActual = mesa.sector?.toLowerCase() || "";
            const sectorAnterior =
              mesasOrdenadas[index - 1]?.sector?.toLowerCase() || "";

            const cambioDeSector = index === 0 || sectorActual !== sectorAnterior;

            return (
              <React.Fragment key={mesa.id}>

                {cambioDeSector && (
                  <div className={styles.divisorSector}>
                    {sectorActual.includes("aden")
                      ? "🪑 adentro"
                      : "🌙 afuera"}
                  </div>
                )}

                <div className={`${styles.card} ${isOcupada ? styles.ocupada : styles.libre}`}>
                  <h3 className={styles.title}>
                    Mesa {mesa.numero} ({mesa.sector})
                  </h3>

                  <p className={isOcupada ? styles.estadoOcupada : styles.estadoLibre}>
                    {isOcupada ? "🔴 Ocupada" : "🟢 Libre"}
                  </p>

                  <hr className={styles.divider} />

                  {mesa.pedido.length === 0 ? (
                    <p className={styles.empty}>Sin productos</p>
                  ) : (
                    <>
                      {mesa.pedido.map((prod) => (
                        <div key={prod.id} className={styles.item}>
                          <span className={styles.deleteProdBtn}>✖</span>
                          <span>{prod.nombre}</span>
                          <span>{formatARS(prod.total)}</span>
                        </div>
                      ))}

                      <hr className={styles.divider} />

                      <h2 className={styles.total}>
                        {formatARS(mesa.total)}
                      </h2>

                      <button
                        className={styles.sendBtn}
                        onClick={() => enviarPedido(mesa)}
                      >
                        🧾 Enviar pedido
                      </button>

                      {(role?.toLowerCase().trim() === "jefe" || role?.toLowerCase().trim() === "cajero") && (
                        <button
                          className={styles.payBtn}
                          onClick={() => abrirModal(mesa)}
                        >
                          💰 Cobrar / Liberar
                        </button>
                      )}
                    </>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* <main className={styles.main}>
        <SelectMesa />
      </main> */}

      {/* MODAL */}
      {modalOpen && (role?.toLowerCase().trim() === "jefe" || role?.toLowerCase().trim() === "cajero") && (
        <div className={styles.modalOverlay} onClick={cerrarModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>¿Qué querés hacer?</h2>

            <div className={styles.actions}>
              <button
                className={styles.btnCobrar}
                onClick={abrirPago}
              >
                💰 Cobrar mesa
              </button>

              <button
                className={styles.btnLiberar}
                onClick={liberarMesa}
              >
                ❌ Liberar mesa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAGO */}
      {modalPagoOpen && (
        <div className={styles.modalOverlay} onClick={cerrarPago}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Total: {formatARS(mesaSeleccionada?.total)}</h2>

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
              <button style={{background:"green"}} onClick={confirmarCobro}>Confirmar cobro</button>
              <button onClick={cerrarPago}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};