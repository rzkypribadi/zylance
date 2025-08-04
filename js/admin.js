import { auth, db } from './js/firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { ref, get, set, onValue, update } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const adminLoginForm = document.getElementById('adminLoginForm');
const adminUsernameInput = document.getElementById('adminUsername');
const adminPasswordInput = document.getElementById('adminPassword');

const tabButtons = document.querySelectorAll('.admin-menu a[data-tab]');
const tabContents = document.querySelectorAll('.tab-content');

const totalUsersEl = document.getElementById('totalUsers');
const totalDepositsEl = document.getElementById('totalDeposits');
const totalWithdrawsEl = document.getElementById('totalWithdraws');
const revenueTodayEl = document.getElementById('revenueToday');

const usersListEl = document.getElementById('usersList');
const depositsListEl = document.getElementById('depositsList');
const withdrawsListEl = document.getElementById('withdrawsList');

const searchUserEl = document.getElementById('searchUser');
const addSaldoBtn = document.getElementById('addSaldoBtn');
const deductSaldoBtn = document.getElementById('deductSaldoBtn');
const deleteUserBtn = document.getElementById('deleteUserBtn');

const userChatListEl = document.getElementById('userChatList');
const chatWithEl = document.getElementById('chatWith');
const adminMessagesEl = document.getElementById('adminMessages');
const adminReplyEl = document.getElementById('adminReply');
const sendReplyBtn = document.getElementById('sendReply');

let selectedUserForChat = null;
let currentUserData = null;

const ADMIN_CREDENTIALS = {
  username: 'invest-admin',
  password: 'pass-admin',
  token: 'invest-money'
};

if (adminLoginForm) {
  adminLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = adminUsernameInput.value;
    const password = adminPasswordInput.value;

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      sessionStorage.setItem('adminAuth', ADMIN_CREDENTIALS.token);
      window.location.href = 'dashboard.html';
    } else {
      alert('Username atau password admin salah.');
    }
  });
}

function checkAdminAuth() {
  const token = sessionStorage.getItem('adminAuth');
  if (!token || token !== ADMIN_CREDENTIALS.token) {
    window.location.href = 'login.html';
  }
}

if (document.querySelector('.admin-container')) {
  checkAdminAuth();
  initAdminDashboard();
}

function initAdminDashboard() {
  loadStats();
  loadUsers();
  loadDeposits();
  loadWithdraws();
  loadChatList();
  setupTabNavigation();
  setupSearch();
  setupActionButtons();
}

function setupTabNavigation() {
  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = btn.getAttribute('data-tab');
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tabContents.forEach(content => {
        content.style.display = content.id === tab ? 'block' : 'none';
      });
      if (tab === 'chat') refreshChatList();
    });
  });
}

async function loadStats() {
  const usersSnap = await get(ref(db, 'users'));
  const depositsSnap = await get(ref(db, 'deposits'));
  const withdrawsSnap = await get(ref(db, 'withdraws'));

  const users = usersSnap.val() || {};
  const deposits = depositsSnap.val() || {};
  const withdraws = withdrawsSnap.val() || {};

  const totalUsers = Object.keys(users).length;
  const totalDeposits = Object.values(deposits).filter(d => d.status === 'success').reduce((sum, d) => sum + d.amount, 0);
  const totalWithdraws = Object.values(withdraws).filter(w => w.status === 'success').reduce((sum, w) => sum + w.amount, 0);

  const today = new Date().toISOString().split('T')[0];
  const revenueToday = Object.values(deposits)
    .filter(d => d.status === 'success' && d.timestamp.startsWith(today))
    .reduce((sum, d) => sum + d.amount, 0);

  totalUsersEl.textContent = totalUsers;
  totalDepositsEl.textContent = formatRupiah(totalDeposits);
  totalWithdrawsEl.textContent = formatRupiah(totalWithdraws);
  revenueTodayEl.textContent = formatRupiah(revenueToday);

  renderActivityChart(deposits, withdraws);
}

function renderActivityChart(deposits, withdraws) {
  const ctx = document.getElementById('activityChart').getContext('2d');
  const labels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return d.toISOString().split('T')[0];
  });

  const depositData = labels.map(date => {
    return Object.values(deposits).filter(d => d.status === 'success' && d.timestamp.startsWith(date)).reduce((sum, d) => sum + d.amount, 0);
  });

  const withdrawData = labels.map(date => {
    return Object.values(withdraws).filter(w => w.status === 'success' && w.timestamp.startsWith(date)).reduce((sum, w) => sum + w.amount, 0);
  });

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.map(d => formatDate(d)),
      datasets: [
        {
          label: 'Deposit',
          data: depositData,
          borderColor: '#2ecc71',
          backgroundColor: 'rgba(46, 204, 113, 0.1)',
          fill: true
        },
        {
          label: 'Penarikan',
          data: withdrawData,
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' }
      }
    }
  });
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

function loadUsers() {
  const usersRef = ref(db, 'users');
  onValue(usersRef, (snapshot) => {
    const data = snapshot.val();
    usersListEl.innerHTML = '';
    if (data) {
      Object.values(data).forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${user.username}</td>
          <td>${user.email}</td>
          <td>${formatRupiah(user.saldo)}</td>
          <td>${formatDate(user.joinDate)}</td>
          <td><button class="btn-view" data-uid="${user.uid}">Lihat</button></td>
        `;
        usersListEl.appendChild(tr);
      });
    }
  });
}

function loadDeposits() {
  const depositsRef = ref(db, 'deposits');
  onValue(depositsRef, (snapshot) => {
    const data = snapshot.val();
    depositsListEl.innerHTML = '';
    if (data) {
      Object.entries(data).forEach(([id, dep]) => {
        if (dep.status !== 'pending') return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${dep.fullName}</td>
          <td>${formatRupiah(dep.amount)}</td>
          <td><span class="status pending">Pending</span></td>
          <td>${formatDateTime(dep.timestamp)}</td>
          <td>
            <button class="btn-success" data-id="${id}">Sukses</button>
            <button class="btn-danger" data-id="${id}">Tolak</button>
          </td>
        `;
        depositsListEl.appendChild(tr);
      });

      document.querySelectorAll('.btn-success').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          await update(ref(db, 'deposits/' + id), { status: 'success' });
          const userRef = ref(db, 'users/' + dep.userId);
          const userSnap = await get(userRef);
          const userData = userSnap.val();
          await set(userRef, { ...userData, saldo: userData.saldo + dep.amount });
          alert('Deposit berhasil diverifikasi.');
        });
      });
    }
  });
}

function loadWithdraws() {
  const withdrawsRef = ref(db, 'withdraws');
  onValue(withdrawsRef, (snapshot) => {
    const data = snapshot.val();
    withdrawsListEl.innerHTML = '';
    if (data) {
      Object.entries(data).forEach(([id, wd]) => {
        if (wd.status !== 'pending') return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${wd.userId}</td>
          <td>${formatRupiah(wd.amount)}</td>
          <td>${wd.method}</td>
          <td><span class="status pending">Pending</span></td>
          <td>
            <button class="btn-success" data-id="${id}">Konfirmasi</button>
            <button class="btn-danger" data-id="${id}">Tolak</button>
          </td>
        `;
        withdrawsListEl.appendChild(tr);
      });
    }
  });
}

function loadChatList() {
  const chatsRef = ref(db, 'chats');
  onValue(chatsRef, (snapshot) => {
    const data = snapshot.val();
    userChatListEl.innerHTML = '';
    if (data) {
      Object.values(data).forEach(chat => {
        const div = document.createElement('div');
        div.textContent = chat.senderName;
        div.setAttribute('data-sender', chat.sender);
        div.setAttribute('data-name', chat.senderName);
        div.addEventListener('click', () => openChatWith(chat.sender, chat.senderName));
        userChatListEl.appendChild(div);
      });
    }
  });
}

async function openChatWith(uid, name) {
  selectedUserForChat = uid;
  chatWithEl.textContent = `Obrolan dengan ${name}`;
  adminReplyEl.disabled = false;
  sendReplyBtn.disabled = false;
  adminMessagesEl.innerHTML = '<p class="info">Memuat pesan...</p>';

  const chatRef = ref(db, `chats/${uid}`);
  const chatSnap = await get(chatRef);
  const chatData = chatSnap.val();

  adminMessagesEl.innerHTML = '';
  const msg = document.createElement('p');
  msg.textContent = chatData.lastMessage;
  adminMessagesEl.appendChild(msg);
}

function setupSearch() {
  searchUserEl.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('#usersList tr').forEach(tr => {
      const text = tr.textContent.toLowerCase();
      tr.style.display = text.includes(query) ? '' : 'none';
    });
  });
}

function setupActionButtons() {
  addSaldoBtn.addEventListener('click', () => promptSaldoChange('add'));
  deductSaldoBtn.addEventListener('click', () => promptSaldoChange('deduct'));
  deleteUserBtn.addEventListener('click', () => promptDeleteUser());
}

async function promptSaldoChange(type) {
  const uid = prompt('Masukkan UID pengguna:');
  if (!uid) return;
  const amount = parseInt(prompt(`Masukkan jumlah saldo yang akan ${type === 'add' ? 'ditambahkan' : 'dikurangi'}:`));
  if (isNaN(amount) || amount <= 0) return;

  const userRef = ref(db, 'users/' + uid);
  const snap = await get(userRef);
  const userData = snap.val();
  if (!userData) {
    alert('Pengguna tidak ditemukan.');
    return;
  }

  const newSaldo = type === 'add' ? userData.saldo + amount : userData.saldo - amount;
  if (newSaldo < 0) {
    alert('Saldo tidak bisa negatif.');
    return;
  }

  await set(userRef, { ...userData, saldo: newSaldo });
  alert(`Saldo berhasil ${type === 'add' ? 'ditambahkan' : 'dikurangi'}.`);
}

async function promptDeleteUser() {
  const uid = prompt('Masukkan UID pengguna yang akan dihapus:');
  if (!uid) return;
  if (!confirm('Yakin ingin menghapus akun ini? Tindakan tidak bisa dibatalkan.')) return;

  await set(ref(db, 'users/' + uid), null);
  alert('Akun berhasil dihapus.');
}

function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(angka);
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('id-ID');
}

document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'sendReply' && selectedUserForChat) {
    const msg = adminReplyEl.value.trim();
    if (!msg) return;
    alert('Pesan terkirim ke user.');
    adminReplyEl.value = '';
  }
});
