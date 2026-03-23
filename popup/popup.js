import Storage from '../lib/storage.js';

const $ = (id) => document.getElementById(id);

// ── View management ────────────────────────────────────────────────────────
const VIEWS = ['authSection', 'dashboard', 'settingsPanel'];
function showView(id) {
  VIEWS.forEach((v) => $(`${v}`) && $(`${v}`).classList.toggle('hidden', v !== id));
}

// ── Theme ──────────────────────────────────────────────────────────────────
let darkMode = localStorage.getItem('jes-dark') === '1';
function applyTheme() {
  document.body.classList.toggle('dark', darkMode);
}
applyTheme();
$('themeBtn').addEventListener('click', () => {
  darkMode = !darkMode;
  localStorage.setItem('jes-dark', darkMode ? '1' : '0');
  applyTheme();
});

// ── Auth check on open ─────────────────────────────────────────────────────
async function init() {
  chrome.runtime.sendMessage({ action: 'checkAuth' }, (res) => {
    if (res?.authenticated) {
      loadDashboard();
    } else {
      showView('authSection');
    }
  });
}

// ── Dashboard ──────────────────────────────────────────────────────────────
async function loadDashboard() {
  showView('dashboard');
  const stats = await Storage.getStats();

  $('statAccepted').textContent   = stats.totalAccepted;
  $('statRejected').textContent   = stats.totalRejected;
  $('statInterviews').textContent = stats.totalInterviews;
  $('statPromotions').textContent = stats.totalPromotions;

  const total = stats.totalAccepted + stats.totalRejected;
  if (total > 0) {
    const pct = Math.round((stats.totalAccepted / total) * 100);
    $('acceptanceRate').textContent = `${pct}%`;
    $('acceptanceBar').style.width = `${pct}%`;
  }

  if (stats.lastScan) {
    const d = new Date(stats.lastScan);
    $('lastScanInfo').textContent = `Last scan: ${d.toLocaleString()}`;
  }

  await loadActivity();
}

async function loadActivity() {
  const log = await Storage.getActivityLog(15);
  const list = $('activityList');

  if (!log.length) {
    list.innerHTML = '<div class="empty-msg">No activity yet — try scanning now.</div>';
    return;
  }

  const icons = {
    job_acceptance:    '✅',
    job_rejection:     '❌',
    interview_request: '📅',
    application_sent:  '📤',
    pending:           '⏳',
    promotion:         '🗂'
  };

  list.innerHTML = log.map((item) => `
    <div class="activity-item">
      <span class="activity-icon">${icons[item.type] || '📧'}</span>
      <div class="activity-body">
        <div class="activity-subject">${escapeHtml(item.subject || '(no subject)')}</div>
        <div class="activity-meta">${escapeHtml(item.from || '')} · ${timeAgo(item.timestamp)}</div>
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000)  return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}

// ── Scan Now ──────────────────────────────────────────────────────────────
$('scanNowBtn').addEventListener('click', () => {
  const btn = $('scanNowBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Scanning…';
  chrome.runtime.sendMessage({ action: 'scanNow' }, async () => {
    btn.disabled = false;
    btn.textContent = '🔍 Scan Now';
    await loadDashboard();
  });
});

$('openGmailBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://mail.google.com' });
});

// ── Sign In ────────────────────────────────────────────────────────────────
$('signInBtn').addEventListener('click', () => {
  $('signInBtn').disabled = true;
  $('signInBtn').textContent = 'Signing in…';
  chrome.runtime.sendMessage({ action: 'signIn' }, (res) => {
    if (res?.token) {
      loadDashboard();
    } else {
      $('signInBtn').disabled = false;
      $('signInBtn').textContent = 'Sign in with Google';
      alert('Sign-in failed: ' + (res?.error || 'Unknown error'));
    }
  });
});

// ── Settings panel ────────────────────────────────────────────────────────
$('settingsBtn').addEventListener('click', async () => {
  await openSettings();
});

async function openSettings() {
  const s = await Storage.getSettings();
  $('sAutoLabel').checked     = !!s.autoLabel;
  $('sStarAccept').checked    = !!s.starAcceptances;
  $('sAutoArchive').checked   = !!s.autoArchivePromotions;
  $('sNotifications').checked = !!s.notificationsEnabled;
  $('sShowBadges').checked    = !!s.showBadges;
  $('sScanInterval').value    = String(s.scanInterval || 15);
  $('saveMsg').classList.add('hidden');
  showView('settingsPanel');
}

$('backBtn').addEventListener('click', () => { showView('dashboard'); });

$('saveSettingsBtn').addEventListener('click', async () => {
  const settings = {
    autoLabel:              $('sAutoLabel').checked,
    starAcceptances:        $('sStarAccept').checked,
    autoArchivePromotions:  $('sAutoArchive').checked,
    notificationsEnabled:   $('sNotifications').checked,
    showBadges:             $('sShowBadges').checked,
    scanInterval:           parseInt($('sScanInterval').value, 10)
  };

  chrome.runtime.sendMessage({ action: 'updateSettings', settings }, () => {
    $('saveMsg').classList.remove('hidden');
    setTimeout(() => $('saveMsg').classList.add('hidden'), 2000);
  });
});

$('signOutBtn').addEventListener('click', () => {
  if (!confirm('Sign out and stop monitoring emails?')) return;
  chrome.runtime.sendMessage({ action: 'signOut' }, () => {
    showView('authSection');
  });
});

init();