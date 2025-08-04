import { auth, db } from './js/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const historyListEl = document.getElementById('historyList');
const filterSelect = document.getElementById('filterType');

let allTransactions = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  await loadAllTransactions(user.uid);
  renderTransactions();
});

async function loadAllTransactions(userId) {
  historyListEl.innerHTML = '<p class="empty">Memuat riwayat...</p>';
  allTransactions = [];

  const depositsSnap = await get(ref(db, `deposits`));
  const withdrawsSnap = await get(ref(db, `withdraws`));
  const investmentsSnap = await get(ref(db, `investments/${userId}`));
  const referralsSnap = await get(ref(db, `referrals/${userId}`));
  const claimsSnap = await get(ref(db, `dailyClaims/${userId}`));

  const deposits = depositsSnap.val() || {};
  const withdraws = withdrawsSnap.val() || {};
  const investments = investmentsSnap.val() || {};
  const referrals = referralsSnap.val() || {};
  const claims = claimsSnap.val() || {};

  Object.values(deposits).forEach(d => {
    if (d.userId === userId && d.status === 'success') {
      allTransactions.push({
        type: 'deposit',
        amount: d.amount,
        desc: `Deposit berhasil`,
        date: d.timestamp
      });
    }
  });

  Object.values(withdraws).forEach(w => {
    if (w.userId === userId && w.status === 'success') {
      allTransactions.push({
        type: 'withdraw',
        amount: w.amount,
        desc: `Penarikan ke ${w.method}`,
        date: w.timestamp
      });
    }
  });

  Object.values(investments).forEach(inv => {
    allTransactions.push({
      type: 'invest',
      amount: -getInvestPrice(inv.productId),
      desc: `Beli ${inv.productId}`,
      date: inv.purchaseDate
    });
  });

  Object.values(referrals).forEach(r => {
    allTransactions.push({
      type: 'referral',
      amount: r.bonus,
      desc: `Bonus referral dari ${r.referredUser}`,
      date: r.date
    });
  });

  Object.entries(claims).forEach(([date, c]) => {
    allTransactions.push({
      type: 'claim',
      amount: c.amount,
      desc: 'Claim harian 5.000',
      date: c.date || date
    });
  });

  allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getInvestPrice(id) {
  const prices = {
    'money-pemula': 350000,
    'money-sedang': 450000,
    'gold-beginner': 300000,
    'tiktok-beginner': 130000,
    'money-sedang': 450000,
    'money-pro': 650000,
    'money-god': 500000,
    'gold-beginner': 300000,
    'gold-sedang': 500000,
    'gold-pro': 750000,
    'gold-god': 1500000,
    'tiktok-beginner': 130000,
    'tiktok-sedang': 190000,
    'tiktok-pro': 900000,
    'tiktok-god': 1200000,
    'invest-seumur-hidup': 25000000
  };
  return prices[id] || 0;
}

function renderTransactions() {
  const filter = filterSelect.value;
  const filtered = filter === 'all' 
    ? allTransactions 
    : allTransactions.filter(t => t.type === filter);

  historyListEl.innerHTML = '';
  if (filtered.length === 0) {
    historyListEl.innerHTML = '<p class="empty">Tidak ada transaksi sesuai filter.</p>';
    return;
  }

  filtered.forEach(tx => {
    const item = document.createElement('div');
    item.className = `transaction-item ${tx.type}`;
    item.innerHTML = `
      <div class="left">
        <div class="icon">${getIcon(tx.type)}</div>
        <div class="details">
          <strong>${tx.desc}</strong>
          <span>${formatDate(tx.date)}</span>
        </div>
      </div>
      <div class="amount">${tx.amount >= 0 ? '+' : ''}${formatRupiah(Math.abs(tx.amount))}</div>
    `;
    historyListEl.appendChild(item);
  });
}

function getIcon(type) {
  const icons = {
    deposit: '↑',
    withdraw: '↓',
    invest: '📊',
    referral: '👥',
    claim: '🎁'
  };
  return icons[type] || '•';
}

function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(angka);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

filterSelect.addEventListener('change', renderTransactions);

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
