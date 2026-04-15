import { useState } from "react";
import { db, storage } from "../firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../context/AuthContext";
import styles from "./styles/CardCategory.module.css";

const CardCategory = ({ id, name, image, onClick = () => { }, onCategoryUpdated = () => { } }) => {
  const { user, role } = useAuth();
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(name);
  const [newImageFile, setNewImageFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const canEdit = role === "jefe" || role === "encargado";
  const handleSave = async () => {
    if (!canEdit) return;
    if (!newName.trim()) return;
    try {
      setLoading(true);
      let imageUrl = image || null;

      if (newImageFile) {
        if (!user) {
          alert("Necesitas iniciar sesión para subir imágenes");
          return;
        }
        const storageRef = ref(storage, `categories/${Date.now()}-${newImageFile.name}`);
        await uploadBytes(storageRef, newImageFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      await updateDoc(doc(db, "categories", id), {
        name: newName,
        image: imageUrl,
      });

      onCategoryUpdated();
      setEditing(false);
      setNewImageFile(null);
    } catch (err) {
      console.error("Error editando categoría:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!canEdit) return;
    if (!confirm(`¿Seguro que querés eliminar "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, "categories", id));
      onCategoryUpdated();
    } catch (err) {
      console.error("Error borrando categoría:", err);
    }
  };

  return (
    <>
      <div className={styles.container} onClick={onClick}>
        {!editing ? (
          <>
            {image && <img src={image} alt={name} />}
            <div className={styles.overlay}>
              <h3 className={styles.title}>{name}</h3>
            </div>

            {canEdit && (
              <div className={styles.topButtons}>
                <button
                  className={styles.editBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!canEdit) return;
                    setEditing(true);
                  }}
                >
                  ✎
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                >
                  🗑
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* 🔥 MODAL EDITAR */}
      {editing && canEdit && (
        <div
          className={styles.editModal}
          onClick={() => setEditing(false)}
        >
          <div
            className={styles.editContent}
            onClick={(e) => e.stopPropagation()}
          >

            <h3>Editar categoría</h3>

            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre categoría"
            />

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setNewImageFile(e.target.files[0])}
            />

            <div className={styles.editActions}>
              <button onClick={handleSave} disabled={loading}>
                {loading ? "Guardando..." : "Guardar"}
              </button>

              <button onClick={() => setEditing(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CardCategory;