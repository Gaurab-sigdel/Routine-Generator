import React, { useState } from "react";
import "./SignupPage.css";
import emailjs from 'emailjs-com'; //for email verification
import { useNavigate } from "react-router-dom"; // Used for redirecting user
import { createUserWithEmailAndPassword, signOut, updateProfile, } from "firebase/auth";
import { auth, db } from './firebase';
import { doc, setDoc } from "firebase/firestore";

function SignupPage() {
    // State variables to store input values
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [generatedOtp, setGeneratedOTP] = useState("");
    const [userOtp, setUserOtp] = useState("");


    const navigate = useNavigate(); // For redirecting user after signup

    // This block generate and send OTP to the email provided.
    const sendOTP = () => {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOTP(otp);

        const templateParams = {
            email: email,
            passcode: otp,
            time: new Date(Date.now() + 15 * 60000).toLocaleString(),
        };

        emailjs.send(
            "service_0sq0vrq",
            "template_b0ekm3g",
            templateParams,
            "W3KXkBkme_Alrk5g5"
        ).then(() => {
            alert("✅ OTP sent to your email.");
            setOtpSent(true);
        }).catch((error) => {
            console.error("OTP Send Error:", error);
            alert("❌ Failed to send OTP. Try again.");
        });
    };

    // Function to handle user signup
    const handleInitialSubmit = async () => {
        if (!name || !email || !password) {
            alert("⚠️ Please fill in all fields.");
            return;
        }

        // email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert("❌ Please enter a valid email address.");
            return;
        }
        // this block send otp code and wait till user enter OTP
        if (!otpSent) {
            sendOTP();
        }
    };

    // Handle OTP verification and account creation
    const verifyAndSignup = async () => {
        if (userOtp !== generatedOtp) {
            alert("❌ Incorrect OTP. Please try again.");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            // ✅ Update the user's display name in Firebase
            await updateProfile(user, {
                displayName: name,
            });

            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                role: "user"
            });


            // ✅ Sign out to go to login
            await signOut(auth);


            alert("✅ Account created successfully!.");
            navigate("/login");


        } catch (error) {
            console.error("Signup Error:", error);
            alert(`❌ Signup failed: ${error.message}`);
        }
    };

    //signup form
    return (
        <div className="signup-page">
            <div className="signup-card">
                <h2 className="title">Create Account</h2>

                {!otpSent && (
                    <>
                        {/*___________________Input Field ______________________*/}
                        <label>Name</label>
                        <input type="text" placeholder="Enter your name"
                            value={name} onChange={(e) => setName(e.target.value)} // Update name state
                        />

                        <label>Email</label>
                        <input type="email" placeholder="Enter your email"
                            value={email} onChange={(e) => setEmail(e.target.value)} // Update email state
                        />

                        <label>Password</label>
                        <input type="password" placeholder="Enter your password"
                            value={password} onChange={(e) => setPassword(e.target.value)} // Update password state
                        />
                        <button className="signup-btn" onClick={handleInitialSubmit}>
                            Send OTP
                        </button>
                    </>
                )}

                {otpSent && (
                    <>
                        <label>Enter OTP</label>
                        <input type="text" placeholder="Enter the OTP sent to your email"
                            value={userOtp} onChange={(e) => setUserOtp(e.target.value)}
                        />

                        <button className="signup-btn" onClick={verifyAndSignup}>
                            Verify & Register
                        </button>

                        <button className="resend-btn" onClick={sendOTP}>
                            Resend OTP
                        </button>
                    </>
                )}

                {/*************************Input Field************************/}


                <p className="or-text">Already have an account?</p>
                <button className="login-btn" onClick={() => navigate("/login")}>
                    Go to Login
                </button>
            </div>
        </div>
    );
}

export default SignupPage;