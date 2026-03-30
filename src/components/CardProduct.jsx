import { useState } from "react";
import { useCart } from "../context/CartContext";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import styles from "./styles/CardProduct.module.css";

// 🔹 Asegurate de tener boxicons importados en tu index.html o App
// <link href='https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css' rel='stylesheet' />

const CardProduct = ({
  id,
  name = "Veggie Burguer",
  description = "Delicious burger",
  ingredients = "Onion, Lettuce, Tomato, Patty, Cheese",
  price = 5,
  image = "https://firebasestorage.googleapis.com/v0/b/al-kiosco.firebasestorage.app/o/products%2F1773621820710-descarga.jpg?alt=media&token=eebd8f3c-3b30-49cc-8a70-ad6901e1b8a2",
}) => {
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [editedDescription, setEditedDescription] = useState(description);
  const [editedIngredients, setEditedIngredients] = useState(ingredients);
  const [editedPrice, setEditedPrice] = useState(price);

  const { mesaId, addToCart } = useCart();

  const total = price * qty;
  const formatARS = (valor) => `$${(valor || 0).toLocaleString("es-AR")}`;

  const increase = () => setQty((prev) => prev + 1);
  const decrease = () => setQty((prev) => (prev > 1 ? prev - 1 : 1));

  const handleAdd = async () => {
    if (!mesaId) {
      alert("Seleccioná una mesa primero");
      return;
    }

    try {
      await addToCart({
        name,
        description,
        ingredients,
        price,
        image,
        quantity: qty,
      });
      setQty(1);
    } catch (error) {
      console.error("Error agregando producto:", error);
      alert("Error al agregar producto");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("¿Seguro que querés eliminar este producto?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      alert("Producto eliminado");
    } catch (error) {
      console.error("Error eliminando producto:", error);
      alert("Error al eliminar producto");
    }
  };

  const handleEdit = async () => {
    try {
      const productRef = doc(db, "products", id);
      await updateDoc(productRef, {
        name: editedName,
        description: editedDescription,
        ingredients: editedIngredients,
        price: Number(editedPrice),
      });
      alert("Producto actualizado");
      setEditMode(false);
    } catch (error) {
      console.error("Error editando producto:", error);
      alert("Error al actualizar producto");
    }
  };

  return (
    <>
      <div className={styles.container}>
        {/* BOTONES ADMIN */}
        {!editMode && (
          <>
            <i
              className={`bx bx-trash ${styles.deleteIcon}`}
              onClick={handleDelete}
              title="Eliminar"
            />
            <i
              className={`bx bx-edit ${styles.editIcon}`}
              onClick={() => setEditMode(true)}
              title="Editar"
            />
          </>
        )}

        {/* IMAGEN */}
        <img
          src={image}
          alt={name}
          onClick={() => setOpen(true)}
          className={styles.image}
        />

        {/* CONTENIDO */}
        <div className={styles.contentBox}>
          <>
            <h4 className={styles.name}>{name}</h4>
            <p>{description}</p>
            <p className={styles.ingredients}>{ingredients}</p>

            {/* CONTADOR */}
            <div className={styles.counter}>
              <button onClick={decrease}>-</button>
              <span>{qty}</span>
              <button onClick={increase}>+</button>
            </div>

            {/* PRECIO + AGREGAR */}
            <div className={styles.btn}>
              <h2>{formatARS(total)}</h2>
              <button onClick={handleAdd}>Agregar</button>
            </div>
          </>
        </div>
      </div>

      {/* MODAL IMAGEN */}
      {open && (
        <div className={styles.modal} onClick={() => setOpen(false)}>
          <img
            src={image}
            alt={name}
            className={styles.modalImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* 🔥 MODAL EDITAR */}
      {editMode && (
        <div
          className={styles.editModal}
          onClick={() => setEditMode(false)}
        >
          <div
            className={styles.editContent}
            onClick={(e) => e.stopPropagation()}
          >

            <h3>Editar producto</h3>

            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              placeholder="Nombre"
            />

            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              placeholder="Descripción"
            />

            <textarea
              value={editedIngredients}
              onChange={(e) => setEditedIngredients(e.target.value)}
              placeholder="Ingredientes"
            />

            <input
              type="number"
              value={editedPrice}
              onChange={(e) => setEditedPrice(e.target.value)}
              placeholder="Precio"
            />

            <div className={styles.editActions}>
              <button
                className={styles.saveBtn}
                onClick={handleEdit}
              >
                Guardar
              </button>

              <button
                className={styles.cancelBtn}
                onClick={() => setEditMode(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CardProduct;