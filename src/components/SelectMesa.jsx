import { useCart } from "../context/CartContext";
import styles from "./styles/SelectMesa.module.css";

const mesasData = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  ocupada: false, // lo puedes actualizar si quieres mostrar ocupadas
}));

const SelectMesa = () => {
  const { mesa, setMesa } = useCart();

  return (
    <div className={styles.container}>
      {mesasData.map((m) => (
        <button
          key={m.id}
          className={`${styles.mesa} ${mesa === m.id ? styles.selected : ""} ${
            m.ocupada ? styles.ocupada : ""
          }`}
          disabled={m.ocupada}
          onClick={() => setMesa(m.id)}
        >
          Mesa {m.id}
        </button>
      ))}
    </div>
  );
};

export default SelectMesa;