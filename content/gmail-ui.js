// content/gmail-ui.js — Gmail DOM utilities (loaded before content.js)

const GmailUI = (() => {

  const CATEGORY_COLORS = {
    job_acceptance:           '#16a765',
    job_rejection:            '#cc3a21',
    interview_request:        '#f2b728',
    application_confirmation: '#4986e7',
    promotional:              '#888888'
  };

  const CATEGORY_LABELS = {
    job_acceptance:           'Offer',
    job_rejection:            'Rejected',
    interview_request:        'Interview',
    application_confirmation: 'Applied',
    promotional:              'Promo'
  };

  const BADGE_ATTR = 'data-jes-badge';
  const PROCESSED_ATTR = 'data-jes-id';

  // Inject a category badge into a Gmail email row element
  function injectBadge(rowEl, messageId, category, confidence) {
    if (rowEl.hasAttribute(BADGE_ATTR)) return; // already injected

    const color = CATEGORY_COLORS[category];
    if (!color) return;

    const badge = document.createElement('span');
    badge.className = 'jes-badge';
    badge.setAttribute(BADGE_ATTR, category);
    badge.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      border-radius: 999px;
      background: ${color}22;
      border: 1px solid ${color};
      color: ${color};
      font-size: 10px;
      font-weight: 600;
      font-family: sans-serif;
      white-space: nowrap;
      cursor: default;
      vertical-align: middle;
      margin-left: 6px;
      line-height: 1.4;
    `;

    const dot = document.createElement('span');
    dot.style.cssText = `width:6px;height:6px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0;`;
    badge.appendChild(dot);
    badge.appendChild(document.createTextNode(CATEGORY_LABELS[category] || category));

    badge.title = `Classified as ${CATEGORY_LABELS[category] || category} (${Math.round(confidence * 100)}% confidence)\nRight-click to reclassify`;

    // Add context// content/gmail-ui.js — Gmail DOM utilities (loaded before content.js)

const GmailUI = (() => {

  const CATEGORY_COLORS = {
    job_acceptance:           '#16a765',
    job_rejection:            '#cc3a21',
    interview_request:        '#f2b728',
    application_confirmation: '#4986e7',
    promotional:              '#888888'
  };

  const CATEGORY_LABELS = {
    job_acceptance:           'Offer',
    job_rejection:            'Rejected',
    interview_request:        'Interview',
    application_confirmation: 'Applied',
    promotional:              'Promo'
  };

  const BADGE_ATTR = 'data-jes-badge';
  const PROCESSED_ATTR = 'data-jes-id';

  // Inject a category badge into a Gmail email row element
  function injectBadge(rowEl, messageId, category, confidence) {
    if (rowEl.hasAttribute(BADGE_ATTR)) return; // already injected

    const color = CATEGORY_COLORS[category];
    if (!color) return;

    const badge = document.createElement('span');
    badge.className = 'jes-badge';
    badge.setAttribute(BADGE_ATTR, category);
    badge.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      border-radius: 999px;
      background: ${color}22;
      border: 1px solid ${color};
      color: ${color};
      font-size: 10px;
      font-weight: 600;
      font-family: sans-serif;
      white-space: nowrap;
      cursor: default;
      vertical-align: middle;
      margin-left: 6px;
      line-height: 1.4;
    `;

    const dot = document.createElement('span');
    dot.style.cssText = `width:6px;height:6px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0;`;
    badge.appendChild(dot);
    badge.appendChild(document.createTextNode(CATEGORY_LABELS[category] || category));

    badge.title = `Classified as ${CATEGORY_LABELS[category] || category} (${Math.round(confidence * 100)}% confidence)\nRight-click to reclassify`;

    // Add context