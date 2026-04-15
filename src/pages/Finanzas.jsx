import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import styles from "../components/styles/Finanzas.module.css";

export const Finanzas = () => {
  const [cobros, setCobros] = useState([]);
  const [mesasLiberadas, setMesasLiberadas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const safeNumber = (n) => {
    const num = Number(n);
    return Number.isFinite(num) ? num : 0;
  };
  const formatARS = (valor) =>
    `$${(valor || 0).toLocaleString("es-AR")}`;

  // 🔥 Helper fechas
  const parseFecha = (f, h) => {
    if (!f || !h) return 0;
    const fecha = new Date(`${f} ${h}`);
    return isNaN(fecha) ? 0 : fecha.getTime();
  };

  // 🔵 COBROS
  useEffect(() => {
    const ref = collection(db, "cobros");

    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      data.sort(
        (a, b) => parseFecha(b.fecha, b.hora) - parseFecha(a.fecha, a.hora)
      );

      setCobros(data);
    });

    return () => unsubscribe();
  }, []);

  // 🟢 MESAS LIBERADAS
  useEffect(() => {
    const ref = collection(db, "mesasLiberadas");

    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      data.sort(
        (a, b) => parseFecha(b.fecha, b.hora) - parseFecha(a.fecha, a.hora)
      );

      setMesasLiberadas(data);
    });

    return () => unsubscribe();
  }, []);

  // 🔥 MOVIMIENTOS DE CAJA (NUEVO)
  useEffect(() => {
    const ref = collection(db, "movimientosCaja");

    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      data.sort(
        (a, b) =>
          (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );

      setMovimientos(data);
    });

    return () => unsubscribe();
  }, []);

  // 🔥 TOTALES REALES
  // 🔥 INGRESOS (ventas manuales o extra)
  const ingresos = movimientos
    .filter((m) => m.tipo === "ingreso")
    .reduce((acc, m) => acc + (m.monto || 0), 0);

  // 🔥 EGRESOS (gastos)
  const egresos = movimientos
    .filter((m) => m.tipo === "egreso")
    .reduce((acc, m) => acc + (m.monto || 0), 0);

  // 🔥 RETIROS (dinero sacado de caja)
  const retiros = movimientos
    .filter((m) => m.tipo === "retiro")
    .reduce((acc, m) => acc + (m.monto || 0), 0);

  // 🔥 APERTURA (dinero inicial de caja)
  const aperturaTotal = movimientos
    .filter((m) => m.tipo === "apertura")
    .reduce((acc, m) => acc + (m.monto || 0), 0);

  const totalGeneral = cobros.reduce((acc, c) => {
    const totalCobro = (c.items || []).reduce((sum, item) => {
      const cantidad = item.quantity || item.cantidad || 1;
      const precio = item.unitPrice || item.price || item.precio || 0;
      return sum + cantidad * precio;
    }, 0);

    return acc + totalCobro;
  }, 0);

  // 🔥 CAJA REAL
  const cajaReal =
  aperturaTotal + totalGeneral - egresos - retiros;

  return (
    <div className={styles.container}>

      {/* 💰 RESUMEN CAJA REAL */}
      {/* <div className={styles.section}>
        <h2 className={styles.title}>📊 Caja (Control Total)</h2>

        <div className={styles.totalBox}>
          <p>Ingresos: {formatARS(ingresos)}</p>
          <p>Egresos: {formatARS(egresos)}</p>
          <h3>Caja real: {formatARS(cajaReal)}</h3>
        </div>
      </div> */}
      <div className={styles.section}>
        <h2 className={styles.title}>📊 Resumen de Caja Real</h2>

        <div className={styles.totalBox}>
          <p>Ventas: {formatARS(totalGeneral)}</p>
          <p>Apertura: {formatARS(aperturaTotal)}</p>
          <p>Retiros: {formatARS(-retiros)}</p>
          <h3>Caja real: {formatARS(cajaReal)}</h3>
        </div>
      </div>


      {/* 🧾 MOVIMIENTOS */}
      <div className={styles.section}>
        <h2 className={styles.title}>🧾 Movimientos de Caja</h2>

        {movimientos.length === 0 ? (
          <p className={styles.empty}>No hay movimientos</p>
        ) : (
          <div className={styles.list}>
            {movimientos.map((m) => (
              <div key={m.id} className={styles.card}>

                <div className={styles.row}>
                  <span>
                    {m.tipo === "apertura" && "🟢 APERTURA"}
                    {m.tipo === "cierre" && "🔴 CIERRE"}
                    {m.tipo === "ingreso" && "💰 INGRESO"}
                    {m.tipo === "egreso" && "📤 EGRESO"}
                  </span>

                  <span className={styles.total}>
                    {formatARS(m.monto)}
                  </span>
                </div>

                <div className={styles.info}>
                  <span>{m.descripcion || "-"}</span>
                  <span>{m.userName || "-"}</span>
                  <span>{m.fecha} {m.hora}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔵 COBROS */}
      <div className={styles.section}>
        <h2 className={styles.title}>💰 Ventas</h2>

        <div className={styles.totalBox}>
          Total: {formatARS(totalGeneral)}
        </div>

        {cobros.length === 0 ? (
          <p className={styles.empty}>No hay cobros</p>
        ) : (
          <div className={styles.list}>
            {cobros.map((c) => {

              // 🔥 TOTAL REAL DEL COBRO (NO usar c.total)
              const totalCobro = (c.items || []).reduce((sum, item) => {
                const cantidad = item.quantity || item.cantidad || 1;
                const precio = item.unitPrice || item.price || item.precio || 0;
                return sum + cantidad * precio;
              }, 0);

              return (
                <div key={c.id} className={styles.card}>

                  <div className={styles.row}>
                    <span>Mesa {c.mesa}</span>

                    <span className={styles.total}>
                      {formatARS(totalCobro)}
                    </span>
                  </div>

                  <div className={styles.info}>
                    <span>{c.sector || "-"}</span>
                    <span>{c.fecha || "-"}</span>
                    <span>{c.hora || "-"}</span>
                  </div>

                  <hr />

                  {c.items && c.items.length > 0 ? (
                    <div className={styles.items}>
                      {c.items.map((item, i) => {
                        const cantidad = item.quantity || item.cantidad || 1;
                        const precio = item.unitPrice || item.price || item.precio || 0;

                        const totalItem = cantidad * precio;

                        return (
                          <div key={i} className={styles.itemRow}>
                            <span>
                              {item.name || item.nombre} x{cantidad}
                            </span>
                            <span>{formatARS(totalItem)}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className={styles.empty}>Sin detalle</p>
                  )}

                  <hr />

                  <div className={styles.extra}>
                    <span>Pagó: {formatARS(safeNumber(c.pago))}</span>
                    <span>Vuelto: {formatARS(safeNumber(c.vuelto))}</span>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🟢 MESAS LIBERADAS */}
      <div className={styles.section}>
        <h2 className={styles.title}>🪑 Mesas Liberadas</h2>

        {mesasLiberadas.length === 0 ? (
          <p className={styles.empty}>No hay mesas liberadas</p>
        ) : (
          <div className={styles.list}>
            {mesasLiberadas.map((m) => (
              <div key={m.id} className={styles.card}>

                <div className={styles.row}>
                  <span>Mesa {m.mesa}</span>
                  <span>{m.estado || "Liberada"}</span>
                </div>

                <div className={styles.info}>
                  <span>{m.sector || "-"}</span>
                  <span>{m.fecha || "-"}</span>
                  <span>{m.hora || "-"}</span>
                </div>

                <hr />

                {m.items && m.items.length > 0 ? (
                  <div className={styles.items}>
                    {m.items.map((item, i) => {
                      const cantidad = item.quantity || item.cantidad || 1;

                      // 🔥 SIEMPRE usar precio unitario real
                      const precio = item.unitPrice || item.price || item.precio || 0;

                      // ❌ ignorar item.total porque puede estar mal
                      const totalItem = precio * cantidad;

                      return (
                        <div key={i} className={styles.itemRow}>
                          <span>
                            {item.name || item.nombre} x{cantidad}
                          </span>
                          <span>{formatARS(totalItem)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className={styles.empty}>Sin consumo</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};