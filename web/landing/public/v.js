// Cookieless visit counter. Only real browsers that run JavaScript are counted.
(() => {
  try {
    if (navigator.webdriver || localStorage.getItem("pv_ignore")) return;
  } catch {}
  let sent = false;
  const send = () => {
    if (sent || document.visibilityState !== "visible") return;
    sent = true;
    const body = JSON.stringify({ p: location.pathname, r: document.referrer });
    if (!navigator.sendBeacon?.("/api/v", body)) fetch("/api/v", { method: "POST", body, keepalive: true }).catch(() => {});
  };
  send();
  document.addEventListener("visibilitychange", send);
})();
