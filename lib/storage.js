var Storage = {
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

  getSettings: function() {
    return Storage.getSync(['settings']).then(function(data) {
      return data.settings || {
        autoLabel: true,
        autoArchivePromotions: false,
        starAcceptances: true,
        scanInterval: 15,
        notificationsEnabled: true,
        showBadges: true
      };
    });
  },

  saveSettings: function(settings) {
    return Storage.setSync({ settings: settings });
  },

  getStats: function() {
    return Storage.getLocal(['stats']).then(function(data) {
      return data.stats || {
        totalProcessed: 0,
        totalAccepted: 0,
        totalRejected: 0,
        totalPromotions: 0,
        totalInterviews: 0,
        lastScan: null
      };
    });
  },

  updateStats: function(delta) {
    return Storage.getStats().then(function(cur) {
      return Storage.setLocal({
        stats: {
          totalProcessed:  (cur.totalProcessed  || 0) + (delta.processed  || 0),
          totalAccepted:   (cur.totalAccepted   || 0) + (delta.accepted   || 0),
          totalRejected:   (cur.totalRejected   || 0) + (delta.rejected   || 0),
          totalPromotions: (cur.totalPromotions || 0) + (delta.promotions || 0),
          totalInterviews: (cur.totalInterviews || 0) + (delta.interviews || 0),
          lastScan: new Date().toISOString()
        }
      });
    });
  },

  logActivity: function(entry) {
    return Storage.getLocal(['activityLog']).then(function(data) {
      var log = data.activityLog || [];
      log.unshift({
        type: entry.type,
        subject: entry.subject,
        from: entry.from,
        confidence: entry.confidence,
        timestamp: Date.now()
      });
      if (log.length > 200) log.length = 200;
      return Storage.setLocal({ activityLog: log });
    });
  },

  getActivityLog: function(limit) {
    return Storage.getLocal(['activityLog']).then(function(data) {
      return (data.activityLog || []).slice(0, limit || 20);
    });
  }
};

export default Storage;