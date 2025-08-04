import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyANSYmNZHRuFE6p6lga3cEkYTCQU67xT7g",
  authDomain: "database-invest.firebaseapp.com",
  databaseURL: "https://database-invest-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "database-invest",
  storageBucket: "database-invest.firebasestorage.app",
  messagingSenderId: "465429517765",
  appId: "1:465429517765:web:de893fc118784569ef67ac",
  measurementId: "G-XW756RZPZJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export { auth, db };
