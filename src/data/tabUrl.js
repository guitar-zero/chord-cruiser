export function validateTabUrl(value) {
  let url;
  try {url=new URL(value);} catch {throw Error('Enter a valid Ultimate Guitar text-tab link.');}
  if(url.protocol!=='https:' || url.hostname!=='tabs.ultimate-guitar.com' || url.port || url.username || url.password || !url.pathname.startsWith('/tab/')) throw Error('Use an https://tabs.ultimate-guitar.com/tab/ link.');
  return url;
}
