// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getAuth,
    signOut,
    onAuthStateChanged,
    updateProfile,
    deleteUser,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// مفاتيح مشروع dars-7507b الخاصة بدفتر الدروس
const firebaseConfig = {
    apiKey: "AIzaSyB5v-RoQJ-olPqL1r7WwrR4AqSzstH_8o0",
    authDomain: "dars-7507b.firebaseapp.com",
    projectId: "dars-7507b",
    storageBucket: "dars-7507b.firebasestorage.app",
    messagingSenderId: "371105564854",
    appId: "1:371105564854:web:438e2923b10a9bbc577e17",
    measurementId: "G-370D948ZK6"
};

// تهيئة خدمات Firebase (بدون Storage - نستخدم Cloudinary بدلها، شوف cloudinary.js)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {
    auth,
    db,
    signOut,
    onAuthStateChanged,
    updateProfile,
    deleteUser,
    GoogleAuthProvider,
    signInWithPopup,
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where
};
