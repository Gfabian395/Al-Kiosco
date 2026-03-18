import { useState } from "react";
import styles from "../components/styles/NavBar.module.css";

const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <header className={styles.header}>
      <a href="/" className={styles.logo}>Logo</a>

      <div className={styles.icons} onClick={toggleMenu}>
        <i className={`bx bx-menu ${isOpen ? styles.hidden : ''}`} id="menu-icon"></i>
        <i className={`bx bx-x ${isOpen ? '' : styles.hidden}`} id="close-icon"></i>
      </div>

      <nav className={`${styles.navbar} ${isOpen ? styles.active : ''}`}>
        <a href="/" style={{ "--i": 0 }}>Inicio</a>
        <a href="/bebidas" style={{ "--i": 1 }}>Bebidas</a>
        <a href="#" style={{ "--i": 2 }}>Cafeteria</a>
        <a href="#" style={{ "--i": 3 }}>Caja</a>
        <a href="#" style={{ "--i": 4 }}>Mesas</a>
      </nav>
    </header>
  );
};

export default NavBar;