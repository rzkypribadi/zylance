import { auth, db } from './js/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { ref, get, set } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const userBalanceEl = document.getElementById('userBalance');
const minWithdrawEl = document.getElementById('minWithdraw');
const minAmountTextEl = document.getElementById('minAmountText');
const withdrawType = document.getElementById('withdrawType');
const methodGroup = document.getElementById('methodGroup');
const paymentMethod = document.getElementById('paymentMethod');
const amountInput = document.getElementById('amount');
const withdrawForm = document.getElementById('withdrawForm');

let userBalance = 0;
let minWithdrawAmount = 0;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const userRef = ref(db, 'users/' + user.uid);
  const snapshot = await get(userRef);
  const userData = snapshot.val();

  if (userData) {
    userBalance = userData.saldo || 0;
    userBalanceEl.textContent = formatRupiah(userBalance);
    minWithdrawAmount = calculateMinWithdraw(userBalance);
    minWithdrawEl.textContent = formatRupiah(minWithdrawAmount);
    minAmountTextEl.textContent = formatRupiah(minWithdrawAmount);
  }
});

withdrawType.addEventListener('change', () => {
  methodGroup.style.display = 'block';
  paymentMethod.innerHTML = '<option value="">Pilih Metode</option>';

  const type = withdrawType.value;
  const methods = {
    ewallet: ['OVO', 'DANA', 'GoPay', 'ShopeePay', 'LinkAja'],
    bank: ['BRI', 'BCA', 'BNI', 'Mandiri', 'CIMB', 'Permata', 'BSI']
  };

  methods[type].forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.toLowerCase();
    opt.textContent = m;
    paymentMethod.appendChild(opt);
  });
});

amountInput.addEventListener('input', () => {
  const val = parseInt(amountInput.value) || 0;
  if (val < minWithdrawAmount) {
    amountInput.setCustomValidity(`Nominal minimal penarikan adalah ${minWithdrawAmount}`);
  } else {
    amountInput.setCustomValidity('');
  }
});

withdrawForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const amount = parseInt(amountInput.value);
  const password = document.getElementById('password').value;

  if (amount < minWithdrawAmount) {
    alert(`Minimal penarikan adalah ${formatRupiah(minWithdrawAmount)}`);
    return;
  }

  if (amount > userBalance) {
    alert('Saldo tidak mencukupi.');
    return;
  }

  const confirmWithdraw = confirm(`Anda akan menarik ${formatRupiah(amount)}?\nProses membutuhkan waktu 1×24 jam.`);
  if (!confirmWithdraw) return;

  const user = auth.currentUser;
  const withdrawId = 'wd_' + Date.now();

  await set(ref(db, 'withdraws/' + withdrawId), {
    userId: user.uid,
    amount: amount,
    method: paymentMethod.value,
    type: withdrawType.value,
    status: 'pending',
    timestamp: new Date().toISOString(),
    processed: false
  });

  const userRef = ref(db, 'users/' + user.uid);
  const userSnap = await get(userRef);
  const userData = userSnap.val();
  await set(userRef, { ...userData, saldo: userData.saldo - amount });

  alert(`Penarikan berhasil dikonfirmasi.\nNominal: ${formatRupiah(amount)}\nProses: 1×24 jam`);
  window.location.href = 'dashboard.html';
});

function calculateMinWithdraw(saldo) {
  if (saldo < 150000) return 250000;
  if (saldo < 250000) return 350000;
  if (saldo < 500000) return 750000;
  if (saldo < 750000) return 950000;
  if (saldo < 1000000) return 1250000;
  if (saldo < 1250000) return 1500000;
  if (saldo < 1500000) return 1750000;
  if (saldo < 1750000) return 2000000;
  if (saldo < 2000000) return 2250000;
  if (saldo < 2250000) return 2500000;
  if (saldo < 2500000) return 2750000;
  if (saldo < 2750000) return 3000000;
  if (saldo < 3000000) return 3250000;
  if (saldo < 3250000) return 3500000;
  if (saldo < 3500000) return 3750000;
  if (saldo < 3750000) return 4000000;
  if (saldo < 4000000) return 4250000;
  if (saldo < 4250000) return 4500000;
  if (saldo < 4500000) return 4750000;
  if (saldo < 4750000) return 5000000;
  if (saldo < 5000000) return 5250000;
  if (saldo < 5250000) return 5500000;
  if (saldo < 5500000) return 5750000;
  if (saldo < 5750000) return 6000000;
  if (saldo < 6000000) return 6250000;
  if (saldo < 6250000) return 6500000;
  if (saldo < 6500000) return 6750000;
  if (saldo < 6750000) return 7000000;
  if (saldo < 7000000) return 7250000;
  if (saldo < 7250000) return 7500000;
  if (saldo < 7500000) return 7750000;
  if (saldo < 7750000) return 8000000;
  if (saldo < 8000000) return 8250000;
  if (saldo < 8250000) return 8500000;
  if (saldo < 8500000) return 8750000;
  if (saldo < 8750000) return 9000000;
  if (saldo < 9000000) return 9250000;
  if (saldo < 9250000) return 9500000;
  if (saldo < 9500000) return 9750000;
  if (saldo < 9750000) return 10000000;
  if (saldo < 10000000) return 10500000;
  if (saldo < 10500000) return 11000000;
  if (saldo < 11000000) return 11500000;
  if (saldo < 11500000) return 12000000;
  if (saldo < 12000000) return 12500000;
  const juta = Math.floor(saldo / 1000000);
  return (juta + 1) * 1000000;
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
