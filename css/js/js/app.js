let db = loadMsdqDatabase();
let overdriveTimeout = null;
let blockDecryptCooldown = false;

// Initialize Application on Load
window.addEventListener('DOMContentLoaded', () => {
  syncRatesWithAdminConfig();
  renderAllSections();
  startAutonomousMiningLoop();
});

// Listen for live changes made from Admin Panel in another tab
window.addEventListener('storage', () => {
  db = loadMsdqDatabase();
  renderAllSections();
});

function syncRatesWithAdminConfig() {
  if (db.user.tapPower < db.settings.baseTapReward) {
    db.user.tapPower = db.settings.baseTapReward;
  }
  if (db.user.autoRate < db.settings.baseAutoRatePerSec) {
    db.user.autoRate = db.settings.baseAutoRatePerSec;
  }
  saveMsdqDatabase(db);
}

function renderAllSections() {
  if (db.user.banned) {
    document.body.innerHTML = `
      <div class="min-h-screen flex items-center justify-center p-6 text-center bg-slate-950 text-white">
        <div class="glass-card p-6 rounded-3xl max-w-sm border border-red-500/40">
          <h2 class="font-cyber text-xl text-red-400 font-bold mb-2">ACCOUNT SUSPENDED</h2>
          <p class="text-xs text-slate-300">Your miner UID (${db.user.uid}) has been restricted by MSDQ Network Admin.</p>
        </div>
      </div>`;
    return;
  }

  // Top Header & Banner
  document.getElementById('announcementText').innerText = db.settings.announcement;
  document.getElementById('displayUsername').innerText = db.user.username;
  document.getElementById('displayUid').innerText = db.user.uid;

  const effectiveAuto = (db.user.autoRate * db.user.activeMultiplier).toFixed(2);
  const effectiveTap = (db.user.tapPower * db.user.activeMultiplier).toFixed(2);

  document.getElementById('headerHashrate').innerText = (effectiveAuto * 2.4).toFixed(2);
  document.getElementById('mainMsdqBalance').innerText = db.user.balance.toFixed(2);
  document.getElementById('mainUsdtValue').innerText = (db.user.balance * db.settings.coinPriceUsdt).toFixed(4);
  document.getElementById('liveCoinPrice').innerText = db.settings.coinPriceUsdt;

  document.getElementById('statTapPower').innerText = effectiveTap;
  document.getElementById('statAutoRate').innerText = effectiveAuto;
  document.getElementById('statMultiplier').innerText = db.user.activeMultiplier.toFixed(1) + 'x';

  // Rank Badge Calculation
  const rankEl = document.getElementById('minerRankBadge');
  if (db.user.balance >= 10000) rankEl.innerText = 'Genesis Whale';
  else if (db.user.balance >= 2500) rankEl.innerText = 'Validator Pro';
  else if (db.user.balance >= 500) rankEl.innerText = 'Node Operator';
  else rankEl.innerText = 'Pioneer v1';

  // Energy UI
  document.getElementById('energyCurrent').innerText = Math.floor(db.user.energy);
  document.getElementById('energyMaximum').innerText = db.user.maxEnergy;
  const energyPct = Math.min(100, (db.user.energy / db.user.maxEnergy) * 100);
  document.getElementById('energyProgressBar').style.width = energyPct + '%';

  // Quick Ad & Streak Info
  const adsLeft = Math.max(0, db.settings.dailyAdLimit - db.user.adsWatchedToday);
  document.getElementById('quickAdRewardText').innerText = db.settings.adRewardAmount;
  document.getElementById('adsLeftText').innerText = `${adsLeft}/${db.settings.dailyAdLimit}`;
  document.getElementById('earnAdRewardVal').innerText = db.settings.adRewardAmount;
  document.getElementById('earnAdQuotaVal').innerText = `${adsLeft} / ${db.settings.dailyAdLimit}`;
  document.getElementById('batteryBoostCount').innerText = `${db.user.freeBatteryRefills}/3 Free`;
  document.getElementById('minWithdrawText').innerText = db.settings.minWithdrawAmount.toLocaleString();

  renderCheckinGrid();
  renderSocialTasks();
  renderBoosterShop();
  renderUserWithdrawals();
}

// 1. Core Tap-to-Mine Handler
function handleCoreTap(event) {
  const tapCost = db.user.tapPower;
  if (db.user.energy < tapCost) return;

  const reward = db.user.tapPower * db.user.activeMultiplier;
  db.user.balance += reward;
  db.user.energy -= tapCost;

  spawnFloatingIndicator(event.clientX, event.clientY, `+${reward.toFixed(1)} MSDQ`);
  saveMsdqDatabase(db);
  renderAllSections();
}

function spawnFloatingIndicator(x, y, text) {
  const floatEl = document.createElement('div');
  floatEl.className = 'floating-tap';
  floatEl.innerText = text;
  floatEl.style.left = (x - 30) + 'px';
  floatEl.style.top = (y - 30) + 'px';
  document.body.appendChild(floatEl);
  setTimeout(() => floatEl.remove(), 800);
}

// 2. 7-Day Daily Check-In System
function renderCheckinGrid() {
  const grid = document.getElementById('checkinGridContainer');
  if (!grid) return;
  grid.innerHTML = '';

  const todayStr = new Date().toDateString();
  const isClaimedToday = db.user.lastCheckinDate === todayStr;

  document.getElementById('earnStreakBadge').innerText = db.user.streakDays;
  document.getElementById('streakStatusText').innerText = isClaimedToday
    ? `Day ${db.user.streakDays} Claimed ✓`
    : `Day ${db.user.streakDays} Drop Ready!`;

  db.settings.dailyCheckinRewards.forEach((rewardAmt, index) => {
    const dayNum = index + 1;
    const isCurrent = dayNum === db.user.streakDays;
    const isPassed = dayNum < db.user.streakDays || (isCurrent && isClaimedToday);

    grid.innerHTML += `
      <div class="p-2.5 rounded-xl text-center border ${
        isPassed
          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
          : isCurrent
          ? 'bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse'
          : 'bg-slate-900/80 border-slate-800 text-slate-400'
      }">
        <p class="text-[10px] font-bold">DAY ${dayNum}</p>
        <p class="font-cyber text-xs font-extrabold my-1">+${rewardAmt}</p>
        <p class="text-[9px] uppercase">${isPassed ? 'Claimed' : 'MSDQ'}</p>
      </div>
    `;
  });

  const btn = document.getElementById('claimDailyMainBtn');
  if (btn) {
    btn.innerText = isClaimedToday ? 'TODAY\'S REWARD CLAIMED ✓' : 'CLAIM TODAY\'S DROP';
    btn.disabled = isClaimedToday;
    btn.className = isClaimedToday
      ? 'w-full py-2.5 rounded-xl bg-slate-800 text-slate-400 font-cyber font-bold text-xs cursor-not-allowed'
      : 'w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-cyber font-bold text-xs shadow-lg active:scale-95';
  }
}

function claimDailyCheckIn() {
  const todayStr = new Date().toDateString();
  if (db.user.lastCheckinDate === todayStr) {
    alert('You have already claimed your MSDQ Daily Check-in today!');
    return;
  }

  const rewardIndex = Math.min(
    db.user.streakDays - 1,
    db.settings.dailyCheckinRewards.length - 1
  );
  const rewardEarned = db.settings.dailyCheckinRewards[rewardIndex];

  db.user.balance += rewardEarned;
  db.user.lastCheckinDate = todayStr;
  db.user.streakDays = db.user.streakDays >= 7 ? 1 : db.user.streakDays + 1;

  saveMsdqDatabase(db);
  renderAllSections();
  alert(`🎉 Daily Check-In Complete! +${rewardEarned} $MSDQ added to your wallet.`);
}

function openDailyCheckinModal() {
  const earnNavBtn = document.querySelectorAll('.nav-item')[1];
  switchNavigation('earn', earnNavBtn);
}

// 3. Watch Video Ads System
function triggerWatchAd() {
  if (db.user.adsWatchedToday >= db.settings.dailyAdLimit) {
    alert('Daily Video Ad quota reached! Come back tomorrow for more sponsored nodes.');
    return;
  }

  const modal = document.getElementById('adOverlayModal');
  const bar = document.getElementById('adTimerBar');
  const label = document.getElementById('adCountdownLabel');

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  bar.style.width = '0%';

  let secondsLeft = 5;
  label.innerText = `Reward unlocking in ${secondsLeft}s...`;

  const interval = setInterval(() => {
    secondsLeft--;
    const pct = ((5 - secondsLeft) / 5) * 100;
    bar.style.width = pct + '%';

    if (secondsLeft > 0) {
      label.innerText = `Reward unlocking in ${secondsLeft}s...`;
    } else {
      clearInterval(interval);
      modal.classList.add('hidden');
      modal.classList.remove('flex');

      db.user.balance += db.settings.adRewardAmount;
      db.user.adsWatchedToday += 1;
      saveMsdqDatabase(db);
      renderAllSections();
      alert(`✅ Ad Verified! +${db.settings.adRewardAmount} $MSDQ credited to your balance.`);
    }
  }, 1000);
}

// 4. Mining Boosters & Hardware Shop
function renderBoosterShop() {
  const container = document.getElementById('boosterShopContainer');
  if (!container) return;
  container.innerHTML = '';

  db.boosters.forEach((item, index) => {
    container.innerHTML += `
      <div class="glass-card p-3.5 rounded-2xl flex items-center justify-between border border-slate-800">
        <div>
          <div class="flex items-center gap-2">
            <h4 class="font-bold text-xs text-white">${item.name}</h4>
            <span class="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-semibold">Lvl ${item.level}</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-0.5">${item.desc}</p>
        </div>
        <button onclick="purchaseHardwareRig(${index})" class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-cyber font-bold text-xs active:scale-95">
          ${item.cost} MSDQ
        </button>
      </div>
    `;
  });
}

function purchaseHardwareRig(index) {
  const rig = db.boosters[index];
  if (db.user.balance < rig.cost) {
    alert(`Insufficient $MSDQ! You need ${rig.cost} MSDQ to upgrade ${rig.name}.`);
    return;
  }

  db.user.balance -= rig.cost;
  rig.level += 1;
  rig.cost = Math.floor(rig.cost * 1.65);

  if (rig.type === 'tap') db.user.tapPower += rig.power;
  if (rig.type === 'auto') db.user.autoRate += rig.power;
  if (rig.type === 'energy') {
    db.user.maxEnergy += rig.power;
    db.user.energy = db.user.maxEnergy;
  }

  saveMsdqDatabase(db);
  renderAllSections();
}

function useFullBatteryBooster() {
  if (db.user.freeBatteryRefills <= 0) {
    alert('No free energy refills left today!');
    return;
  }
  db.user.freeBatteryRefills -= 1;
  db.user.energy = db.user.maxEnergy;
  saveMsdqDatabase(db);
  renderAllSections();
}

function activateOverdriveMultiplier() {
  if (db.user.activeMultiplier > 1.0) {
    alert('Nitro Overdrive is already running!');
    return;
  }
  if (db.user.balance < 150) {
    alert('Need 150 $MSDQ to activate 2x Nitro Overdrive!');
    return;
  }

  db.user.balance -= 150;
  db.user.activeMultiplier = 2.0;
  saveMsdqDatabase(db);
  renderAllSections();

  clearTimeout(overdriveTimeout);
  overdriveTimeout = setTimeout(() => {
    db.user.activeMultiplier = 1.0;
    saveMsdqDatabase(db);
    renderAllSections();
  }, 60000);
}

function activateMiningCycle() {
  db.user.balance += 15;
  document.getElementById('cycleTimerDisplay').innerText = 'Cycle Synced! +15 MSDQ Bonus Drop';
  saveMsdqDatabase(db);
  renderAllSections();
}

// 5. Social Quests
function renderSocialTasks() {
  const box = document.getElementById('socialTasksContainer');
  if (!box) return;
  box.innerHTML = '';

  db.tasks.forEach((t, idx) => {
    box.innerHTML += `
      <div class="bg-slate-900/90 p-3 rounded-xl flex justify-between items-center border border-slate-800">
        <div>
          <p class="text-xs font-bold text-white">${t.title}</p>
          <p class="text-[10px] text-emerald-400">+${t.reward} MSDQ</p>
        </div>
        <button onclick="completeSocialTask(${idx})" ${t.claimed ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg text-xs font-bold ${
          t.claimed ? 'bg-slate-800 text-slate-500' : 'bg-cyan-500 text-slate-950'
        }">
          ${t.claimed ? 'CLAIMED' : 'START'}
        </button>
      </div>
    `;
  });
}

function completeSocialTask(idx) {
  const task = db.tasks[idx];
  if (task.claimed) return;
  task.claimed = true;
  db.user.balance += task.reward;
  saveMsdqDatabase(db);
  renderAllSections();
}

// 6. Arcade Mini-Games
function playQuantumWheel() {
  const msg = document.getElementById('wheelStatusMsg');
  if (db.user.balance < 40) {
    msg.innerText = 'Insufficient balance! Need 40 MSDQ.';
    return;
  }
  db.user.balance -= 40;
  const rewards = [0, 20, 60, 120, 300, 1500];
  const prize = rewards[Math.floor(Math.random() * rewards.length)];
  db.user.balance += prize;
  msg.innerText = prize > 0 ? `🎉 Quantum Win! +${prize} MSDQ credited!` : '⚡ No hit this spin. Try again!';
  saveMsdqDatabase(db);
  renderAllSections();
}

function playHashCrash() {
  const msg = document.getElementById('crashStatusMsg');
  if (db.user.balance < 80) {
    msg.innerText = 'Need 80 MSDQ to launch Hashrate Rocket!';
    return;
  }
  db.user.balance -= 80;
  const mult = (Math.random() * 3.5).toFixed(2);
  if (mult >= 1.25) {
    const win = Math.floor(80 * mult);
    db.user.balance += win;
    msg.innerText = `🚀 Cashed out at ${mult}x! Won +${win} MSDQ!`;
  } else {
    msg.innerText = `💥 Node crashed at ${mult}x!`;
  }
  saveMsdqDatabase(db);
  renderAllSections();
}

function decryptBlock(choice) {
  const msg = document.getElementById('decryptStatusMsg');
  if (blockDecryptCooldown) {
    msg.innerText = '⏳ Cooling down Genesis shards (5s)...';
    return;
  }
  blockDecryptCooldown = true;
  setTimeout(() => (blockDecryptCooldown = false), 5000);

  const correct = Math.floor(Math.random() * 3) + 1;
  if (choice === correct) {
    db.user.balance += 250;
    msg.innerText = '🔓 GENESIS BLOCK DECRYPTED! +250 MSDQ!';
  } else {
    msg.innerText = `🔒 Encrypted! Correct shard was #${correct}.`;
  }
  saveMsdqDatabase(db);
  renderAllSections();
}

// 7. Withdrawals & Navigation
function submitWithdrawalRequest() {
  const method = document.getElementById('payoutMethod').value;
  const account = document.getElementById('payoutAccount').value.trim();
  const amount = parseFloat(document.getElementById('payoutAmount').value);

  if (!account || isNaN(amount) || amount <= 0) {
    alert('Please enter a valid account address and MSDQ amount.');
    return;
  }
  if (amount < db.settings.minWithdrawAmount) {
    alert(`Minimum withdrawal limit is ${db.settings.minWithdrawAmount} MSDQ.`);
    return;
  }
  if (db.user.balance < amount) {
    alert('Insufficient $MSDQ balance!');
    return;
  }

  db.user.balance -= amount;
  db.withdrawals.unshift({
    id: 'TX-' + Math.floor(100000 + Math.random() * 900000),
    uid: db.user.uid,
    method,
    account,
    amount,
    usdtVal: (amount * db.settings.coinPriceUsdt).toFixed(2),
    status: 'Pending',
    timestamp: new Date().toLocaleTimeString()
  });

  document.getElementById('payoutAccount').value = '';
  document.getElementById('payoutAmount').value = '';
  saveMsdqDatabase(db);
  renderAllSections();
  alert('✅ Withdrawal submitted! Admin will review your request in the Admin Panel.');
}

function renderUserWithdrawals() {
  const list = document.getElementById('userWithdrawHistoryList');
  if (!list) return;
  if (db.withdrawals.length === 0) {
    list.innerHTML = '<p class="text-slate-500">No withdrawal requests submitted yet.</p>';
    return;
  }
  list.innerHTML = db.withdrawals.map(w => `
    <div class="bg-slate-900/90 p-2.5 rounded-xl flex justify-between items-center border border-slate-800">
      <div>
        <p class="font-bold text-white">${w.amount} MSDQ ($${w.usdtVal}) • ${w.method}</p>
        <p class="text-[10px] text-slate-400">${w.account} • ${w.timestamp}</p>
      </div>
      <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
        w.status === 'Approved'
          ? 'bg-emerald-500/20 text-emerald-300'
          : w.status === 'Rejected'
          ? 'bg-red-500/20 text-red-300'
          : 'bg-amber-500/20 text-amber-300'
      }">${w.status}</span>
    </div>
  `).join('');
}

function switchNavigation(viewId, btnEl) {
  document.querySelectorAll('.tab-view').forEach(v => v.classList.add('hidden'));
  document.getElementById('view-' + viewId).classList.remove('hidden');

  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active-nav'));
  btnEl.classList.add('active-nav');
}

function startAutonomousMiningLoop() {
  setInterval(() => {
    if (!db.user.banned) {
      const autoGain = db.user.autoRate * db.user.activeMultiplier;
      db.user.balance += autoGain;
      if (db.user.energy < db.user.maxEnergy) {
        db.user.energy = Math.min(db.user.maxEnergy, db.user.energy + 4);
      }
      saveMsdqDatabase(db);
      renderAllSections();
    }
  }, 1000);
}
