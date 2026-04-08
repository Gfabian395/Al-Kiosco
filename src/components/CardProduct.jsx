import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { doc, deleteDoc, updateDoc, onSnapshot, runTransaction } from "firebase/firestore";
import { db } from "../firebase";
import styles from "./styles/CardProduct.module.css";

const CardProduct = ({
  categoryId,
  id,
  name,
  description,
  ingredients,
  price,
  image,
  stock = 0,
  role
}) => {
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [editedName, setEditedName] = useState(name || "");
  const [editedDescription, setEditedDescription] = useState(description || "");
  const [editedIngredients, setEditedIngredients] = useState(ingredients || "");
  const [editedPrice, setEditedPrice] = useState(price || 0);
  const [editedStock, setEditedStock] = useState(stock || 0);

  const [currentStock, setCurrentStock] = useState(stock || 0); // stock actualizado en tiempo real

  const { mesaId, addToCart } = useCart();

  const total = (price || 0) * qty;
  const formatARS = (valor) => `$${(valor || 0).toLocaleString("es-AR")}`;

  const increase = () => setQty((prev) => prev + 1);
  const decrease = () => setQty((prev) => (prev > 1 ? prev - 1 : 1));

  // 🔹 Escucha cambios de stock en tiempo real
  useEffect(() => {
    const productRef = doc(db, "categories", categoryId, "products", id);
    const unsubscribe = onSnapshot(productRef, (snap) => {
      if (snap.exists()) {
        setCurrentStock(snap.data().stock ?? 0);
      }
    });
    return () => unsubscribe();
  }, [categoryId, id]);

  // 🔥 AGREGAR AL CARRITO (valida stock)
 const handleAdd = async () => {
  if (!mesaId) {
    alert("Seleccioná una mesa primero");
    return;
  }

  if (qty > currentStock) {
    alert(`No hay suficiente stock. Disponible: ${currentStock}`);
    return;
  }

  try {
    await addToCart({
      id,
      categoryId,
      name,
      description,
      ingredients,
      price,
      image,
      quantity: qty,
    });

    setQty(1);
  } catch (error) {
    console.error(error);
    alert("Error al agregar");
  }
};

  const handleDelete = async () => {
    if (!window.confirm("¿Seguro que querés eliminar este producto?")) return;
    try {
      await deleteDoc(doc(db, "categories", categoryId, "products", id));
      alert("Producto eliminado");
    } catch (error) {
      console.error("Error eliminando producto:", error);
      alert("Error al eliminar producto");
    }
  };

  // 🔥 EDITAR CON STOCK
  const handleEdit = async () => {
    try {
      if (!categoryId || !id) {
        alert("Falta categoryId o id");
        return;
      }

      const stockNum = Number(editedStock);

      if (isNaN(stockNum)) {
        alert("El stock debe ser un número");
        return;
      }

      if (stockNum < 0) {
        alert("El stock no puede ser negativo");
        return;
      }

      if (stockNum < 24) {
        const confirmar = window.confirm(
          "⚠️ Stock menor a 24 unidades. ¿Seguro querés guardar?"
        );
        if (!confirmar) return;
      }

      const productRef = doc(db, "categories", categoryId, "products", id);

      const data = {
        name: String(editedName || ""),
        description: String(editedDescription || ""),
        ingredients: String(editedIngredients || ""),
        price: Number(editedPrice) || 0,
        stock: stockNum,
      };

      await updateDoc(productRef, data);

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

        {image && (
          <img
            src={image}
            alt={name}
            onClick={() => setOpen(true)}
            className={styles.image}
          />
        )}

        <div className={styles.contentBox}>
          <h4 className={styles.name}>{name}</h4>
          <p>{description}</p>
          <p className={styles.ingredients}>{ingredients}</p>

          {/* 🔥 STOCK */}
          <p className={styles.stock}>Stock: {currentStock}</p>

          {currentStock < 24 && (
            <p className={styles.lowStock}>
              ⚠️ Stock bajo (mínimo 24)
            </p>
          )}

          {/* CONTADOR */}
          <div className={styles.counter}>
            <button onClick={decrease}>-</button>
            <span>{qty}</span>
            <button onClick={increase}>+</button>
          </div>

          <div className={styles.btn}>
            <h2>{formatARS(total)}</h2>
          </div>

          <button onClick={handleAdd}>Agregar</button>
        </div>
      </div>

      {/* MODAL IMAGEN */}
      {open && image && (
        <div className={styles.modal} onClick={() => setOpen(false)}>
          <img
            src={image}
            alt={name}
            className={styles.modalImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* MODAL EDITAR */}
      {editMode && (
        <div className={styles.editModal} onClick={() => setEditMode(false)}>
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

            {/* 🔥 INPUT STOCK */}
            <input
              type="number"
              value={editedStock}
              onChange={(e) => setEditedStock(e.target.value)}
              placeholder="Stock"
            />

            <div className={styles.editActions}>
              <button className={styles.saveBtn} onClick={handleEdit}>
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