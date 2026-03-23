const $ = (id) => document.getElementById(id);

// ── View management ──────────────────────────────────────────────────────────
function showView(id) {
  ['authSection', 'dashboard', 'settingsPanel'].forEach(function(v) {
    var el = $(v);
    if (el) el.classList.toggle('hidden', v !== id);
  });
}

// ── Theme ────────────────────────────────────────────────────────────────────
var darkMode = localStorage.getItem('jes-dark') === '1';
function applyTheme() {
  document.body.classList.toggle('dark', darkMode);
}
applyTheme();
$('themeBtn').addEventListener('click', function() {
  darkMode = !darkMode;
  localStorage.setItem('jes-dark', darkMode ? '1' : '0');
  applyTheme();
});

// ── Storage helpers (no import needed) ───────────────────────────────────────
function getSettings() {
  return new Promise(function(resolve) {
    chrome.storage.sync.get(['settings'], function(data) {
      resolve(data.settings || {
        autoLabel: true, autoArchivePromotions: false,
        starAcceptances: true, scanInterval: 15,
        notificationsEnabled: true, showBadges: true
      });
    });
  });
}

function saveSettings(settings) {
  return new Promise(function(resolve) {
    chrome.storage.sync.set({ settings: settings }, resolve);
  });
}

function getStats() {
  return new Promise(function(resolve) {
    chrome.storage.local.get(['stats'], function(data) {
      resolve(data.stats || {
        totalProcessed: 0, totalAccepted: 0, totalRejected: 0,
        totalPromotions: 0, totalInterviews: 0, lastScan: null
      });
    });
  });
}

function getActivityLog(limit) {
  return new Promise(function(resolve) {
    chrome.storage.local.get(['activityLog'], function(data) {
      resolve((data.activityLog || []).slice(0, limit || 20));
    });
  });
}

// ── Init ─────────────────────────────────────────────────────────────────────
function init() {
  chrome.runtime.sendMessage({ action: 'checkAuth' }, function(res) {
    if (res && res.authenticated) {
      loadDashboard();
    } else {
      showView('authSection');
    }
  });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function loadDashboard() {
  showView('dashboard');
  getStats().then(function(stats) {
    $('statAccepted').textContent   = stats.totalAccepted || 0;
    $('statRejected').textContent   = stats.totalRejected || 0;
    $('statInterviews').textContent = stats.totalInterviews || 0;
    $('statPromotions').textContent = stats.totalPromotions || 0;

    var total = (stats.totalAccepted || 0) + (stats.totalRejected || 0);
    if (total > 0) {
      var pct = Math.round((stats.totalAccepted / total) * 100);
      $('acceptanceRate').textContent = pct + '%';
      $('acceptanceBar').style.width  = pct + '%';
    }

    if (stats.lastScan) {
      $('lastScanInfo').textContent = 'Last scan: ' + new Date(stats.lastScan).toLocaleString();
    }
  });

  loadActivity();
}

function loadActivity() {
  getActivityLog(15).then(function(log) {
    var list = $('activityList');
    if (!log.length) {
      list.innerHTML = '<div class="empty-msg">No activity yet — try scanning now.</div>';
      return;
    }
    var icons = {
      job_acceptance: '✅', job_rejection: '❌',
      interview_request: '📅', application_sent: '📤',
      pending: '⏳', promotion: '🗂'
    };
    list.innerHTML = log.map(function(item) {
      return '<div class="activity-item">' +
        '<span class="activity-icon">' + (icons[item.type] || '📧') + '</span>' +
        '<div class="activity-body">' +
          '<div class="activity-subject">' + escHtml(item.subject || '(no subject)') + '</div>' +
          '<div class="activity-meta">' + escHtml(item.from || '') + ' · ' + timeAgo(item.timestamp) + '</div>' +
        '</div></div>';
    }).join('');
  });
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function timeAgo(ts) {
  var diff = Date.now() - ts;
  if (diff < 60000)    return 'just now';
  if (diff < 3600000)  return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return Math.floor(diff / 86400000) + 'd ago';
}

// ── Scan Now ──────────────────────────────────────────────────────────────────
$('scanNowBtn').addEventListener('click', function() {
  var btn = $('scanNowBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Scanning…';
  chrome.runtime.sendMessage({ action: 'scanNow' }, function() {
    btn.disabled = false;
    btn.textContent = '🔍 Scan Now';
    loadDashboard();
  });
});

$('openGmailBtn').addEventListener('click', function() {
  chrome.tabs.create({ url: 'https://mail.google.com' });
});

// ── Sign In ───────────────────────────────────────────────────────────────────
$('signInBtn').addEventListener('click', function() {
  var btn = $('signInBtn');
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  chrome.runtime.sendMessage({ action: 'signIn' }, function(res) {
    if (res && res.token) {
      loadDashboard();
    } else {
      btn.disabled = false;
      btn.textContent = 'Sign in with Google';
      alert('Sign-in failed: ' + ((res && res.error) || 'Unknown error'));
    }
  });
});

// ── Settings ──────────────────────────────────────────────────────────────────
$('settingsBtn').addEventListener('click', function() {
  getSettings().then(function(s) {
    $('sAutoLabel').checked     = !!s.autoLabel;
    $('sStarAccept').checked    = !!s.starAcceptances;
    $('sAutoArchive').checked   = !!s.autoArchivePromotions;
    $('sNotifications').checked = !!s.notificationsEnabled;
    $('sShowBadges').checked    = !!s.showBadges;
    $('sScanInterval').value    = String(s.scanInterval || 15);
    $('saveMsg').classList.add('hidden');
    showView('settingsPanel');
  });
});

$('backBtn').addEventListener('click', function() { showView('dashboard'); });

$('saveSettingsBtn').addEventListener('click', function() {
  var settings = {
    autoLabel:             $('sAutoLabel').checked,
    starAcceptances:       $('sStarAccept').checked,
    autoArchivePromotions: $('sAutoArchive').checked,
    notificationsEnabled:  $('sNotifications').checked,
    showBadges:            $('sShowBadges').checked,
    scanInterval:          parseInt($('sScanInterval').value, 10)
  };
  chrome.runtime.sendMessage({ action: 'updateSettings', settings: settings }, function() {
    $('saveMsg').classList.remove('hidden');
    setTimeout(function() { $('saveMsg').classList.add('hidden'); }, 2000);
  });
});

$('signOutBtn').addEventListener('click', function() {
  if (!confirm('Sign out and stop monitoring emails?')) return;
  chrome.runtime.sendMessage({ action: 'signOut' }, function() {
    showView('authSection');
  });
});

init();