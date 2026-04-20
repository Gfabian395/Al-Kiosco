import { useState, useEffect } from "react";
import styles from "./styles/Buscador.module.css";

const Buscador = ({ productos = [], onResultados }) => {
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const texto = busqueda.toLowerCase();

    const filtrados = productos.filter((prod) =>
      prod.name.toLowerCase().includes(texto)
    );

    onResultados(filtrados);
  }, [busqueda, productos, onResultados]);

  return (
    <div className={styles.container}>
      <input
        type="text"
        placeholder="Buscar producto..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className={styles.input}
      />
    </div>
  );
};

export default Buscador;