import { createContext, useContext, useState, useEffect } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [mesaId, setMesaId] = useState(null);
  const [cart, setCart] = useState([]);

  // 🔥 persistencia
  useEffect(() => {
    const savedMesa = localStorage.getItem("mesaId");
    if (savedMesa) setMesaId(savedMesa);
  }, []);

  useEffect(() => {
    if (mesaId) {
      localStorage.setItem("mesaId", mesaId);
    } else {
      localStorage.removeItem("mesaId");
    }
  }, [mesaId]);

  // 🔥 escuchar pedido en tiempo real
  useEffect(() => {
    if (!mesaId) {
      setCart([]);
      return;
    }

    const pedidoRef = collection(db, "mesas", mesaId, "pedido");

    const unsubscribe = onSnapshot(pedidoRef, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setCart(data);
    });

    return () => unsubscribe();
  }, [mesaId]);

  // 🔥 AGREGAR PRODUCTO
  const addToCart = async (product) => {
  if (!mesaId) {
    alert("Seleccioná una mesa");
    return;
  }

  try {
    const pedidoRef = collection(db, "mesas", mesaId, "pedido");
    const snapshot = await getDocs(pedidoRef);

    const qty = product.quantity || 1;

    const exist = snapshot.docs.find(
  (doc) => doc.data().productId === product.productId || doc.data().productId === product.id
);

    if (exist) {
      const itemRef = doc(db, "mesas", mesaId, "pedido", exist.id);
      const current = exist.data();

      await updateDoc(itemRef, {
        productId: product.id,
        categoryId: product.categoryId,
        quantity: current.quantity + qty,
        total: current.total + product.price * qty,
      });

    } else {
      await addDoc(pedidoRef, {
        productId: product.id,        // 🔥 CLAVE
        categoryId: product.categoryId, // 🔥 CLAVE
        name: product.name,
        price: product.price,
        image: product.image || "",
        quantity: qty,
        total: product.price * qty,
      });
    }

    await updateDoc(doc(db, "mesas", mesaId), {
      ocupada: true,
    });

  } catch (error) {
    console.error("Error en addToCart:", error);
    alert("Error al agregar producto");
  }
};

  // 🔥 REMOVER / RESTAR PRODUCTO
  const removeFromCart = async (productId) => {
    if (!mesaId) return;

    try {
      const itemRef = doc(db, "mesas", mesaId, "pedido", productId);

      const snapshot = await getDocs(
        collection(db, "mesas", mesaId, "pedido")
      );

      const itemDoc = snapshot.docs.find((d) => d.id === productId);
      if (!itemDoc) return;

      const data = itemDoc.data();

      if (data.quantity > 1) {
        await updateDoc(itemRef, {
          quantity: data.quantity - 1,
          total: data.total - data.price,
        });
      } else {
        await deleteDoc(itemRef);
      }

      // 🔥 verificar si quedó vacío → liberar mesa
      const newSnapshot = await getDocs(
        collection(db, "mesas", mesaId, "pedido")
      );

      if (newSnapshot.empty) {
        await updateDoc(doc(db, "mesas", mesaId), {
          ocupada: false,
        });
      }

    } catch (error) {
      console.error("Error en removeFromCart:", error);
      alert("Error al quitar producto");
    }
  };

  // 🔥 LIMPIAR MESA (liberar o después de cobrar)
  const clearMesa = async (cobro = false) => {
    if (!mesaId) return;

    try {
      const pedidoRef = collection(db, "mesas", mesaId, "pedido");
      const snapshot = await getDocs(pedidoRef);

      for (let d of snapshot.docs) {
        await deleteDoc(d.ref);
      }

      await updateDoc(doc(db, "mesas", mesaId), {
        ocupada: false,
      });

      setCart([]);
      setMesaId(null);

    } catch (error) {
      console.error("Error limpiando mesa:", error);
      alert("Error al liberar mesa");
    }
  };

  const total = cart.reduce((acc, p) => acc + p.total, 0);

  return (
    <CartContext.Provider
      value={{
        mesaId,
        setMesa: setMesaId,
        addToCart,
        removeFromCart,
        cart,
        total,
        clearMesa,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);