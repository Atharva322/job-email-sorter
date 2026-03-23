(function () {
  'use strict';

  if (window._jesLoaded) return;
  window._jesLoaded = true;

  var CATEGORY_META = {
    job_acceptance:    { icon: '✅', label: 'Offer',     bgColor: '#e6f4ea', color: '#137333' },
    job_rejection:     { icon: '❌', label: 'Rejected',  bgColor: '#fce8e6', color: '#c5221f' },
    interview_request: { icon: '📅', label: 'Interview', bgColor: '#fef7e0', color: '#b06000' },
    application_sent:  { icon: '📤', label: 'Applied',   bgColor: '#e8f0fe', color: '#1a73e8' },
    pending:           { icon: '⏳', label: 'Pending',   bgColor: '#fff3e0', color: '#e65100' },
    promotion:         { icon: '🗂', label: 'Promo',     bgColor: '#f1f3f4', color: '#5f6368' }
  };

  var LABEL_TO_CAT = {
    'Jobs/Responses/Accepted':           'job_acceptance',
    'Jobs/Responses/Rejected':           'job_rejection',
    'Jobs/Responses/Interview Requests': 'interview_request',
    'Jobs/Applications/Sent':            'application_sent',
    'Jobs/Responses/Pending':            'pending',
    'Promotions/Auto-Filtered':          'promotion'
  };

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  function addBadge(row, category) {
    if (row.querySelector('.jes-badge')) return;
    var meta = CATEGORY_META[category];
    if (!meta) return;
    var cell = row.querySelector('.bog') || row.querySelector('.y6') || row.querySelector('td.xY');
    if (!cell) return;
    var badge = document.createElement('span');
    badge.className = 'jes-badge';
    badge.textContent = meta.icon + ' ' + meta.label;
    badge.style.cssText = 'display:inline-block;font-size:10px;font-weight:600;padding:1px 6px;border-radius:10px;margin-right:6px;vertical-align:middle;white-space:nowrap;font-family:sans-serif;background:' + meta.bgColor + ';color:' + meta.color;
    cell.insertBefore(badge, cell.firstChild);
  }

  function getCategoryFromRow(row) {
    var els = row.querySelectorAll('[data-tooltip],[title]');
    for (var i = 0; i < els.length; i++) {
      var tip = (els[i].getAttribute('data-tooltip') || els[i].getAttribute('title') || '');
      var labelKeys = Object.keys(LABEL_TO_CAT);
      for (var j = 0; j < labelKeys.length; j++) {
        if (tip.indexOf(labelKeys[j]) !== -1) return LABEL_TO_CAT[labelKeys[j]];
      }
    }
    return null;
  }

  function processRows() {
    var rows = document.querySelectorAll('tr[data-legacy-message-id]:not([data-jes-done])');
    for (var i = 0; i < rows.length; i++) {
      rows[i].setAttribute('data-jes-done', '1');
      var cat = getCategoryFromRow(rows[i]);
      if (cat) addBadge(rows[i], cat);
    }
  }

  var debouncedProcess = debounce(processRows, 400);
  var observer = new MutationObserver(debouncedProcess);
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(processRows, 2000);

}());