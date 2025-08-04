import { auth, db } from './js/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { ref, set, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

let selectedAmount = 0;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
});

document.getElementById('customBtn').addEventListener('click', () => {
  document.querySelectorAll('.nominal-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('customBtn').classList.add('active');
  document.getElementById('customInput').style.display = 'block';
  selectedAmount = 0;
});

document.querySelectorAll('.nominal-btn:not(#customBtn)').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nominal-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedAmount = parseInt(btn.getAttribute('data-amount'));
    document.getElementById('customInput').style.display = 'none';
  });
});

document.getElementById('nextBtn').addEventListener('click', () => {
  const customInput = document.getElementById('customAmount').value;
  const amount = selectedAmount > 0 ? selectedAmount : parseInt(customInput);

  if (!amount || amount < 250000) {
    alert('Nominal minimal deposit adalah 250.000');
    return;
  }

  document.getElementById('depositSection').style.display = 'none';
  document.getElementById('formSection').style.display = 'block';
  document.getElementById('customAmount').setAttribute('data-final', amount);
});

document.getElementById('paymentForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const fullName = document.getElementById('fullName').value;
  const email = document.getElementById('email').value;
  const phone = document.getElementById('phone').value;
  const amount = parseInt(document.getElementById('customAmount').getAttribute('data-final'));
  const recaptcha = grecaptcha.getResponse();

  if (!recaptcha) {
    alert('Selesaikan CAPTCHA terlebih dahulu');
    return;
  }

  const user = auth.currentUser;
  const depositId = 'dep_' + Date.now();
  const qrData = generateQrisData(amount);

  await set(ref(db, 'deposits/' + depositId), {
    userId: user.uid,
    amount: amount,
    fullName: fullName,
    email: email,
    phone: phone,
    status: 'pending',
    timestamp: new Date().toISOString(),
    qrData: qrData
  });

  document.getElementById('formSection').style.display = 'none';
  document.getElementById('qrisSection').style.display = 'block';
  document.getElementById('amountText').textContent = 'Bayar: ' + formatRupiah(amount);
  document.getElementById('qrisImage').src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;

  startPolling(depositId, amount);
});

function generateQrisData(amount) {
  const base = '00020101021126670016COM.NOBUBANK.WWW01189360050300000879140214532040299379480303UMI51440014ID.CO.QRIS.WWW0215ID20253773574180303UMI5204481253033605802ID5926RIZKY SUPER CELL OK22751566009BONDOWOSO61056821162070703A016304';
  const amountStr = amount.toString().padStart(3, '0');
  return base + '00' + amountStr.length + amountStr + 'DEE0';
}

function startPolling(depositId, amount) {
  const statusEl = document.getElementById('status');
  const interval = setInterval(async () => {
    const snap = await get(ref(db, 'deposits/' + depositId));
    const data = snap.val();

    if (data && data.status === 'success') {
      clearInterval(interval);
      statusEl.textContent = 'Deposit berhasil! Saldo Anda telah diperbarui.';
      statusEl.style.background = '#d4edda';
      statusEl.style.color = '#155724';
      statusEl.style.borderColor = '#c3e6cb';

      const userRef = ref(db, 'users/' + auth.currentUser.uid);
      const userSnap = await get(userRef);
      const userData = userSnap.val();
      await set(userRef, { ...userData, saldo: userData.saldo + amount });

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 3000);
    }
  }, 2000);
}

function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(angka);
}

document.getElementById('chatToggle').addEventListener('click', () => {
  document.getElementById('chatPanel').style.display = 'block';
});

document.getElementById('closeChat').addEventListener('click', () => {
  document.getElementById('chatPanel').style.display = 'none';
});

document.getElementById('sendBtn').addEventListener('click', async () => {
  const input = document.getElementById('messageInput');
  const message = input.value.trim();
  if (!message) return;

  const user = auth.currentUser;
  const chatRef = ref(db, `chats/${user.uid}`);
  const now = new Date();

  await set(chatRef, {
    lastMessage: message,
    sender: user.uid,
    timestamp: now.toISOString(),
    read: false,
    senderName: (await get(ref(db, 'users/' + user.uid))).val()?.username || 'User'
  });

  input.value = '';
  alert('Pesan terkirim ke admin.');
});
