import AUTH from './auth.js';
import GmailAPI from '../lib/gmail-api.js';
import EmailClassifier from '../lib/classifier.js';
import Storage from '../lib/storage.js';

let patternsCache = null;

async function loadPatterns() {
  if (patternsCache) return patternsCache;
  const url = chrome.runtime.getURL('config/patterns.json');
  const res = await fetch(url);
  patternsCache = await res.json();
  return patternsCache;
}

chrome.runtime.onInstalled.addListener(async function(details) {
  if (details.reason === 'install') {
    await Storage.saveSettings({
      autoLabel: true,
      autoArchivePromotions: false,
      starAcceptances: true,
      scanInterval: 15,
      notificationsEnabled: true,
      showBadges: true
    });
    setupAlarm(15);
  } else if (details.reason === 'update') {
    const settings = await Storage.getSettings();
    setupAlarm(settings.scanInterval || 15);
  }
});

chrome.alarms.onAlarm.addListener(async function(alarm) {
  if (alarm.name === 'periodicScan') {
    await performScan();
  }
});

function setupAlarm(intervalMinutes) {
  chrome.alarms.clearAll(function() {
    chrome.alarms.create('periodicScan', {
      delayInMinutes: intervalMinutes,
      periodInMinutes: intervalMinutes
    });
  });
}

async function performScan() {
  let token;
  try {
    token = await AUTH.getToken(false);
  } catch (e) {
    return;
  }
  if (!token) return;

  const settings = await Storage.getSettings();
  const patterns = await loadPatterns();
  const gmailAPI = new GmailAPI(token);
  const classifier = new EmailClassifier(patterns);

  const stats = {
    processed: 0,
    accepted: 0,
    rejected: 0,
    promotions: 0,
    interviews: 0
  };

  try {
    const messages = await gmailAPI.getUnprocessedMessages();

    for (let i = 0; i < messages.length; i++) {
      const msgInfo = messages[i];
      try {
        const message = await gmailAPI.getMessage(msgInfo.id);
        const result = classifier.classify(message);

        if (result.category === 'unknown') continue;

        if (settings.autoLabel) {
          await gmailAPI.applyLabel(msgInfo.id, result.category);
          await gmailAPI.markAsProcessed(msgInfo.id);
        }

        if (result.category === 'job_acceptance') {
          if (settings.starAcceptances) await gmailAPI.starMessage(msgInfo.id);
          stats.accepted += 1;
        } else if (result.category === 'job_rejection') {
          stats.rejected += 1;
        } else if (result.category === 'promotion') {
          if (settings.autoArchivePromotions) await gmailAPI.archiveMessage(msgInfo.id);
          stats.promotions += 1;
        } else if (result.category === 'interview_request') {
          stats.interviews += 1;
        }

        await Storage.logActivity({
          type: result.category,
          subject: result.subject || '(no subject)',
          from: result.from || '',
          confidence: result.confidence
        });

        stats.processed += 1;
      } catch (msgErr) {
        console.warn('Error processing message', msgInfo.id, msgErr);
      }
    }

    await Storage.updateStats(stats);

    if (stats.accepted > 0 && settings.notificationsEnabled) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: 'Job Application Update!',
        message: 'You have ' + stats.accepted + ' new acceptance email' + (stats.accepted > 1 ? 's' : '') + '!',
        priority: 2
      });
    }
  } catch (err) {
    if (err.message && (err.message.includes('401') || err.message.includes('Invalid Credentials'))) {
      await AUTH.refreshToken().catch(function() {});
    }
    console.error('Scan failed:', err);
  }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'scanNow') {
    performScan()
      .then(function() { sendResponse({ success: true }); })
      .catch(function(e) { sendResponse({ success: false, error: e.message }); });
    return true;

  } else if (request.action === 'signIn') {
    AUTH.getToken(true)
      .then(async function(token) {
        const settings = await Storage.getSettings();
        setupAlarm(settings.scanInterval || 15);
        sendResponse({ token: token });
      })
      .catch(function(e) { sendResponse({ error: e.message }); });
    return true;

  } else if (request.action === 'signOut') {
    AUTH.signOut()
      .then(function() { sendResponse({ success: true }); })
      .catch(function(e) { sendResponse({ error: e.message }); });
    return true;

  } else if (request.action === 'checkAuth') {
    AUTH.isAuthenticated()
      .then(function(auth) { sendResponse({ authenticated: auth }); })
      .catch(function() { sendResponse({ authenticated: false }); });
    return true;

  } else if (request.action === 'updateSettings') {
    Storage.saveSettings(request.settings)
      .then(function() {
        setupAlarm(request.settings.scanInterval || 15);
        sendResponse({ success: true });
      })
      .catch(function(e) { sendResponse({ error: e.message }); });
    return true;

  } else if (request.action === 'reclassify') {
    handleReclassify(request.messageId, request.category)
      .then(function() { sendResponse({ success: true }); })
      .catch(function(e) { sendResponse({ error: e.message }); });
    return true;
  }
});

async function handleReclassify(messageId, category) {
  const token = await AUTH.getToken(false);
  const gmailAPI = new GmailAPI(token);
  await gmailAPI.applyLabel(messageId, category);
  const data = await Storage.getLocal(['feedbackData']);
  const feedback = data.feedbackData || [];
  feedback.push({ messageId: messageId, userCategory: category, timestamp: Date.now() });
  if (feedback.length > 500) feedback.splice(0, feedback.length - 500);
  await Storage.setLocal({ feedbackData: feedback });
}