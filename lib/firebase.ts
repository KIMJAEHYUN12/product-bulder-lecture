import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB9nYHNJVHcHczXfGOqX1JUYxUVXmyEr7E",
  authDomain: "mylen-24263782-5d205.firebaseapp.com",
  projectId: "mylen-24263782-5d205",
  storageBucket: "mylen-24263782-5d205.firebasestorage.app",
  messagingSenderId: "811979249105",
  appId: "1:811979249105:web:6b7f47325840de7850fcf0",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app);
