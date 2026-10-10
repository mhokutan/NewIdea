// Developer early access forms (external file: the site CSP blocks inline scripts).
// Two forms share this: a short one in the hero (email only) and the full one at the bottom (email + link).
(() => {
  document.querySelectorAll("form.devform").forEach((f) => {
    const msg = f.querySelector(".form-msg"), btn = f.querySelector("button[type=submit]");
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = f.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = "Please enter a valid email."; f.email.focus(); return; }
      const widget = f.querySelector(".cf-turnstile");
      const token = f.querySelector("[name='cf-turnstile-response']")?.value;
      if (!token) { msg.textContent = "Please wait for the human check, then try again."; return; }
      btn.disabled = true; msg.textContent = "Sending...";
      try {
        const r = await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, role: "api", link: f.link ? f.link.value : "", turnstileToken: token }) });
        const j = await r.json().catch(() => ({}));
        if (j.ok) { f.reset(); msg.textContent = "You are on the API early access list. We will email you when keys open."; }
        else { msg.textContent = "Something went wrong. Please try again."; window.turnstile?.reset(widget); }
      } catch { msg.textContent = "Network error. Please try again."; window.turnstile?.reset(widget); }
      btn.disabled = false;
    });
  });
})();
