export function initTheme(){
 const root=document.documentElement,select=document.getElementById('theme-select'),toggle=document.getElementById('theme-toggle'),system=matchMedia('(prefers-color-scheme: dark)');
 let preference='dark';try{const saved=localStorage.getItem('gamesen.theme');if(['dark','light','system'].includes(saved))preference=saved;}catch{}
 function apply(){const theme=preference==='system'?(system.matches?'dark':'light'):preference;root.dataset.theme=theme;root.style.colorScheme=theme;select.value=preference;toggle.textContent=theme==='dark'?'☀ Sáng':'☾ Tối';toggle.setAttribute('aria-label',theme==='dark'?'Chuyển sang giao diện sáng':'Chuyển sang giao diện tối');document.querySelector('meta[name="theme-color"]').content=theme==='dark'?'#090f19':'#eef2f7';}
 function save(value){preference=value;try{localStorage.setItem('gamesen.theme',value);}catch{}apply();}
 select.onchange=()=>save(select.value);toggle.onclick=()=>save(root.dataset.theme==='dark'?'light':'dark');system.addEventListener('change',apply);apply();
}
