export async function readTabImportResponse(response) {
  const unavailable = 'Tab import is unavailable on this server. Restart the dev server to enable it, or paste the source tab text.';
  if (!response.headers.get('content-type')?.includes('application/json')) throw Error(unavailable);
  let data;
  try { data = await response.json(); } catch { throw Error('The import server returned an unreadable response. Try again or paste the tab text.'); }
  if (!response.ok) throw Error(data?.error || 'Import failed. Paste the tab text instead.');
  if (typeof data?.text !== 'string' || !data.text.trim()) throw Error('The import server returned no tab text. Paste the source tab text instead.');
  return data;
}
