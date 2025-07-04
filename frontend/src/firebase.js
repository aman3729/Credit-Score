// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// Optionally import analytics if you want to use it
// import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBVKekMPhTcHG2LX2tWkMSDe6C64eapDDA",
  authDomain: "cred-edffa.firebaseapp.com",
  projectId: "cred-edffa",
  storageBucket: "cred-edffa.appspot.com",
  messagingSenderId: "1001968039680",
  appId: "1:1001968039680:web:dba7e5206e134eace465e5",
  measurementId: "G-0619R21RX3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Optionally initialize analytics
// const analytics = getAnalytics(app);

export default app; 