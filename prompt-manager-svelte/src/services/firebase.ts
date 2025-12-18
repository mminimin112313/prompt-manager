import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAzpL5nTg6v92Uj28QsBpxt1k8wYoGKXtY",
    authDomain: "prompt-76252.firebaseapp.com",
    projectId: "prompt-76252",
    storageBucket: "prompt-76252.appspot.com",
    messagingSenderId: "683129810198",
    appId: "1:683129810198:web:aa39fe66cec551d41df437",
    measurementId: "G-4GCY1XH5HN"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
