import { auth, db } from './js/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { ref, get, set } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const referralLinkInput = document.getElementById('referralLink');
const copyLinkBtn = document.getElementById('copyLink');
const referralListEl = document.getElementById('referralList');

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const userRef = ref(db, 'users/' + user.uid);
  const snapshot = await get(userRef);
  const userData = snapshot.val();

  if (userData) {
    const link = `https://app.zylanceinvest.my.id/daftar/${userData.referralCode}`;
    referralLinkInput.value = link;
  }

  loadReferralHistory(user.uid);
});

copyLinkBtn.addEventListener('click', () => {
  referralLinkInput.select();
  document.execCommand('copy');
  alert('Link referral berhasil disalin!');
});

async function loadReferralHistory(userId) {
  const refRef = ref(db, `referrals/${userId}`);
  const snapshot = await get(refRef);
  const data = snapshot.val();

  referralListEl.innerHTML = '';
  if (data) {
    Object.values(data).forEach(log => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${log.referredUser}</td>
        <td>${formatRupiah(log.bonus)}</td>
        <td>${formatDate(log.date)}</td>
      `;
      referralListEl.appendChild(tr);
    });
  } else {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="3" class="empty">Belum ada referral berhasil.</td>';
    referralListEl.appendChild(tr);
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
