const Storage = {
  getLocal: function(keys) {
    return new Promise(function(resolve) {
      chrome.storage.local.get(keys, resolve);
    });
  },

  setLocal: function(data) {
    return new Promise(function(resolve) {
      chrome.storage.local.set(data, resolve);
    });
  },

  getSync: function(keys) {
    return new Promise(function(resolve) {
      chrome.storage.sync.get(keys, resolve);
    });
  },

  setSync: function(data) {
    return new Promise(function(resolve) {
      chrome.storage.sync.set(data, resolve);
    });
  },

  getSettings: async function() {
    const data = await Storage.getSync(['settings']);
    return data.settings || {
      autoLabel: true,
      autoArchivePromotions: false,
      starAcceptances: true,
      scanInterval: 15,
      notificationsEnabled: true,
      showBadges: true
    };
  },

  saveSettings: async function(settings) {
    await Storage.setSync({ settings: settings });
  },

  getStats: async function() {
    const data = await Storage.getLocal(['stats']);
    return data.stats || {
      totalProcessed: 0,
      totalAccepted: 0,
      totalRejected: 0,
      totalPromotions: 0,
      totalInterviews: 0,
      lastScan: null
    };
  },

  updateStats: async function(delta) {
    const cur = await Storage.getStats();
    await Storage.setLocal({
      stats: {
        totalProcessed:  (cur.totalProcessed  || 0) + (delta.processed  || 0),
        totalAccepted:   (cur.totalAccepted   || 0) + (delta.accepted   || 0),
        totalRejected:   (cur.totalRejected   || 0) + (delta.rejected   || 0),
        totalPromotions: (cur.totalPromotions || 0) + (delta.promotions || 0),
        totalInterviews: (cur.totalInterviews || 0) + (delta.interviews || 0),
        lastScan: new Date().toISOString()
      }
    });
  },

  logActivity: async function(entry) {
    const data = await Storage.getLocal(['activityLog']);
    const log = data.activityLog || [];
    log.unshift({ type: entry.type, subject: entry.subject, from: entry.from, confidence: entry.confidence, timestamp: Date.now() });
    if (log.length > 200) log.length = 200;
    await Storage.setLocal({ activityLog: log });
  },

  getActivityLog: async function(limit) {
    const n = limit || 20;
    const data = await Storage.getLocal(['activityLog']);
    return (data.activityLog || []).slice(0, n);
  }
};

export default Storage;