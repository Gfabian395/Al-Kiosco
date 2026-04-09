import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, addDoc, query, where, getDocs, updateDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import styles from "../components/styles/Perfil.module.css";

export const Perfil = () => {
  const [userAuth, setUserAuth] = useState(null);
  const [userData, setUserData] = useState(null);
  const [turno, setTurno] = useState(null);
  const [totalCaja, setTotalCaja] = useState(0);

  const formatARS = (v) =>
    `$${(v || 0).toLocaleString("es-AR")}`;

  const getFechaHora = () => {
    const now = new Date();
    return {
      fecha: now.toLocaleDateString("es-AR"),
      hora: now.toLocaleTimeString("es-AR"),
    };
  };

  // 🔹 USER
  useEffect(() => {
    const u = auth.currentUser;
    if (u) {
      setUserAuth(u);
      obtenerUserData(u.uid);
      obtenerTurnoActivo(u.uid);
    }
  }, []);

  const obtenerUserData = async (uid) => {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) setUserData(snap.data());
  };

  const obtenerTurnoActivo = async (uid) => {
    const q = query(
      collection(db, "turnos"),
      where("userId", "==", uid),
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

  // 💰 CAJA (sigue siendo global por ahora)
  useEffect(() => {
    const fetchCaja = async () => {
      const snapshot = await getDocs(collection(db, "cobros"));

      const total = snapshot.docs.reduce(
        (acc, d) => acc + (d.data().total || 0),
        0
      );

      setTotalCaja(total);
    };

    fetchCaja();
  }, []);

  // 🟢 INICIAR TURNO
  const iniciarTurno = async () => {
    if (!userAuth || !userData || turno) return;

    const { fecha, hora } = getFechaHora();

    // Dentro de iniciarTurno:
const nuevoTurno = {
  userId: userAuth.uid,
  nombre: userData.name,
  email: userData.email,
  rol: userData.role,
  inicio: serverTimestamp(), // <-- reemplazar new Date()
  fin: null,
  cajaInicial: totalCaja,
  cajaFinal: 0,
  activo: true,
};

    const docRef = await addDoc(collection(db, "turnos"), nuevoTurno);

    // 🔥 MOVIMIENTO DE CAJA (APERTURA)
    await addDoc(collection(db, "movimientosCaja"), {
      tipo: "apertura",
      monto: totalCaja,
      descripcion: "Inicio de turno",
      userId: userAuth.uid,
      userName: userData.name,
      turnoId: docRef.id,
      fecha,
      hora,
      createdAt: new Date(),
    });

    setTurno({
      id: docRef.id,
      ...nuevoTurno,
    });

    imprimirTicket("INICIO", totalCaja, 0);
  };

  // 🔴 FINALIZAR TURNO
  const finalizarTurno = async () => {
    if (!turno) return;

    const { fecha, hora } = getFechaHora();

    const ref = doc(db, "turnos", turno.id);

    await updateDoc(ref, {
      fin: new Date(),
      cajaFinal: totalCaja,
      activo: false,
    });

    const diferencia = totalCaja - turno.cajaInicial;

    // 🔥 MOVIMIENTO DE CAJA (CIERRE)
    await addDoc(collection(db, "movimientosCaja"), {
      tipo: "cierre",
      monto: totalCaja,
      descripcion: "Cierre de turno",
      userId: userAuth.uid,
      userName: userData.name,
      turnoId: turno.id,
      fecha,
      hora,
      createdAt: new Date(),
    });

    imprimirTicket("CIERRE", totalCaja, diferencia);

    setTurno(null);
  };

  // 🧾 PRINT MEJORADO
  const imprimirTicket = (tipo, monto, ganancia) => {
    const contenido = `
      <div style="font-family: monospace; width: 220px; text-align:center;">
        <h3>AL-KIOSCO</h3>
        <p>${tipo} DE TURNO</p>
        <p>${new Date().toLocaleString()}</p>

        <hr/>

        <p><strong>${userData?.name}</strong></p>
        <p>${userData?.role}</p>

        <hr/>

        ${
          tipo === "CIERRE"
            ? `
          <p>Inicial: ${formatARS(turno?.cajaInicial)}</p>
          <p>Final: ${formatARS(monto)}</p>
          <p>Ganancia: ${formatARS(ganancia)}</p>
        `
            : `<h2>${formatARS(monto)}</h2>`
        }

        <hr/>
        <p>Gracias</p>
      </div>
    `;

    const win = window.open("", "", "width=300,height=600");
    win.document.write(contenido);
    win.document.close();
    win.print();
  };

  const diferencia =
    turno && turno.cajaInicial
      ? totalCaja - turno.cajaInicial
      : 0;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>👤 Perfil</h2>

      {/* 👤 INFO */}
      <div className={styles.card}>
        <h3>Información</h3>

        <div className={styles.infoRow}>
          <span className={styles.label}>Nombre</span>
          <span className={styles.value}>
            {userData?.name || "-"}
          </span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.label}>Email</span>
          <span className={styles.value}>
            {userData?.email || "-"}
          </span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.label}>Rol</span>
          <span className={styles.value}>
            {userData?.role || "-"}
          </span>
        </div>
      </div>

      {/* 💰 CAJA */}
      {/* <div className={`${styles.card} ${styles.caja}`}>
        <h3>💰 Caja actual</h3>
        <div className={styles.total}>
          {formatARS(totalCaja)}
        </div>
      </div> */}

      {/* 🔄 TURNO */}
      <div className={styles.card}>
        <h3>Turno</h3>

        <p className={turno ? styles.turnoActivo : styles.turnoInactivo}>
          {turno ? "🟢 Activo" : "Sin turno activo"}
        </p>

        {turno && (
          <div className={styles.turnoData}>
            <p>
  <strong>Inicio:</strong>{" "}
  {turno?.inicio?.toDate
    ? turno.inicio.toDate().toLocaleString("es-AR")
    : "-"}
</p>

            <p>
              <strong>Caja inicial:</strong>{" "}
              {formatARS(turno.cajaInicial)}
            </p>

            <p>
              <strong>Generado:</strong>{" "}
              {formatARS(diferencia)}
            </p>
          </div>
        )}
      </div>

      {/* 🔘 BOTONES */}
      <div className={styles.actions}>
        <button
          className={`${styles.btn} ${styles.start}`}
          onClick={iniciarTurno}
          disabled={!!turno}
        >
          🟢 Iniciar turno
        </button>

        <button
          className={`${styles.btn} ${styles.end}`}
          onClick={finalizarTurno}
          disabled={!turno}
        >
          🔴 Finalizar turno
        </button>
      </div>
    </div>
  );
};