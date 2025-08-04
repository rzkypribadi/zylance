import { auth } from './js/firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const emailOrUsername = document.getElementById('emailOrUsername').value.trim();
  const password = document.getElementById('password').value;

  try {
    let email = emailOrUsername;
    
    if (!email.includes('@')) {
      // Jika input adalah username, cari email dari database nanti (dibuat setelah register simpan ke DB)
      alert('Fitur login dengan username akan tersedia setelah data disimpan ke database.');
      return;
    }

    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = 'dashboard.html';
  } catch (error) {
    alert('Gagal masuk: ' + error.message);
  }
});
