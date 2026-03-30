import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import styles from "../components/styles/Finanzas.module.css";

export const Finanzas = () => {
  const [cobros, setCobros] = useState([]);
  const formatARS = (valor) => `$${(valor || 0).toLocaleString("es-AR")}`;
  // 🔥 Traer cobros en tiempo real
  useEffect(() => {
    const ref = collection(db, "cobros");

    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Ordenar por más reciente
      data.sort(
        (a, b) =>
          new Date(b.fecha + " " + b.hora) - new Date(a.fecha + " " + a.hora)
      );

      setCobros(data);
    });

    return () => unsubscribe();
  }, []);

  // 🔥 Total general
  const totalGeneral = cobros.reduce((acc, c) => acc + (c.total || 0), 0);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>💰 Finanzas</h2>

      <div className={styles.totalBox}>Total: {formatARS(totalGeneral)}</div>

      {cobros.length === 0 ? (
        <p className={styles.empty}>No hay cobros registrados</p>
      ) : (
        <div className={styles.list}>
          {cobros.map((c) => (
            <div key={c.id} className={styles.card}>
              {/* HEADER */}
              <div className={styles.row}>
                <span>Mesa {c.mesa}</span>
                <span className={styles.total}>{formatARS(c.total)}</span>
              </div>

              <div className={styles.info}>
                <span>{c.sector}</span>
                <span>{c.fecha}</span>
                <span>{c.hora}</span>
              </div>

              <hr />

              {/* DETALLE DE PRODUCTOS */}
              {c.items?.length > 0 ? (
                <div className={styles.items}>
                  {c.items.map((item, i) => {
                    const cantidad = item.quantity || 1;
                    const totalItem = item.total || (item.price * cantidad);
                    return (
                      <div key={i} className={styles.itemRow}>
                        <span>
                          {item.name} x{cantidad}
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

              {/* PAGÓ Y VUELTO */}
              <div className={styles.extra}>
                <span>Pagó: {formatARS(c.pago || 0)}</span>
                <span>Vuelto: {formatARS(c.vuelto || 0)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};