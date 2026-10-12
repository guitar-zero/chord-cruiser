import { useEffect, useState } from 'react';

export default function useTheme() {
  const [darkMode,setDarkMode]=useState(()=>{
    try { return localStorage.getItem('chord-map-theme')!=='light'; } catch { return true; }
  });
  useEffect(()=>{
    document.documentElement.dataset.theme=darkMode?'dark':'light';
    try {localStorage.setItem('chord-map-theme',darkMode?'dark':'light');} catch {}
  },[darkMode]);
  return [darkMode,setDarkMode];
}
