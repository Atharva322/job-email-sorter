const GMAIL_BASE = 'https://www.googleapis.com/gmail/v1/users/me';

class GmailAPI {
  constructor(token) {
    this.token = token;
    this._labelCache = {};
  }

  _fetch(endpoint, options) {
    const opts = options || {};
    const url = GMAIL_BASE + endpoint;
    return fetch(url, {
      method: opts.method || 'GET',
      headers: {
        Authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json'
      },
      body: opts.body || undefined
    }).then(function(res) {
      if (!res.ok) {
        return res.text().then(function(text) {
          throw new Error('Gmail API ' + res.status + ': ' + text);
        });
      }
      return res.json();
    });
  }

  getMessages(query, maxResults) {
    const q = query || '';
    const max = maxResults || 50;
    return this._fetch('/messages?q=' + encodeURIComponent(q) + '&maxResults=' + max)
      .then(function(data) { return data.messages || []; });
  }

  getUnprocessedMessages() {
    return this.getMessages('-label:Jobs/Processed is:unread newer_than:14d', 100);
  }

  getMessage(id) {
    return this._fetch('/messages/' + id + '?format=full');
  }

  getAllLabels() {
    return this._fetch('/labels').then(function(data) { return data.labels || []; });
  }

  ensureLabel(name, color) {
    const self = this;
    if (self._labelCache[name]) {
      return Promise.resolve(self._labelCache[name]);
    }
    return self.getAllLabels().then(function(labels) {
      const existing = labels.find(function(l) { return l.name === name; });
      if (existing) {
        self._labelCache[name] = existing.id;
        return existing.id;
      }
      const body = { name: name, labelListVisibility: 'labelShow', messageListVisibility: 'show' };
      if (color) body.color = color;
      return self._fetch('/labels', { method: 'POST', body: JSON.stringify(body) })
        .then(function(created) {
          self._labelCache[name] = created.id;
          return created.id;
        });
    });
  }

  applyLabel(messageId, category) {
    const self = this;
    const info = self._getCategoryLabel(category);
    return self.ensureLabel(info.name, info.color).then(function(labelId) {
      return self._fetch('/messages/' + messageId + '/modify', {
        method: 'POST',
        body: JSON.stringify({ addLabelIds: [labelId] })
      });
    });
  }

  markAsProcessed(messageId) {
    const self = this;
    return self.ensureLabel('Jobs/Processed', { backgroundColor: '#cccccc', textColor: '#000000' })
      .then(function(labelId) {
        return self._fetch('/messages/' + messageId + '/modify', {
          method: 'POST',
          body: JSON.stringify({ addLabelIds: [labelId] })
        });
      });
  }

  starMessage(messageId) {
    return this._fetch('/messages/' + messageId + '/modify', {
      method: 'POST',
      body: JSON.stringify({ addLabelIds: ['STARRED'] })
    });
  }

  archiveMessage(messageId) {
    return this._fetch('/messages/' + messageId + '/modify', {
      method: 'POST',
      body: JSON.stringify({ removeLabelIds: ['INBOX'] })
    });
  }

  _getCategoryLabel(category) {
    const map = {
      job_acceptance:    { name: 'Jobs/Responses/Accepted',           color: { backgroundColor: '#16a766', textColor: '#ffffff' } },
      job_rejection:     { name: 'Jobs/Responses/Rejected',           color: { backgroundColor: '#cc3a21', textColor: '#ffffff' } },
      interview_request: { name: 'Jobs/Responses/Interview Requests', color: { backgroundColor: '#1c4587', textColor: '#ffffff' } },
      application_sent:  { name: 'Jobs/Applications/Sent',            color: { backgroundColor: '#4a86e8', textColor: '#ffffff' } },
      pending:           { name: 'Jobs/Responses/Pending',            color: { backgroundColor: '#f6c026', textColor: '#000000' } },
      promotion:         { name: 'Promotions/Auto-Filtered',          color: { backgroundColor: '#999999', textColor: '#ffffff' } }
    };
    return map[category] || { name: 'Jobs/Uncategorized', color: null };
  }
}

export default GmailAPI;