import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, deleteDoc, getDocs, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useCart } from "../context/CartContext";
import styles from "./styles/SelectMesa.module.css";

const SelectMesa = () => {
  const { mesaId, setMesa } = useCart();
  const [mesas, setMesas] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [numero, setNumero] = useState("");
  const [sector, setSector] = useState("adentro");

  // 🔹 Traer mesas en tiempo real
  useEffect(() => {
    const ref = collection(db, "mesas");

    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      data.sort((a, b) => a.numero - b.numero);
      setMesas(data);
    });

    return () => unsubscribe();
  }, []);

  const mesasAdentro = mesas.filter((m) => m.sector === "adentro");
  const mesasAfuera = mesas.filter((m) => m.sector === "afuera");

  // 🔹 Agregar mesa con validación
  const handleAddMesa = async () => {
    if (!numero) return alert("Poné un número de mesa");

    try {
      // 🔥 validar que no exista
      const snapshot = await getDocs(collection(db, "mesas"));
      const existe = snapshot.docs.find(
        (doc) =>
          doc.data().numero === Number(numero) &&
          doc.data().sector === sector
      );

      if (existe) {
        return alert("Ya existe una mesa con ese número");
      }

      await addDoc(collection(db, "mesas"), {
        numero: Number(numero),
        ocupada: false,
        sector,
      });

      setNumero("");
      setSector("adentro");
      setModalOpen(false);
    } catch (error) {
      console.error("Error agregando mesa:", error);
      alert("Error al crear mesa");
    }
  };

  const handleDeleteMesa = async (id) => {
    const confirmDelete = confirm("¿Eliminar esta mesa?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "mesas", id));
    } catch (error) {
      console.error("Error eliminando mesa:", error);
      alert("Error al eliminar mesa");
    }
  };

  // 🔹 Renderizar mesas
  const renderMesas = (lista, tipo) => (
    <div className={styles.section}>
      <h3 className={styles.title}>
        {tipo === "adentro" ? "🟢 adentro" : "🌙 afuera"}
      </h3>

      <div className={styles.grid}>
        {lista.map((m) => (
          <div key={m.id} className={styles.mesaWrapper}>

            {/* 🔹 BOTÓN MESA */}
            <button
              className={`${styles.mesa} 
              ${mesaId === m.id ? styles.selected : ""} 
              ${m.ocupada ? styles.ocupada : styles.libre}`}
              onClick={() => {
                if (mesaId === m.id) {
                  setMesa(null);      // 🔥 resetea
                  setTimeout(() => {
                    setMesa(m.id);    // 🔥 vuelve a setear → dispara el useEffect
                  }, 0);
                } else {
                  setMesa(m.id);
                }
              }}
            >
              {m.numero}
            </button>

            {/* 🔥 BOTÓN ELIMINAR */}
            <button
              className={styles.deleteBtn}
              onClick={() => handleDeleteMesa(m.id)}
            >
              ✕
            </button>

          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div className={styles.container}>
        {renderMesas(mesasAdentro, "adentro")}
        {renderMesas(mesasAfuera, "afuera")}

        {/* 🔥 BOTON + BIEN POSICIONADO */}
        <button
          className={styles.addBtn}
          onClick={() => setModalOpen(true)}
        >
          +
        </button>
      </div>

      {/* 🔥 MODAL */}
      {modalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setModalOpen(false)}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Nueva Mesa</h2>

            <input
              type="number"
              placeholder="Número de mesa"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />

            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
            >
              <option value="adentro">Salón (adentro)</option>
              <option value="afuera">Exterior</option>
            </select>

            <div className={styles.actions}>
              <button onClick={handleAddMesa}>
                Guardar
              </button>

              <button onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SelectMesa;