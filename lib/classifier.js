class EmailClassifier {
  constructor(patterns) {
    this.patterns = patterns;
  }

  _parseHeaders(headers) {
    const result = {};
    const list = headers || [];
    for (let i = 0; i < list.length; i++) {
      result[list[i].name.toLowerCase()] = list[i].value;
    }
    return result;
  }

  _decodeBase64(str) {
    try {
      return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    } catch (e) {
      return '';
    }
  }

  _extractText(payload) {
    if (!payload) return '';
    let text = '';
    if (payload.body && payload.body.data) {
      text += this._decodeBase64(payload.body.data);
    }
    if (payload.parts) {
      for (let i = 0; i < payload.parts.length; i++) {
        const part = payload.parts[i];
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          text += this._decodeBase64(part.body.data);
        } else if (part.mimeType && part.mimeType.indexOf('multipart/') === 0) {
          text += this._extractText(part);
        }
      }
    }
    return text;
  }

  _countMatches(text, phrases) {
    if (!phrases || !text) return 0;
    let count = 0;
    for (let i = 0; i < phrases.length; i++) {
      if (text.indexOf(phrases[i].toLowerCase()) !== -1) count++;
    }
    return count;
  }

  _isPromotional(headers, bodyLower) {
    if (headers['list-unsubscribe']) {
      return { yes: true, confidence: 0.92 };
    }
    const from = headers['from'] || '';
    const promoSender = /noreply|no-reply|newsletter|marketing|promo|deals|offers@|updates@/i.test(from);
    const promoCount = this._countMatches(bodyLower, (this.patterns.promotion || {}).keywords);
    if (promoSender && promoCount >= 2) {
      return { yes: true, confidence: Math.min(0.7 + promoCount * 0.04, 0.95) };
    }
    if (promoCount >= 5) {
      return { yes: true, confidence: Math.min(0.6 + promoCount * 0.04, 0.95) };
    }
    return { yes: false, confidence: 0 };
  }

  _scoreCategory(bodyLower, subjectLower, category) {
    const p = this.patterns[category];
    if (!p) return 0;
    let score = 0;
    const combined = subjectLower + ' ' + bodyLower;
    const high = p.high_confidence || [];
    const med  = p.medium_confidence || [];
    const ctx  = p.context_words || [];
    for (let i = 0; i < high.length; i++) {
      if (combined.indexOf(high[i].toLowerCase()) !== -1) score += 0.45;
    }
    for (let i = 0; i < med.length; i++) {
      if (combined.indexOf(med[i].toLowerCase()) !== -1) score += 0.18;
    }
    score += this._countMatches(combined, ctx) * 0.08;
    return Math.min(score, 1.0);
  }

  classify(message) {
    if (!message || !message.payload) {
      return { category: 'unknown', confidence: 0 };
    }
    const headers   = this._parseHeaders(message.payload.headers);
    const subject   = (headers['subject'] || '').toLowerCase();
    const from      = (headers['from']    || '').toLowerCase();
    const bodyLower = this._extractText(message.payload).toLowerCase();

    const promo = this._isPromotional(headers, bodyLower);
    if (promo.yes) {
      return { category: 'promotion', confidence: promo.confidence, subject: headers['subject'], from: headers['from'] };
    }

    const isJobSender = /careers|recruiting|talent|hr@|jobs@|hiring|workday|greenhouse|lever|ashby|smartrecruiters|taleo|icims|bamboohr|jobvite/i.test(from);

    const categories = ['job_acceptance', 'job_rejection', 'interview_request', 'application_sent', 'pending'];
    const scores = {};
    for (let i = 0; i < categories.length; i++) {
      let s = this._scoreCategory(bodyLower, subject, categories[i]);
      if (isJobSender && s > 0) s = Math.min(s * 1.25, 1.0);
      if (isJobSender && s === 0) s = 0.05;
      scores[categories[i]] = s;
    }

    const entries = Object.keys(scores).map(function(k) { return [k, scores[k]]; });
    entries.sort(function(a, b) { return b[1] - a[1]; });
    const best = entries[0];

    if (best[1] < 0.14) {
      return { category: 'unknown', confidence: best[1], subject: headers['subject'], from: headers['from'] };
    }

    return { category: best[0], confidence: Math.min(best[1], 0.99), subject: headers['subject'], from: headers['from'] };
  }
}

export default EmailClassifier;