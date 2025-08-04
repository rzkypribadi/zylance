import { auth, db } from './js/firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { ref, set } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const registerForm = document.getElementById('registerForm');

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const whatsapp = document.getElementById('whatsapp').value.trim();
  const password = document.getElementById('password').value;
  const recaptchaResponse = grecaptcha.getResponse();

  if (!recaptchaResponse) {
    alert('Silakan selesaikan CAPTCHA terlebih dahulu.');
    return;
  }

  if (password.length < 4) {
    alert('Kata sandi minimal 4 karakter.');
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Simpan data ke Realtime Database
    await set(ref(db, 'users/' + user.uid), {
      uid: user.uid,
      username: username,
      email: email,
      whatsapp: whatsapp,
      saldo: 0,
      referralCode: generateReferralCode(username),
      totalReferral: 0,
      totalEarnedFromReferral: 0,
      joinDate: new Date().toISOString(),
      isActive: true
    });

    alert('Akun berhasil dibuat! Silakan masuk.');
    window.location.href = 'login.html';
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      alert('Email sudah terdaftar.');
    } else {
      alert('Gagal daftar: ' + error.message);
    }
  }
});

function generateReferralCode(username) {
  return (username + Math.random().toString(36).substr(2, 4)).toUpperCase().slice(0, 8);
}
