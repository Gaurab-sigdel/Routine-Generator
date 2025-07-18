import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

// Import Firebase functions for authentication and Firestore queries
import { signInWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from './firebase';


function LoginPage() {
  // These will store what the user types
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");

  const navigate = useNavigate();


  // This function runs when we click the Google Sign-In button
  // const handleGoogleSignIn = async () => {
  //   try {
  //     provider.setCustomParameters({ prompt: "select_account" });

  //     const result = await signInWithPopup(auth, provider);
  //     const user = result.user;

  //     const signInMethods = await fetchSignInMethodsForEmail(auth, user.email);

  //     if (!signInMethods.includes("google.com")) {
  //       alert("❌ Account not registered with Google. Please sign up first.");
  //       await auth.signOut(); // Important: logout the user
  //       return;
  //     }

  //     navigate("/HomePage"); // or your desired route
  //   } catch (error) {
  //     console.error("Google Sign-In Failed:", error.message);
  //     alert("❌ Google Sign-In Failed. Please try again.");
  //   }
  // };



  // ---------------------- Handle Email/Password Login ----------------------
  const handleLogin = async () => {
    if (!role) {
      alert("❌ Please select a role before logging in.");
      return;
    }
    try {
      // Determine the Firestore collection to query based on role

      const collectionName = role === "admin" ? "admins" : "users";
      const q = query(collection(db, collectionName), where("email", "==", email.trim()));
      const snapshot = await getDocs(q);

      // jun role ko lai assign gareko xa tei selest garnu parxa
      if (snapshot.empty) {
        alert(`❌ This account is not registered as a ${role}.`);
        return;
      }

      await signInWithEmailAndPassword(auth, email.trim(), password);

      //  role aanusar ko panel ma login hunxa

      if (role === "admin") {
        navigate("/admin");
      } else {
        navigate("/student");
      }

    } catch (error) {
      console.error("Login Error:", error.code, error.message);
      alert("❌ Invalid email or password.");
    }
  };

  // --------------------- Handle Forgot Password Request ---------------------
  const handleForgotPassword = async () => {
    if (!email) {
      alert("Please enter your email to reset password.");
      return;
    }

    try {
      // Send password reset email using Firebase
      await sendPasswordResetEmail(auth, email);
      alert("📧 If this email is registered, a password reset link has been sent.");
    } catch (error) {
      console.error("Forgot Password Error:", error);
      alert(`❌ ${error.message}`);
    }
  };

  return (

    // --------------------- Login Form ---------------------
    <div className="login-page">
      {/* This is the card in the center */}
      <div className="login-card">
        <h2 className="title">Welcome</h2>

        {/* -------------- Input labels------------ */}
        <label>Email</label>
        <input
          type="email"
          placeholder="Type your email"
          value={email} // connects input to state
          onChange={(e) => setEmail(e.target.value)} // updates email state
        />

        <label>Password</label>
        <input type="password" placeholder="Type your password"
          value={password} onChange={(e) => setPassword(e.target.value)}
        />
        {/*********************************************/}

        <label>Select Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Select role</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>


        {/*Buttons*/}
        <button className="login-btn" onClick={handleLogin}>
          Login
        </button>

        <button className="signup-btn" onClick={() => navigate("/signup")}>
          Sign Up
        </button>

        <button className="forgot-password-btn" onClick={handleForgotPassword}>
          Forgot Password?
        </button>

        {/* 

        <p className="or-text">or sign in using</p>

        // Google login button 
        <button className="google-btn" onClick={handleGoogleSignIn}>
          <img
            src="https://developers.google.com/identity/images/g-logo.png"
            alt="Google"
            style={{ width: "20px", height: "20px" }}
          />
        </button>
         */}

      </div>
    </div>
  );
}

export default LoginPage;
