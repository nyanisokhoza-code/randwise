// ── SERVICE WORKER REGISTRATION ───────────────────────────────
// Registers sw.js and handles auto-updates silently
// ── SERVICE WORKER — always get latest version ────────────────
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js', {scope:'/'})
    .then(reg => {
      // Check for updates every 30 seconds while app is open
      setInterval(() => reg.update(), 30000);
      // When new SW is waiting, activate it immediately — no user action needed
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW.addEventListener('statechange', () => {
          if(newSW.state === 'installed' && navigator.serviceWorker.controller){
            newSW.postMessage({type:'SKIP_WAITING'});
          }
        });
      });
    }).catch(()=>{});
  // When SW activates — reload for ALL users automatically
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Show a subtle banner instead of a jarring reload
    // Only reload if no sheet/overlay is open (don't interrupt mid-action)
    const overlayOpen = document.querySelector('[id$="-overlay"][style*="flex"]') ||
                        document.querySelector('[id$="-sheet"][style*="flex"]');
    if(!overlayOpen){
      // Soft reload — preserves scroll position
      window.location.reload();
    } else {
      // Overlay is open — wait until it closes then reload
      window._pendingUpdate = true;
    }
  });
}
