import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

import LoginPage from './LoginPage';
import TestFirestore from './TestFirestore';
import HomePage from "./User/HomePage";
import SignupPage from "./SignupPage";
import AdminPanel from "./Admin/AdminPanel";
import RoutineDisplay from './RoutineDisplay';

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // Check Firestore for role
        const adminQuery = query(collection(db, "admins"), where("email", "==", currentUser.email));
        const adminSnapshot = await getDocs(adminQuery);
        if (!adminSnapshot.empty) {
          setRole("admin");
        } else {
          const userQuery = query(collection(db, "users"), where("email", "==", currentUser.email));
          const userSnapshot = await getDocs(userQuery);
          if (!userSnapshot.empty) {
            setRole("user");
          } else {
            setRole(null);
          }
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ backgroundColor: "#00c9ff", height: "100vh" }}></div>; // Blue screen while loading
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? (role === "admin" ? <Navigate to="/admin" /> : <HomePage />) : <Navigate to="/login" />} />

        <Route path="/admin" element={user && role === "admin" ? <AdminPanel /> : <Navigate to="/" />} />

        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />

        <Route path="/signup" element={!user ? <SignupPage /> : <Navigate to="/" />} />

        <Route path="/routine" element={<RoutineDisplay />} />

        <Route path="/test" element={<TestFirestore />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
