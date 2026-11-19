(() => {
  const key='ai-requirements-analyzer:theme';
  function set(value){
    const theme=value==='dark'?'dark':'light';
    document.documentElement.dataset.theme=theme;
    try{localStorage.setItem(key,theme);}catch{}
  }
  let saved='light';
  try{saved=localStorage.getItem(key);}catch{}
  set(saved);
  window.appTheme={set};
})();
