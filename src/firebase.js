import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBNUI3N1cKlI6SOjoFTszfukcouGJPdJ8k",
    authDomain: "qr-app-154cf.firebaseapp.com",
    projectId: "qr-app-154cf",
    storageBucket: "qr-app-154cf.firebasestorage.app",
    messagingSenderId: "105669450098",
    appId: "1:105669450098:web:c8bad2f2bc9317d7fca5eb",
    measurementId: "G-4KX2QJLZ0Q"
  };

  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);
  
  export { db };