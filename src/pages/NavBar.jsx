import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import LogoImg from "../assets/LaPancheria.png";
import styles from "../components/styles/NavBar.module.css";

const NavBar = ({ role }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleLogout = async (e) => {
    e.preventDefault();

    try {
      setIsOpen(false); // 🔥 cierra menú
      await signOut(auth);
      window.location.href = "/login";
    } catch (error) {
      console.error("Error closing session:", error);
    }
  };

  const handleLinkClick = () => {
    setIsOpen(false); // 🔥 cierra menú siempre
  };

  return (
    <header className={styles.header}>
      <a href="/" className={styles.logo} onClick={handleLinkClick}>
        <img src={LogoImg} alt="La Pancheria" />
      </a>

      <div className={styles.icons} onClick={toggleMenu}>
        <i
          className={`bx bx-menu ${isOpen ? styles.hidden : ""}`}
          id="menu-icon"
          style={{
            backgroundColor: "transparent",
            border: "none",
            outline: "none",
            padding: 0,
            margin: 0,
          }}
        ></i>
        <i
          className={`bx bx-x ${isOpen ? "" : styles.hidden}`}
          id="close-icon"
          style={{
            backgroundColor: "transparent",
            border: "none",
            outline: "none",
            padding: 0,
            margin: 0,
          }}
        ></i>
      </div>

      <nav className={`${styles.navbar} ${isOpen ? styles.active : ""}`}>
        <a href="/" style={{ "--i": 0 }} onClick={handleLinkClick}>
          Inicio
        </a>

        {/* 🔥 SOLO JEFE */}
        {role === "jefe" && (
          <a href="/finanzas" style={{ "--i": 2 }} onClick={handleLinkClick}>
            Finanzas
          </a>
        )}

        <a href="/mesas" style={{ "--i": 3 }} onClick={handleLinkClick}>
          Mesas
        </a>

        <a href="#" onClick={handleLogout} style={{ "--i": 4 }}>
          <i
            className="bx bx-log-out"
            style={{
              backgroundColor: "transparent",
              border: "none",
              outline: "none", 
              padding: 0,
              margin: 0,
            }}
          ></i>
          {" "}Salir
        </a>
      </nav>
    </header>
  );
};

export default NavBar;