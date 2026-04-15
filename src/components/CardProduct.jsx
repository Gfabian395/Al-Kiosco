import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { doc, deleteDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
  const canEdit = role === "jefe" || role === "encargado";
  const [editedName, setEditedName] = useState(name || "");
  const [editedDescription, setEditedDescription] = useState(description || "");
  const [editedIngredients, setEditedIngredients] = useState(ingredients || "");
  const [editedPrice, setEditedPrice] = useState(price || 0);
  const [editedStock, setEditedStock] = useState(stock || 0);
  const [currentStock, setCurrentStock] = useState(stock || 0); // stock actualizado en tiempo real
  const [editedImageFile, setEditedImageFile] = useState(null);
  const [editedImagePreview, setEditedImagePreview] = useState(image || "");
  const { mesaId, addToCart } = useCart();

  const total = Number(editMode ? editedPrice : price) * qty;
  const formatARS = (valor) => `$${(valor || 0).toLocaleString("es-AR")}`;

  const increase = () => {
    if (qty >= currentStock) return;
    setQty((prev) => prev + 1);
  };
  const decrease = () => setQty((prev) => (prev > 1 ? prev - 1 : 1));

  // 🔹 Escucha cambios de stock en tiempo real
  useEffect(() => {
    if (!categoryId || !id) return; // 🔥 PROTECCIÓN

    const productRef = doc(db, "categories", categoryId, "products", id);

    const unsubscribe = onSnapshot(productRef, (snap) => {
      if (snap.exists()) {
        setCurrentStock(snap.data().stock ?? 0);
      }
    });

    return () => unsubscribe();
  }, [categoryId, id]);

  useEffect(() => {
    if (qty > currentStock) {
      setQty(currentStock > 0 ? currentStock : 1);
    }
  }, [currentStock]);

  // 🔥 AGREGAR AL CARRITO (valida stock)
  const handleAdd = async () => {
    if (!mesaId) {
      alert("Seleccioná una mesa primero");
      return;
    }

    if (currentStock === 0) {
      alert("Sin stock disponible");
      return;
    }

    if (qty > currentStock) {
      alert(`No hay suficiente stock. Disponible: ${currentStock}`);
      return;
    }

    try {
      await addToCart({
        id,
        productId: id, // 🔥 AGREGAR ESTO
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
    if (!canEdit) return; // 🔥 AGREGAR ESTA LÍNEA
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
  if (!canEdit) return;

  try {
    if (!categoryId || !id) {
      alert("Falta categoryId o id");
      return;
    }

    const stockNum = Number(editedStock);
    const priceNum = Number(editedPrice);

    // 🔥 VALIDACIÓN PRECIO
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("El precio debe ser mayor a 0");
      return;
    }

    // 🔥 VALIDACIÓN NOMBRE
    if (!editedName.trim()) {
      alert("El nombre no puede estar vacío");
      return;
    }

    // 🔥 VALIDACIONES STOCK
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

    const productRef = doc(
      db,
      "categories",
      categoryId,
      "products",
      id
    );

    // 🔥 SUBIR IMAGEN SI EXISTE
    let imageUrl = image || null;

    if (editedImageFile) {
      const storageRef = ref(
        storage,
        `products/${categoryId}/${Date.now()}-${editedImageFile.name}`
      );

      await uploadBytes(storageRef, editedImageFile);
      imageUrl = await getDownloadURL(storageRef);
    }

    // 🔥 DATA FINAL (IMPORTANTE: incluir image)
    const data = {
      name: editedName.trim(),
      description: String(editedDescription || ""),
      ingredients: String(editedIngredients || ""),
      price: priceNum,
      stock: stockNum,
      image: imageUrl, // 🔥 AHORA SÍ SE GUARDA EN FIRESTORE
    };

    await updateDoc(productRef, data);

    alert("Producto actualizado");
    setEditMode(false);
    setEditedImageFile(null);
  } catch (error) {
    console.error("Error editando producto:", error);
    alert("Error al actualizar producto");
  }
};

  return (
    <>
      <div className={styles.container}>
        {!editMode && canEdit && (
          <>
            <i
              className={`bx bx-trash ${styles.deleteIcon}`}
              onClick={handleDelete}
              title="Eliminar"
            />
            <i
              className={`bx bx-edit ${styles.editIcon}`}
              onClick={() => {
                if (!canEdit) return;
                setEditMode(true);
              }}
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

          <button
            onClick={handleAdd}
            disabled={currentStock === 0 || qty > currentStock}
          >
            {currentStock === 0 ? "Sin stock" : "Agregar"}
          </button>
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
      {editMode && canEdit && (
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

            {/* 🔥 INPUT IMAGEN */}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                setEditedImageFile(file);

                if (file) {
                  setEditedImagePreview(URL.createObjectURL(file));
                }
              }}
            />

            {editedImagePreview && (
              <img
                src={editedImagePreview}
                alt="preview"
                style={{
                  width: "120px",
                  height: "120px",
                  objectFit: "cover",
                  marginTop: "10px",
                  borderRadius: "8px",
                }}
              />
            )}

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