import { createContext, useContext, useState } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [mesa, setMesa] = useState(null);
  const [cart, setCart] = useState([]);

  const addToCart = (product) => {
    if (!mesa) {
      alert("Seleccioná una mesa primero");
      return;
    }

    setCart((prev) => {
      const exist = prev.find(
        (p) => p.name === product.name && p.mesa === mesa
      );

      if (exist) {
        return prev.map((p) =>
          p.name === product.name && p.mesa === mesa
            ? {
                ...p,
                quantity: p.quantity + product.quantity,
                total: p.total + product.total,
              }
            : p
        );
      }

      return [...prev, { ...product, mesa }];
    });
  };

  const mesaCart = cart.filter((p) => p.mesa === mesa);
  const total = mesaCart.reduce((acc, p) => acc + p.total, 0);

  return (
    <CartContext.Provider
      value={{ mesa, setMesa, addToCart, cart, mesaCart, total }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);