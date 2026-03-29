import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyB9nYHNJVHcHczXfGOqX1JUYxUVXmyEr7E",
  authDomain: "mylen-24263782-5d205.firebaseapp.com",
  projectId: "mylen-24263782-5d205",
  storageBucket: "mylen-24263782-5d205.firebasestorage.app",
  messagingSenderId: "811979249105",
  appId: "1:811979249105:web:6b7f47325840de7850fcf0",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);

let _messaging: Messaging | null = null;
export function getMessagingInstance(): Messaging | null {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  if (!_messaging) _messaging = getMessaging(app);
  return _messaging;
}
