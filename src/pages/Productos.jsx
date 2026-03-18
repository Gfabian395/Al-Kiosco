import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import CardProduct from "../components/CardProduct";
import styles from "../components/styles/Productos.module.css";

export const Productos = () => {
  const { categoryId } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // 🔹 Referencia exacta a la subcolección
        const productsRef = collection(db, "categories", categoryId, "products");
        console.log("Firebase path:", productsRef.path);

        const snapshot = await getDocs(productsRef);
        const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log("Productos obtenidos:", prods);
        setProducts(prods);
      } catch (err) {
        console.error("Error cargando productos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [categoryId]);

  if (loading) return <p>Cargando productos...</p>;
  if (products.length === 0) return <p>No hay productos en esta categoría.</p>;

  return (
    <div className={styles.productContainer}>
      {products.map(prod => (
        <CardProduct
          key={prod.id}
          id={prod.id}
          title={prod.title}
          description={prod.description}
          image={prod.image}
          price={prod.price}
        />
      ))}
    </div>
  );
};