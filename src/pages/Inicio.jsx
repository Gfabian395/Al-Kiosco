import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import CardCategory from "../components/CardCategory";
import Loader from "../components/Loader"; // 🔥 TU LOADER
import styles from "../components/styles/Inicio.module.css";
import { useAuth } from "../context/AuthContext";

export const Inicio = () => {
  const { user, loginWithGoogle } = useAuth();
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryImage, setNewCategoryImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // 🔹 Traer categorías
  const fetchCategories = async () => {
    try {
      const snapshot = await getDocs(collection(db, "categories"));
      const cats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
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
    if (loading) return; // 🔥 evita cerrar mientras guarda
    setModalOpen(false);
    setNewCategoryName("");
    setNewCategoryImage(null);
  };

  // 🔥 GUARDAR CATEGORÍA
  const handleGuardarCategoria = async () => {
    if (loading) return; // 🔥 evita doble click
    if (!newCategoryName.trim()) return;

    if (!user) {
      alert("Necesitas iniciar sesión con Google");
      return;
    }

    try {
      setLoading(true);

      let imageUrl = "";

      if (newCategoryImage) {
        const storageRef = ref(
          storage,
          `categories/${Date.now()}-${newCategoryImage.name}`
        );
        await uploadBytes(storageRef, newCategoryImage);
        imageUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, "categories"), {
        name: newCategoryName,
        image: imageUrl,
        createdBy: user.uid,
      });

      closeModal();
      fetchCategories();

    } catch (err) {
      console.error("Error guardando categoría:", err);
      alert("Error al guardar categoría");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 🔹 CATEGORÍAS */}
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

      {/* 🔹 BOTÓN + */}
      <div className={styles.fab} onClick={handleAgregarCategoria}>
        +
      </div>

      {/* 🔹 MODAL */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
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
            />

            <div className={styles.actions}>
              <button
                onClick={handleGuardarCategoria}
                disabled={loading}
              >
                {loading ? "Guardando..." : "Guardar"}
              </button>

              <button onClick={closeModal} disabled={loading}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 LOADER GLOBAL */}
      {loading && (
        <div className={styles.loadingOverlay}>
          <Loader />
          <p className={styles.loadingText}>
            Guardando categoría...
          </p>
        </div>
      )}
    </>
  );
};