// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage"; // 🔹 importar Storage

const firebaseConfig = {
  apiKey: "AIzaSyBEvuo8ekQYi8kdDEWaK5vAw0Pk2wfVLKQ",
  authDomain: "al-kiosco.firebaseapp.com",
  projectId: "al-kiosco",
  storageBucket: "al-kiosco.firebasestorage.app",
  messagingSenderId: "440964794609",
  appId: "1:440964794609:web:66d062b2560bd6efadc150"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app); // 🔹 exportar Storage