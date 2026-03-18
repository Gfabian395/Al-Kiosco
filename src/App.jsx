import "./App.css";
import { Routes, Route } from "react-router-dom";

import NavBar from "./pages/NavBar";
import { Inicio } from "./pages/Inicio";
import { Productos } from "./pages/Productos";
import { Bebidas } from "./pages/Bebidas";

function App() {
  return (
    <>
      <NavBar />

      <div style={{ paddingTop: "100px" }}>
        <Routes>
          {/* Página de inicio con categorías */}
          <Route path="/" element={<Inicio />} />
          <Route path="/bebidas" element={<Bebidas />} />

          {/* Página de productos por categoría */}
          <Route path="/productos/:categoryId" element={<Productos />} />
        </Routes>
      </div>
    </>
  );
}

export default App;