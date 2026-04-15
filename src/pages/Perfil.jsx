import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp
} from "firebase/firestore";
import styles from "../components/styles/Perfil.module.css";

export const Perfil = () => {
  const [userAuth, setUserAuth] = useState(null);
  const [userData, setUserData] = useState(null);
  const [turno, setTurno] = useState(null);
  const [totalCaja, setTotalCaja] = useState(0);
  const [cajaInicialManual, setCajaInicialManual] = useState('');

  const cajaInicial = Number(cajaInicialManual) || 0;

  const esAdmin =
    userData?.role === "jefe" ||
    userData?.role === "encargado";

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

  // 💰 CAJA
  useEffect(() => {
    if (!turno?.id) return;

    const fetchCaja = async () => {
      const q = query(
        collection(db, "cobros"),
        where("turnoId", "==", turno.id)
      );

      const snapshot = await getDocs(q);

      const total = snapshot.docs.reduce((acc, d) => {
        const data = d.data();

        const totalCobro = (data.items || []).reduce((sum, item) => {
          const cantidad = item.quantity || item.cantidad || 1;
          const precio = item.unitPrice || item.price || item.precio || 0;
          return sum + cantidad * precio;
        }, 0);

        return acc + totalCobro;
      }, 0);

      setTotalCaja(total);
    };

    fetchCaja();
  }, [turno?.id]);

  // 💸 RETIRO COMPLETO (MEJORADO)
  const registrarRetiro = async (monto, destinatario) => {
    if (!esAdmin) return;

    if (!monto || monto <= 0) {
      alert("Monto inválido");
      return;
    }

    if (!destinatario || destinatario.trim() === "") {
      alert("Debes indicar quién retira el dinero");
      return;
    }

    const { fecha, hora } = getFechaHora();

    await addDoc(collection(db, "movimientosCaja"), {
      tipo: "retiro",
      monto,
      descripcion: "Retiro de efectivo",
      retiradoPor: destinatario, // 👈 NUEVO
      entregadoPor: userData.name, // 👈 NUEVO (quien entrega)
      userId: userAuth.uid,
      userName: userData.name,
      fecha,
      hora,
      createdAt: serverTimestamp(),
    });

    alert(`💸 Retiro registrado: $${monto}`);
  };

  // 🟢 INICIAR TURNO
  const iniciarTurno = async () => {
    if (!userAuth || !userData) return;

    if (turno) {
      alert("⚠️ Ya hay un turno activo");
      return;
    }

    if (esAdmin && cajaInicial <= 0) {
      alert("⚠️ Debes ingresar una caja inicial mayor a 0");
      return;
    }

    const { fecha, hora } = getFechaHora();

    const nuevoTurno = {
      userId: userAuth.uid,
      nombre: userData.name,
      email: userData.email,
      rol: userData.role,
      inicio: serverTimestamp(),
      fin: null,
      cajaInicial: esAdmin ? cajaInicial : 0,
      cajaFinal: 0,
      activo: true,
    };

    const docRef = await addDoc(collection(db, "turnos"), nuevoTurno);

    await addDoc(collection(db, "movimientosCaja"), {
      tipo: "apertura",
      monto: esAdmin ? cajaInicial : 0,
      descripcion: "Inicio de turno",
      userId: userAuth.uid,
      userName: userData.name,
      turnoId: docRef.id,
      fecha,
      hora,
      createdAt: serverTimestamp(),
    });

    setTurno({ id: docRef.id, ...nuevoTurno });

    alert(`🟢 Turno iniciado`);
  };

  // 🔴 FINALIZAR TURNO
  const finalizarTurno = async () => {
    if (!turno) {
      alert("⚠️ No hay turno activo");
      return;
    }

    const { fecha, hora } = getFechaHora();

    const refTurno = doc(db, "turnos", turno.id);

    const ganancia =
      totalCaja - Number(turno.cajaInicial || 0);

    await updateDoc(refTurno, {
      fin: serverTimestamp(),
      cajaFinal: totalCaja,
      activo: false,
    });

    await addDoc(collection(db, "movimientosCaja"), {
      tipo: "cierre",
      monto: totalCaja,
      ganancia,
      descripcion: "Cierre de turno",
      userId: userAuth.uid,
      userName: userData.name,
      turnoId: turno.id,
      fecha,
      hora,
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(db, "cajaDiaria"), {
      fecha,
      inicioCaja: turno.cajaInicial,
      cierreCaja: totalCaja,
      ventas: ganancia,
      userId: userAuth.uid,
      userName: userData.name,
      turnoId: turno.id,
      createdAt: serverTimestamp(),
    });

    setTurno(null);
    setTotalCaja(0);
    setCajaInicialManual(0);

    alert(`🔴 Turno cerrado`);
  };

  const diferencia =
    totalCaja - Number(turno?.cajaInicial || 0);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>👤 Perfil</h2>

      {/* INFO */}
      <div className={styles.card}>
        <h3>Información</h3>
        <p>{userData?.name}</p>
        <p>{userData?.email}</p>
        <p>{userData?.role}</p>
      </div>

      {/* TURNO */}
      <div className={styles.card}>
        <h3>Turno</h3>

        <p>{turno ? "🟢 Activo" : "Sin turno activo"}</p>

        {turno && (
          <>
            <p>
              Inicio:{" "}
              {turno?.inicio?.toDate?.().toLocaleString("es-AR")}
            </p>

            <p>
              Caja inicial: {formatARS(turno.cajaInicial)}
            </p>

            <p>
              Generado: {formatARS(diferencia)}
            </p>
          </>
        )}
      </div>

      {/* BOTONES */}
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

      {/* 💰 CAJA INICIAL */}
      {!turno && esAdmin && (
        <div className={styles.card}>
          <h3>💰 Inicio de caja</h3>

          <input
            type="number"
            value={cajaInicialManual}
            onChange={(e) =>
              setCajaInicialManual(Number(e.target.value))
            }
            placeholder="Monto inicial en $"
          />
        </div>
      )}

      {/* 💸 RETIRO MEJORADO */}
      {esAdmin && (
        <div className={styles.card}>
          <h3>💸 Retiro de efectivo</h3>

          <button
            onClick={() => {
              const monto = Number(prompt("Monto a retirar:"));
              const persona = prompt("¿Quién retira el dinero?");
              registrarRetiro(monto, persona);
            }}
          >
            Registrar retiro
          </button>
        </div>
      )}
    </div>
  );
};