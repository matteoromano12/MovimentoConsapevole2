function productIcon(name) {
  var icons = {
    mat: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="14" width="36" height="20" rx="3"/><path d="M14 14v20M34 14v20"/></svg>',
    roller: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="16" width="32" height="16" rx="8"/><path d="M14 16v16M20 16v16M26 16v16M32 16v16"/></svg>',
    band: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 24c0-7 5-12 12-12s12 5 12 12-5 12-12 12"/><path d="M10 24c0 7 5 12 12 12"/><circle cx="10" cy="24" r="3"/><circle cx="34" cy="36" r="3"/></svg>',
    cushion: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 30c0-10 7-18 16-18s16 8 16 18-7 8-16 8-16 2-16-8Z"/></svg>',
    ball: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="15"/><path d="M24 9c5 4 5 22 0 30M9 24c4-5 22-5 30 0"/></svg>',
    book: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 12c-4-3-10-4-15-3v25c5-1 11 0 15 3 4-3 10-4 15-3V9c-5-1-11 0-15 3Z"/><path d="M24 12v25"/></svg>'
  };
  return icons[name] || '';
}
