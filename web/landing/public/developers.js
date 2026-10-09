// Developer early access form (external file: the site CSP blocks inline scripts).
(() => {
  const f = document.getElementById("devform"), msg = f.querySelector(".form-msg"), btn = f.querySelector("button");
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = f.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = "Please enter a valid email."; return; }
    const token = f.querySelector("[name='cf-turnstile-response']")?.value;
    if (!token) { msg.textContent = "Please wait for the human check, then try again."; return; }
    btn.disabled = true; msg.textContent = "Sending...";
    try {
      const r = await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: "api", link: f.link.value, turnstileToken: token }) });
      const j = await r.json().catch(() => ({}));
      if (j.ok) { f.reset(); msg.textContent = "You are on the API early access list. We will email you when keys open."; }
      else { msg.textContent = "Something went wrong. Please try again."; window.turnstile?.reset(); }
    } catch { msg.textContent = "Network error. Please try again."; window.turnstile?.reset(); }
    btn.disabled = false;
  });
})();
