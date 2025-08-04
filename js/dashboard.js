import { auth, db } from './js/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { ref, get, set } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const userId = user.uid;
  const saldoValue = document.getElementById('saldoValue');
  const investmentGrid = document.getElementById('investmentGrid');
  const activeInvestments = document.getElementById('activeInvestments');

  try {
    const userRef = ref(db, 'users/' + userId);
    const snapshot = await get(userRef);
    const userData = snapshot.val();

    if (userData) {
      saldoValue.textContent = formatRupiah(userData.saldo || 0);
    }

    renderInvestmentProducts(userId, userData.saldo || 0);
    renderActiveInvestments(userId);
  } catch (error) {
    saldoValue.textContent = 'Gagal memuat';
    console.error('Error:', error);
  }
});

function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(angka);
}

function renderInvestmentProducts(userId, saldo) {
  const products = [
    {
      id: 'money-pemula',
      name: 'Invest Money Beginner',
      logo: 'assets/logo/invest-money.png',
      benefit: '70.000/hari',
      duration: '15 hari',
      total: '1.050.000',
      price: 350000
    },
    {
      id: 'money-sedang',
      name: 'Invest Money Sedang',
      logo: 'assets/logo/invest-money.png',
      benefit: '150.000/hari',
      duration: '20 hari',
      total: '3.000.000',
      price: 450000
    },
    {
      id: 'gold-beginner',
      name: 'Invest Gold Beginner',
      logo: 'assets/logo/invest-gold.png',
      benefit: '100.000/hari',
      duration: '25 hari',
      total: '2.500.000',
      price: 300000
    },
    {
      id: 'tiktok-beginner',
      name: 'Invest TikTok Beginner',
      logo: 'assets/logo/invest-tiktok.png',
      benefit: '70.000/hari',
      duration: '18 hari',
      total: '1.260.000',
      price: 130000
    }
  ];

  investmentGrid.innerHTML = '';
  products.forEach((product, index) => {
    const card = document.createElement('div');
    card.className = 'investment-card';
    card.style.setProperty('--i', index);

    card.innerHTML = `
      <img src="${product.logo}" alt="${product.name}" />
      <h3>${product.name}</h3>
      <div class="benefit">Benefit: ${product.benefit}</div>
      <div class="benefit">Jangka Waktu: ${product.duration}</div>
      <div class="benefit">Total Diterima: ${product.total}</div>
      <div class="price">${formatRupiah(product.price)}</div>
      <button onclick="confirmPurchase('${userId}', '${product.id}', ${product.price})">Beli Sekarang</button>
    `;
    investmentGrid.appendChild(card);
  });
}

async function confirmPurchase(userId, productId, price) {
  const userRef = ref(db, 'users/' + userId);
  const snapshot = await get(userRef);
  const userData = snapshot.val();

  if (userData.saldo < price) {
    alert('Saldo tidak mencukupi untuk membeli paket ini.');
    return;
  }

  const konfirmasi = confirm(`Anda yakin ingin membeli ${productId} seharga ${formatRupiah(price)}?`);
  if (!konfirmasi) return;

  await set(userRef, {
    ...userData,
    saldo: userData.saldo - price
  });

  const investRef = ref(db, `investments/${userId}/${productId}`);
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(now.getDate() + getDurationDays(productId));

  await set(investRef, {
    productId,
    purchaseDate: now.toISOString(),
    endDate: endDate.toISOString(),
    dailyAmount: getDailyAmount(productId),
    status: 'aktif'
  });

  alert('Pembelian berhasil! Investasi telah aktif.');
  location.reload();
}

function getDurationDays(id) {
  const map = {
    'money-pemula': 15,
    'money-sedang': 20,
    'gold-beginner': 25,
    'tiktok-beginner': 18
  };
  return map[id] || 30;
}

function getDailyAmount(id) {
  const map = {
    'money-pemula': 70000,
    'money-sedang': 150000,
    'gold-beginner': 100000,
    'tiktok-beginner': 70000
  };
  return map[id] || 50000;
}

async function renderActiveInvestments(userId) {
  const investRef = ref(db, `investments/${userId}`);
  const snapshot = await get(investRef);
  const data = snapshot.val();

  activeInvestments.innerHTML = '';

  if (!data) {
    activeInvestments.innerHTML = '<p class="empty">Anda belum memiliki investasi aktif.</p>';
    return;
  }

  Object.keys(data).forEach(key => {
    const inv = data[key];
    const endDate = new Date(inv.endDate).toLocaleDateString('id-ID');
    const card = document.createElement('div');
    card.innerHTML = `
      <p><strong>${inv.productId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong> 
      - Berakhir: ${endDate} 
      <button class="btn-claim" onclick="claimDaily('${userId}', '${key}', ${inv.dailyAmount})">Claim Hari Ini</button></p>
    `;
    activeInvestments.appendChild(card);
  });
}

async function claimDaily(userId, investId, amount) {
  const claimRef = ref(db, `claims/${userId}/${investId}/${new Date().toISOString().split('T')[0]}`);
  const snapshot = await get(claimRef);
  if (snapshot.exists()) {
    alert('Anda sudah melakukan claim hari ini.');
    return;
  }

  const userRef = ref(db, 'users/' + userId);
  const userSnap = await get(userRef);
  const userData = userSnap.val();

  await set(claimRef, { amount, date: new Date().toISOString() });
  await set(userRef, { ...userData, saldo: userData.saldo + amount });

  alert(`Claim berhasil! Saldo Anda bertambah ${formatRupiah(amount)}.`);
  document.getElementById('saldoValue').textContent = formatRupiah(userData.saldo + amount);
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
