import { useState } from "react";
import { useCart } from "../context/CartContext";
import styles from "./styles/CardProduct.module.css";

const CardProduct = ({
  name = "Veggie Burguer",
  description = "Delicious burger",
  ingredients = "Onion, Lettuce, Tomato, Patty, Cheese",
  price = 5,
  image = "https://firebasestorage.googleapis.com/v0/b/al-kiosco.firebasestorage.app/o/products%2F1773621820710-descarga.jpg?alt=media&token=eebd8f3c-3b30-49cc-8a70-ad6901e1b8a2",
}) => {
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState(false);
  const { mesa, addToCart } = useCart();

  const total = price * qty;

  const increase = () => setQty(qty + 1);
  const decrease = () => qty > 1 && setQty(qty - 1);

  const handleAdd = () => {
    addToCart({ name, description, ingredients, price, quantity: qty, total, image });
    setQty(1);
  };

  return (
    <>
      <div className={styles.container}>
        <img src={image} alt={name} onClick={() => setOpen(true)} className={styles.image} />
        <div className={styles.contentBox}>
          <h4>{name}</h4>
          <p>{description}</p>
          <p>{ingredients}</p>

          <div className={styles.counter}>
            <button onClick={decrease}>-</button>
            <span>{qty}</span>
            <button onClick={increase}>+</button>
          </div>

          <div className={styles.btn}>
            <h2>$ {total}</h2>
            <button onClick={handleAdd}>Agregar</button>
          </div>
        </div>
      </div>

      {open && (
        <div className={styles.modal} onClick={() => setOpen(false)}>
          <img src={image} alt={name} className={styles.modalImg} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
};

export default CardProduct;