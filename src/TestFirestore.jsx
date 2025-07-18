// Import necessary React and Firebase modules
import React, { useEffect } from 'react';
import { db } from './firebase'; // Firestore instance from firebase.js
import { collection, addDoc } from 'firebase/firestore'; // Firestore functions
import { getAuth, onAuthStateChanged } from 'firebase/auth'; // Auth and listener

function TestFirestore() {
  useEffect(() => {
    console.log("🚀 TestFirestore component mounted");

    const auth = getAuth(); // Get the current Firebase Auth instance

    // Listen for changes in authentication state (e.g., login or logout)
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Only proceed if a user is logged in
      if (user) {
        try {
          // Add the logged-in user's email and UID to the "testCollection" in Firestore
          await addDoc(collection(db, "testCollection"), {
            email: user.email,       // Store the user's email
            uid: user.uid,           // Store the user's unique Firebase UID
            loginTime: new Date()    // Record the login time
          });

          console.log("✅ User data saved to Firestore successfully!");
        } catch (error) {
          // Log any errors that occur during the Firestore write
          console.error("❌ Error saving user data to Firestore:", error);
        }
      } else {
        // If no user is logged in, show a warning
        console.warn("⚠️ No user is currently logged in. Cannot write to Firestore.");
      }
    });

    // Cleanup the listener when the component unmounts
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this runs only once when the component mounts

  return (
    <div>
      <h2>Testing Firestore connection...</h2>
    </div>
  );
}

export default TestFirestore;
