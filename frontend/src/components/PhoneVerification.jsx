import React, { useState, useRef, useEffect } from "react";
import { getAuth, signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";
import app from '../firebase';

export default function PhoneVerification() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("input"); // "input" | "code" | "verified"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const recaptchaRef = useRef(null);

  useEffect(() => {
    const auth = getAuth(app);
    auth.useDeviceLanguage(); // Use the browser/device language for localization
    // Setup reCAPTCHA only once
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        recaptchaRef.current,
        {
          size: "invisible",
          callback: () => {},
          "expired-callback": () => {
            setError("reCAPTCHA expired, please try again.");
          }
        },
        auth
      );
    }
    // Cleanup on unmount
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const sendCode = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const appVerifier = window.recaptchaVerifier;
      const auth = getAuth(app);
      const confirmationResult = await signInWithPhoneNumber(auth, phone, appVerifier);
      window.confirmationResult = confirmationResult;
      setStep("code");
    } catch (err) {
      setError(err.message);
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    }
    setLoading(false);
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await window.confirmationResult.confirm(code);
      // User is signed in
      setStep("verified");
      // You can now update user profile, redirect, etc.
    } catch (err) {
      setError("Invalid code. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div>
      {step === "input" && (
        <form onSubmit={sendCode} className="space-y-4">
          <input
            type="tel"
            placeholder="Enter phone number"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
            disabled={loading}
            className="border p-2 rounded w-full"
          />
          <div className="text-xs text-gray-500 mt-1">
            By continuing, you agree to receive an SMS for verification. Standard rates may apply.
          </div>
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
            {loading ? "Sending..." : "Send Code"}
          </button>
          <div ref={recaptchaRef} id="recaptcha-container" />
        </form>
      )}
      {step === "code" && (
        <form onSubmit={verifyCode} className="space-y-4">
          <input
            type="text"
            placeholder="Enter verification code"
            value={code}
            onChange={e => setCode(e.target.value)}
            required
            disabled={loading}
            className="border p-2 rounded w-full"
          />
          <button type="submit" disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded">
            {loading ? "Verifying..." : "Verify Code"}
          </button>
        </form>
      )}
      {step === "verified" && (
        <div className="p-4 bg-green-100 text-green-800 rounded">
          <p>✅ Phone number verified and user signed in!</p>
        </div>
      )}
      {error && <div className="text-red-600 mt-2">{error}</div>}
    </div>
  );
} 