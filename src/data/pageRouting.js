export function pageHref(page, base = '/') {
  return `${base.endsWith('/') ? base : `${base}/`}${page === 'tabs' ? '#/tabs' : '#/'}`;
}

export function currentPage(location, base = '/') {
  if (location.hash) return location.hash.replace(/\/$/, '') === '#/tabs' ? 'tabs' : 'chords';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  const pathname = location.pathname.startsWith(prefix) ? location.pathname.slice(prefix.length) : location.pathname.replace(/^\//, '');
  return pathname.replace(/\/$/, '') === 'tabs' ? 'tabs' : 'chords';
}
