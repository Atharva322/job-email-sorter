(function () {
  'use strict';

  if (window._jesLoaded) return;
  window._jesLoaded = true;

  function send(action, data) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action, ...data }, (res) => {
        if (chrome.runtime.lastError) { resolve(null); return; }
        resolve(res);
      });
    });
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  const CATEGORY_META = {
    job_acceptance:          { icon: '🎉', label: 'Offer',      color: '#e6f4ea' },
    job_rejection:           { icon: '❌', label: 'Rejection', color: '#fce8e6' },
    interview_request:       { icon: '📅', label: 'Interview', color: '#fef7e0' },
    application_confirmation:{ icon: '📤', label: 'Applied',   color: '#e8f0fe' },
    promotional:             { icon: '🏷️',  label: 'Promo',     color: '#f1f3f4' }
  };

  async function processRow(row) {(function () {
  'use strict';

  if (window._jesLoaded) return;
  window._jesLoaded = true;

  function send(action, data) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action, ...data }, (res) => {
        if (chrome.runtime.lastError) { resolve(null); return; }
        resolve(res);
      });
    });
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  const CATEGORY_META = {
    job_acceptance:          { icon: '🎉', label: 'Offer',      color: '#e6f4ea' },
    job_rejection:           { icon: '❌', label: 'Rejection', color: '#fce8e6' },
    interview_request:       { icon: '📅', label: 'Interview', color: '#fef7e0' },
    application_confirmation:{ icon: '📤', label: 'Applied',   color: '#e8f0fe' },
    promotional:             { icon: '🏷️',  label: 'Promo',     color: '#f1f3f4' }
  };

  async function processRow(row) {