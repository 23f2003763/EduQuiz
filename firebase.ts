import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Your web app's Firebase configuration from the Firebase Console.
const firebaseConfig = {
  apiKey: "AIzaSyDFtIWMbAcTYc-GeTEhJVShYv1SOJOvGTI",
  authDomain: "eduquiz-ai-9274a.firebaseapp.com",
  projectId: "eduquiz-ai-9274a",
  storageBucket: "eduquiz-ai-9274a.appspot.com",
  messagingSenderId: "1064696875455",
  appId: "1:1064696875455:web:85f23f1d909551b4def90a",
  measurementId: "G-T4GH0WDG2M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Export a ready-to-use sign-in function
export const signInWithGoogle = () => {
    return signInWithPopup(auth, googleProvider);
};