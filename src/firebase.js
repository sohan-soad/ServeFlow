import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAF_O2iQqb3tW0wnY4ETGqsb1qlYk7YueM",
  authDomain: "dev-experimental-b2d68.firebaseapp.com",
  projectId: "dev-experimental-b2d68",
  storageBucket: "dev-experimental-b2d68.firebasestorage.app",
  messagingSenderId: "162160839990",
  appId: "1:162160839990:web:9414a12392b61ff2b8f797",
  measurementId: "G-8X9EWW8DNJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);
export const storage = getStorage(app);
