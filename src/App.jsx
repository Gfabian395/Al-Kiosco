import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import "./App.css";
import NavBar from "./pages/NavBar";
import { Inicio } from "./pages/Inicio";
import { Productos } from "./pages/Productos";
import { Mesas } from "./pages/Mesas";
import { Finanzas } from "./pages/Finanzas";
import Login from "./components/Login";
import Loader from "./components/Loader";

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

          console.log("USER:", firebaseUser);
          console.log("ROLE:", userDoc.data()?.role);
          console.log("EXISTS:", userDoc.exists());
          console.log("DATA:", userDoc.data());

          setUser(firebaseUser);
          setRole(userDoc.data()?.role || null);
        } catch (error) {
          console.error(error);
          setUser(firebaseUser);
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <Loader />;

  return (
    <>
      {user && <NavBar role={role} />}

      <Routes>
        {/* LOGIN */}
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login />}
        />

        {/* HOME */}
        <Route
          path="/"
          element={user ? <Inicio /> : <Navigate to="/login" replace />}
        />

        {/* MESAS */}
        <Route
          path="/mesas"
          element={user ? <Mesas /> : <Navigate to="/login" replace />}
        />

        {/* PRODUCTOS */}
        <Route
          path="/productos/:categoryId"
          element={user ? <Productos /> : <Navigate to="/login" replace />}
        />

        {/* FINANZAS */}
        <Route
          path="/finanzas"
          element={
            user ? (
              role === "jefe" ? (
                <Finanzas />
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* FALLBACK */}
        <Route
          path="*"
          element={<Navigate to={user ? "/" : "/login"} replace />}
        />
      </Routes>
    </>
  );
}

export default App;