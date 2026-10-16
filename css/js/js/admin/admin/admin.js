let adminDb = loadMsdqDatabase();

window.addEventListener('DOMContentLoaded', () => {
  populateAdminDashboard();
});

window.addEventListener('storage', () => {
  adminDb = loadMsdqDatabase();
  populateAdminDashboard();
});

function populateAdminDashboard() {
  // Economy Inputs
  document.getElementById('admCoinPrice').value = adminDb.settings.coinPriceUsdt;
  document.getElementById('admBaseTap').value = adminDb.settings.baseTapReward;
  document.getElementById('admBaseAuto').value = adminDb.settings.baseAutoRatePerSec;
  document.getElementById('admMinWithdraw').value = adminDb.settings.minWithdrawAmount;
  document.getElementById('admAdReward').value = adminDb.settings.adRewardAmount;
  document.getElementById('admAdLimit').value = adminDb.settings.dailyAdLimit;
  document.getElementById('admAnnouncement').value = adminDb.settings.announcement;

  // User Info
  document.getElementById('admUserName').innerText = adminDb.user.username;
  document.getElementById('admUserUid').innerText = adminDb.user.uid;
  document.getElementById('admUserBalance').innerText = adminDb.user.balance.toFixed(2);
  document.getElementById('admSetBalanceInput').value = Math.floor(adminDb.user.balance);
  document.getElementById('admUserStatus').innerText = adminDb.user.banned ? 'BANNED' : 'ACTIVE';

  renderAdminWithdrawals();
}

function saveEconomySettings() {
  adminDb.settings.coinPriceUsdt = parseFloat(document.getElementById('admCoinPrice').value) || 0.05;
  adminDb.settings.baseTapReward = parseFloat(document.getElementById('admBaseTap').value) || 1.0;
  adminDb.settings.baseAutoRatePerSec = parseFloat(document.getElementById('admBaseAuto').value) || 0.5;
  adminDb.settings.minWithdrawAmount = parseFloat(document.getElementById('admMinWithdraw').value) || 1000;
  adminDb.settings.adRewardAmount = parseFloat(document.getElementById('admAdReward').value) || 50;
  adminDb.settings.dailyAdLimit = parseInt(document.getElementById('admAdLimit').value) || 5;
  adminDb.settings.announcement = document.getElementById('admAnnouncement').value;

  saveMsdqDatabase(adminDb);
  alert('✅ Global MSDQ Network Settings updated!');
}

function updateUserBalance() {
  const newBal = parseFloat(document.getElementById('admSetBalanceInput').value);
  if (isNaN(newBal) || newBal < 0) return;
  adminDb.user.balance = newBal;
  saveMsdqDatabase(adminDb);
  populateAdminDashboard();
  alert('✅ User $MSDQ balance updated!');
}

function resetUserDailyLimits() {
  adminDb.user.lastCheckinDate = null;
  adminDb.user.adsWatchedToday = 0;
  adminDb.user.freeBatteryRefills = 3;
  saveMsdqDatabase(adminDb);
  alert('✅ User Daily Check-In, Free Battery Refills, and Ad Quota reset!');
}

function toggleBanUser() {
  adminDb.user.banned = !adminDb.user.banned;
  saveMsdqDatabase(adminDb);
  populateAdminDashboard();
}

function addNewBoosterRig() {
  const name = document.getElementById('newRigName').value.trim();
  const desc = document.getElementById('newRigDesc').value.trim();
  const type = document.getElementById('newRigType').value;
  const power = parseFloat(document.getElementById('newRigPower').value);
  const cost = parseFloat(document.getElementById('newRigCost').value);

  if (!name || !desc || isNaN(power) || isNaN(cost)) {
    alert('Please fill all booster fields properly.');
    return;
  }

  adminDb.boosters.push({
    id: 'rig_' + Date.now(),
    name,
    desc,
    type,
    power,
    cost,
    level: 0
  });

  saveMsdqDatabase(adminDb);
  alert(`✅ New Hardware Rig "${name}" added to User App Shop!`);
}

function renderAdminWithdrawals() {
  const box = document.getElementById('adminWithdrawQueue');
  if (adminDb.withdrawals.length === 0) {
    box.innerHTML = '<p class="text-slate-500">No withdrawal requests in queue.</p>';
    return;
  }

  box.innerHTML = adminDb.withdrawals.map((w, idx) => `
    <div class="bg-slate-900 p-3.5 rounded-2xl flex flex-wrap justify-between items-center gap-2 border border-slate-800">
      <div>
        <p class="font-bold text-white">${w.id} • ${w.amount} MSDQ ($${w.usdtVal} USDT) via ${w.method}</p>
        <p class="text-slate-400">Account: <span class="text-cyan-300 font-mono">${w.account}</span> • Status: <strong>${w.status}</strong></p>
      </div>
      <div class="flex gap-2">
        <button onclick="updateWithdrawStatus(${idx}, 'Approved')" class="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold">Approve</button>
        <button onclick="updateWithdrawStatus(${idx}, 'Rejected')" class="px-3 py-1.5 rounded-lg bg-red-500 text-white font-bold">Reject & Refund</button>
      </div>
    </div>
  `).join('');
}

function updateWithdrawStatus(index, newStatus) {
  const item = adminDb.withdrawals[index];
  if (item.status !== 'Pending') {
    alert('This transaction has already been processed.');
    return;
  }
  if (newStatus === 'Rejected') {
    adminDb.user.balance += item.amount;
  }
  item.status = newStatus;
  saveMsdqDatabase(adminDb);
  populateAdminDashboard();
}

function resetEntireDatabase() {
  if (confirm('Are you sure you want to reset all MSDQ Network data to factory defaults?')) {
    localStorage.removeItem(MSDQ_STORAGE_KEY);
    location.reload();
  }
}
