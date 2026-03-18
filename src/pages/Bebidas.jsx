import React, { useEffect, useState } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import CardProduct from "../components/CardProduct";

export const Bebidas = () => {
  const [bebidas, setBebidas] = useState([]);

  // Traer las bebidas de Firestore
  useEffect(() => {
    const fetchBebidas = async () => {
      const snapshot = await getDocs(collection(db, "bebidas"));
      const drinks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBebidas(drinks);
    };
    fetchBebidas();
  }, []);

  // Función para agregar una bebida nueva
  const handleAddBebida = async () => {
    const name = prompt("Nombre de la bebida");
    const description = prompt("Descripción");
    const ingredients = prompt("Ingredientes");
    const price = parseFloat(prompt("Precio"));
    const image = prompt("URL de la imagen");

    if (!name || !description || !ingredients || isNaN(price) || !image) return;

    const newBebida = { name, description, ingredients, price, image };
    const docRef = await addDoc(collection(db, "bebidas"), newBebida);

    setBebidas(prev => [...prev, { id: docRef.id, ...newBebida }]);
  };

  return (
    <div style={{ position: "relative", padding: "20px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
        {bebidas.map((b) => (
          <CardProduct
            key={b.id}
            name={b.name}
            description={b.description}
            ingredients={b.ingredients}
            price={b.price}
            image={b.image}
          />
        ))}
      </div>

      {/* Botón flotante abajo a la derecha */}
      <button
        onClick={handleAddBebida}
        style={{
          position: "fixed",
          bottom: "30px",
          right: "30px",
          background: "#ff6347",
          color: "#fff",
          border: "none",
          borderRadius: "50%",
          width: "60px",
          height: "60px",
          fontSize: "30px",
          cursor: "pointer",
          boxShadow: "0 4px 6px rgba(0,0,0,0.2)",
        }}
      >
        +
      </button>
    </div>
  );
};