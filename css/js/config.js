const MSDQ_STORAGE_KEY = 'MSDQ_NETWORK_MASTER_DB_V1';

const DEFAULT_MSDQ_DATABASE = {
  settings: {
    coinSymbol: 'MSDQ',
    coinPriceUsdt: 0.05,
    baseTapReward: 1.0,
    baseAutoRatePerSec: 0.5,
    adRewardAmount: 50,
    dailyAdLimit: 5,
    minWithdrawAmount: 1000,
    announcement: 'MSDQ Network Mainnet Phase 1 is LIVE! Check in daily & boost your nodes.',
    dailyCheckinRewards: [25, 50, 100, 175, 250, 400, 1000]
  },
  boosters: [
    { id: 'rig_1', name: 'MSDQ Nano Chip', desc: '+0.5 MSDQ / tap power', cost: 100, type: 'tap', power: 0.5, level: 1 },
    { id: 'rig_2', name: 'Cyber GPU Node v2', desc: '+1.5 MSDQ / sec auto-mining', cost: 250, type: 'auto', power: 1.5, level: 1 },
    { id: 'rig_3', name: 'Quantum Validator Rig', desc: '+6.0 MSDQ / sec auto-mining', cost: 900, type: 'auto', power: 6.0, level: 0 },
    { id: 'rig_4', name: 'Fusion Energy Capacitor', desc: '+500 Max Node Energy', cost: 300, type: 'energy', power: 500, level: 1 }
  ],
  tasks: [
    { id: 'task_tg', title: 'Join MSDQ Official Telegram', reward: 150, claimed: false },
    { id: 'task_x', title: 'Follow MSDQ Network on X', reward: 150, claimed: false },
    { id: 'task_ref', title: 'Invite 1 Pioneer Miner', reward: 300, claimed: false }
  ],
  user: {
    uid: '#MSDQ-8841',
    username: 'Shahid_Pioneer',
    balance: 120.0,
    tapPower: 1.0,
    autoRate: 0.5,
    energy: 1000,
    maxEnergy: 1000,
    freeBatteryRefills: 3,
    activeMultiplier: 1.0,
    streakDays: 1,
    lastCheckinDate: null,
    adsWatchedToday: 0,
    banned: false
  },
  withdrawals: []
};

function loadMsdqDatabase() {
  const raw = localStorage.getItem(MSDQ_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(MSDQ_STORAGE_KEY, JSON.stringify(DEFAULT_MSDQ_DATABASE));
    return JSON.parse(JSON.stringify(DEFAULT_MSDQ_DATABASE));
  }
  return JSON.parse(raw);
}

function saveMsdqDatabase(dbObject) {
  localStorage.setItem(MSDQ_STORAGE_KEY, JSON.stringify(dbObject));
}
