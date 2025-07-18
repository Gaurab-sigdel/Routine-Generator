// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // Import getAuth to work with Firebase Auth
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAL6y47iQgevSLIiXuvzD_bZVL8FUNV_CA",
  authDomain: "routinegeneratorv2-5cf4b.firebaseapp.com",
  projectId: "routinegeneratorv2-5cf4b",
  storageBucket: "routinegeneratorv2-5cf4b.firebasestorage.app",
  messagingSenderId: "58417604404",
  appId: "1:58417604404:web:ebce45be838badff95a761",
  measurementId: "G-EGHH7GQMQJ"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider(); // Create the Google provider
const db = getFirestore(app);

// Export them to use in other files  

export { auth, provider, db };

