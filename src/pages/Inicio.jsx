import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import CardCategory from "../components/CardCategory";
import styles from "../components/styles/Inicio.module.css";
import { useAuth } from "../context/AuthContext";

export const Inicio = () => {
  const { user, loginWithGoogle } = useAuth();
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryImage, setNewCategoryImage] = useState(null);
  const navigate = useNavigate();

  const fetchCategories = async () => {
    try {
      const colRef = collection(db, "categories");
      const snapshot = await getDocs(colRef);
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(cats);
    } catch (err) {
      console.error("Error cargando categorías:", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCategoryClick = (categoryId) => {
    navigate(`/productos/${categoryId}`);
  };

  const handleAgregarCategoria = () => {
    if (!user) {
      loginWithGoogle();
      return;
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setNewCategoryName("");
    setNewCategoryImage(null);
  };

  const handleGuardarCategoria = async () => {
    if (!newCategoryName.trim()) return;
    if (!user) {
      alert("Necesitas iniciar sesión con Google");
      return;
    }

    try {
      let imageUrl = "";

      if (newCategoryImage) {
        const storageRef = ref(storage, `categories/${Date.now()}-${newCategoryImage.name}`);
        await uploadBytes(storageRef, newCategoryImage);
        imageUrl = await getDownloadURL(storageRef);
      }

      const colRef = collection(db, "categories");
      await addDoc(colRef, {
        name: newCategoryName,
        image: imageUrl,
        createdBy: user.uid
      });

      setNewCategoryName("");
      setNewCategoryImage(null);
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      console.error("Error guardando categoría:", err);
    }
  };

  return (
    <>
      <div className={styles.categoryContainer}>
        {categories.map((cat) => (
          <CardCategory
            key={cat.id}
            id={cat.id}
            name={cat.name}
            image={cat.image}
            onClick={() => handleCategoryClick(cat.id)}
            onCategoryUpdated={fetchCategories}
          />
        ))}
      </div>

      <div className={styles.fab} onClick={handleAgregarCategoria}>+</div>

      {modalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Agregar Categoría</h2>
            <input
              type="text"
              placeholder="Nombre de la categoría"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setNewCategoryImage(e.target.files[0])}
              style={{ marginTop: "10px" }}
            />
            <div style={{ marginTop: "10px" }}>
              <button onClick={handleGuardarCategoria}>Guardar</button>
              <button onClick={closeModal} style={{ marginLeft: "10px" }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};