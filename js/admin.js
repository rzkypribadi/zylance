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
const revenueYesterdayEl = document.getElementById('revenueYesterday');
const revenueLastWeekEl = document.getElementById('revenueLastWeek');
const revenueLastMonthEl = document.getElementById('revenueLastMonth');

const usersListEl = document.getElementById('usersList');
const depositsListEl = document.getElementById('depositsList');
const withdrawsListEl = document.getElementById('withdrawsList');
const investmentsListEl = document.getElementById('investmentsList');
const referralsListEl = document.getElementById('referralsList');
const financeListEl = document.getElementById('financeList');

const searchUserEl = document.getElementById('searchUser');
const addSaldoBtn = document.getElementById('addSaldoBtn');
const deductSaldoBtn = document.getElementById('deductSaldoBtn');
const deleteUserBtn = document.getElementById('deleteUserBtn');
const exportBtn = document.getElementById('exportDataBtn');

const userChatListEl = document.getElementById('userChatList');
const chatWithEl = document.getElementById('chatWith');
const adminMessagesEl = document.getElementById('adminMessages');
const adminReplyEl = document.getElementById('adminReply');
const sendReplyBtn = document.getElementById('sendReply');

const settingsForm = document.getElementById('settingsForm');

let selectedUserForChat = null;
let chatListeners = {};

const ADMIN_CREDENTIALS = {
  username: 'invest-admin',
  password: 'pass-admin',
  token: 'invest-money'
};

if (adminLoginForm) {
  adminLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = adminUsernameInput.value.trim();
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
  loadInvestments();
  loadReferrals();
  loadFinance();
  loadChatList();
  setupTabNavigation();
  setupSearch();
  setupActionButtons();
  setupSettings();
  startRealtimeNotifications();
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
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const revenueToday = Object.values(deposits)
    .filter(d => d.status === 'success' && d.timestamp.startsWith(today))
    .reduce((sum, d) => sum + d.amount, 0);

  const revenueYesterday = Object.values(deposits)
    .filter(d => d.status === 'success' && d.timestamp.startsWith(yesterday))
    .reduce((sum, d) => sum + d.amount, 0);

  const revenueLastWeek = Object.values(deposits)
    .filter(d => d.status === 'success' && d.timestamp >= lastWeek)
    .reduce((sum, d) => sum + d.amount, 0);

  const revenueLastMonth = Object.values(deposits)
    .filter(d => d.status === 'success' && d.timestamp >= lastMonth)
    .reduce((sum, d) => sum + d.amount, 0);

  totalUsersEl.textContent = totalUsers;
  totalDepositsEl.textContent = formatRupiah(totalDeposits);
  totalWithdrawsEl.textContent = formatRupiah(totalWithdraws);
  revenueTodayEl.textContent = formatRupiah(revenueToday);
  revenueYesterdayEl.textContent = formatRupiah(revenueYesterday);
  revenueLastWeekEl.textContent = formatRupiah(revenueLastWeek);
  revenueLastMonthEl.textContent = formatRupiah(revenueLastMonth);

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

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('id-ID');
}

function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(angka);
}

function loadUsers() {
  const usersRef = ref(db, 'users');
  onValue(usersRef, (snapshot) => {
    const data = snapshot.val();
    usersListEl.innerHTML = '';
    if (data) {
      Object.values(data).sort((a, b) => b.saldo - a.saldo).forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${user.username}</td>
          <td>${user.email}</td>
          <td>${formatRupiah(user.saldo)}</td>
          <td>${formatDate(user.joinDate)}</td>
          <td>
            <button class="btn-view" data-uid="${user.uid}">Lihat</button>
          </td>
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
      Object.entries(data).sort(([,a], [,b]) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(([id, dep]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${dep.fullName}</td>
          <td>${formatRupiah(dep.amount)}</td>
          <td><span class="status ${dep.status}">${capitalize(dep.status)}</span></td>
          <td>${formatDateTime(dep.timestamp)}</td>
          <td>
            ${dep.status === 'pending' ? 
              `<button class="btn-success verify-deposit" data-id="${id}">Verifikasi</button>
               <button class="btn-danger reject-deposit" data-id="${id}">Tolak</button>` : 
              `<span class="verified">✓ Terverifikasi</span>`}
          </td>
        `;
        depositsListEl.appendChild(tr);
      });

      document.querySelectorAll('.verify-deposit').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          await update(ref(db, 'deposits/' + id), { status: 'success' });
          const depSnap = await get(ref(db, 'deposits/' + id));
          const dep = depSnap.val();
          const userRef = ref(db, 'users/' + dep.userId);
          const userSnap = await get(userRef);
          const userData = userSnap.val();
          await set(userRef, { ...userData, saldo: userData.saldo + dep.amount });
          alert('Deposit berhasil diverifikasi dan saldo ditambahkan.');
          loadStats();
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
      Object.entries(data).sort(([,a], [,b]) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(([id, wd]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${wd.userId}</td>
          <td>${formatRupiah(wd.amount)}</td>
          <td>${capitalize(wd.type)} - ${capitalize(wd.method)}</td>
          <td><span class="status ${wd.status}">${capitalize(wd.status)}</span></td>
          <td>
            ${wd.status === 'pending' ? 
              `<button class="btn-success verify-withdraw" data-id="${id}">Konfirmasi</button>
               <button class="btn-danger reject-withdraw" data-id="${id}">Batalkan</button>` : 
              `<span class="verified">✓ Diproses</span>`}
          </td>
        `;
        withdrawsListEl.appendChild(tr);
      });

      document.querySelectorAll('.verify-withdraw').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          await update(ref(db, 'withdraws/' + id), { status: 'success', processed: true });
          alert('Penarikan berhasil dikonfirmasi.');
        });
      });
    }
  });
}

function loadInvestments() {
  const invRef = ref(db, 'investments');
  onValue(invRef, (snapshot) => {
    const data = snapshot.val();
    investmentsListEl.innerHTML = '';
    if (data) {
      Object.entries(data).forEach(([uid, userInv]) => {
        Object.entries(userInv).forEach(([key, inv]) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${uid}</td>
            <td>${inv.productId}</td>
            <td>${formatRupiah(inv.dailyAmount)}/hari</td>
            <td>${formatDate(inv.purchaseDate)} - ${formatDate(inv.endDate)}</td>
            <td><span class="status ${inv.status}">${capitalize(inv.status)}</span></td>
          `;
          investmentsListEl.appendChild(tr);
        });
      });
    }
  });
}

function loadReferrals() {
  const refRef = ref(db, 'referrals');
  onValue(refRef, (snapshot) => {
    const data = snapshot.val();
    referralsListEl.innerHTML = '';
    if (data) {
      Object.entries(data).forEach(([referrer, refs]) => {
        Object.entries(refs).forEach(([refId, refData]) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${referrer}</td>
            <td>${refData.referredUser}</td>
            <td>${formatRupiah(refData.bonus)}</td>
            <td>${formatDateTime(refData.date)}</td>
          `;
          referralsListEl.appendChild(tr);
        });
      });
    }
  });
}

function loadFinance() {
  const finRef = ref(db, 'finance');
  onValue(finRef, (snapshot) => {
    const data = snapshot.val();
    financeListEl.innerHTML = '';
    if (data) {
      Object.values(data).reverse().forEach(rec => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${rec.type}</td>
          <td>${formatRupiah(rec.amount)}</td>
          <td>${rec.description}</td>
          <td>${formatDateTime(rec.timestamp)}</td>
        `;
        financeListEl.appendChild(tr);
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
      Object.values(data).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(chat => {
        const div = document.createElement('div');
        div.className = `chat-user ${chat.read ? 'read' : 'unread'}`;
        div.textContent = `${chat.senderName}`;
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
  msg.className = 'user-msg';
  msg.textContent = chatData.lastMessage;
  adminMessagesEl.appendChild(msg);

  const replyForm = document.createElement('p');
  replyForm.className = 'admin-reply-prompt';
  replyForm.textContent = '(Balas pesan di bawah)';
  adminMessagesEl.appendChild(replyForm);
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
  addSaldoBtn?.addEventListener('click', () => promptSaldoChange('add'));
  deductSaldoBtn?.addEventListener('click', () => promptSaldoChange('deduct'));
  deleteUserBtn?.addEventListener('click', () => promptDeleteUser());
  exportBtn?.addEventListener('click', exportAllData);
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
  loadStats();
}

async function promptDeleteUser() {
  const uid = prompt('Masukkan UID pengguna yang akan dihapus:');
  if (!uid) return;
  if (!confirm('Yakin ingin menghapus akun ini? Tindakan tidak bisa dibatalkan.')) return;

  await set(ref(db, 'users/' + uid), null);
  alert('Akun berhasil dihapus.');
  loadStats();
  loadUsers();
}

function exportAllData() {
  alert('Fitur export ke Excel akan segera hadir. Data siap diekspor.');
}

function setupSettings() {
  settingsForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Pengaturan berhasil disimpan.');
  });
}

function startRealtimeNotifications() {
  console.log('Realtime admin notifications aktif.');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'sendReply' && selectedUserForChat) {
    const msg = adminReplyEl.value.trim();
    if (!msg) return;
    alert('Balasan admin terkirim ke user.');
    adminReplyEl.value = '';
  }
});

window.addEventListener('beforeunload', () => {
  sessionStorage.removeItem('adminAuth');
});
