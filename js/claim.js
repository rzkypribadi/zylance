import { auth, db } from './js/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { ref, get, set } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const claimBtn = document.getElementById('claimBtn');
const claimStatus = document.getElementById('claimStatus');
const claimListEl = document.getElementById('claimList');
const giftBox = document.getElementById('giftBox');

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const dailyRef = ref(db, `dailyClaims/${user.uid}/${today}`);
  const snapshot = await get(dailyRef);

  if (snapshot.exists()) {
    claimBtn.disabled = true;
    claimBtn.textContent = 'Sudah Claim Hari Ini';
    claimBtn.style.background = '#95a5a6';
    claimStatus.textContent = 'Anda sudah melakukan claim hari ini. Kembali besok!';
  } else {
    claimBtn.disabled = false;
  }

  loadClaimHistory(user.uid);
});

claimBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;

  const today = new Date().toISOString().split('T')[0];
  const dailyRef = ref(db, `dailyClaims/${user.uid}/${today}`);
  const userRef = ref(db, 'users/' + user.uid);

  const snapshot = await get(dailyRef);
  if (snapshot.exists()) {
    alert('Anda sudah claim hari ini.');
    return;
  }

  const userSnap = await get(userRef);
  const userData = userSnap.val();

  await set(dailyRef, { amount: 5000, date: today });
  await set(userRef, { ...userData, saldo: userData.saldo + 5000 });

  claimStatus.textContent = '🎉 Selamat! Anda mendapatkan 5.000!';
  claimBtn.disabled = true;
  claimBtn.textContent = 'Berhasil!';
  claimBtn.style.background = '#27ae60';

  document.querySelector('.lid').style.transform = 'rotate(-45deg)';

  if (window.parent || window.top) {
    const saldoEl = document.querySelector('#saldoValue');
    if (saldoEl) saldoEl.textContent = formatRupiah(userData.saldo + 5000);
  }

  setTimeout(() => {
    alert('Claim berhasil! 5.000 telah ditambahkan ke saldo Anda.');
  }, 500);
});

async function loadClaimHistory(userId) {
  const historyRef = ref(db, `dailyClaims/${userId}`);
  const snapshot = await get(historyRef);
  const data = snapshot.val();

  claimListEl.innerHTML = '';
  if (data) {
    Object.entries(data).sort(([a], [b]) => new Date(b) - new Date(a)).forEach(([date, log]) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatDate(date)}</td>
        <td>${formatRupiah(log.amount)}</td>
        <td><span class="status success">✓ Sukses</span></td>
      `;
      claimListEl.appendChild(tr);
    });
  } else {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="3" class="empty">Belum ada claim.</td>';
    claimListEl.appendChild(tr);
  }
}

function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(angka);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('id-ID');
}

document.getElementById('chatToggle')?.addEventListener('click', () => {
  document.getElementById('chatPanel').style.display = 'block';
});

document.getElementById('closeChat')?.addEventListener('click', () => {
  document.getElementById('chatPanel').style.display = 'none';
});

document.getElementById('sendBtn')?.addEventListener('click', async () => {
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
