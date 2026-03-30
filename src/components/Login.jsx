import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import styles from "./styles/Login.module.css";
import { useNavigate } from "react-router-dom";
import LogoImg from "../assets/LaPancheria.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);

      // 🔥 SOLO LOGUEA Y REDIRIGE
      navigate("/");

    } catch (error) {
      console.error(error);
      setMessage("Invalid email or password!");
    }
  };

  return (
    <div className={styles.authContainer}>
      <h2>
        <img src={LogoImg} alt="La Pancheria" className={styles.logoHeader} />
      </h2>

      <h3>Iniciar sesion</h3>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={login}>Ingresar</button>

      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
};

export default Login;