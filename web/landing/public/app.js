(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Nav border on scroll
  const nav = document.querySelector(".nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Rotate phone cards
  const cards = [...document.querySelectorAll(".pcard")];
  const pill = document.querySelector(".pill");
  if (cards.length && !reduceMotion) {
    let i = 0;
    setInterval(() => {
      cards[i].classList.remove("is-active");
      i = (i + 1) % cards.length;
      cards[i].classList.add("is-active");
      if (pill) pill.textContent = `${i + 3} of 7`;
    }, 3200);
  }

  // Reveal sections on scroll
  const targets = document.querySelectorAll(".section .wrap > *, .stat, .step, .trust-item");
  if ("IntersectionObserver" in window && !reduceMotion) {
    targets.forEach((el) => el.classList.add("reveal"));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -60px 0px" });
    targets.forEach((el) => io.observe(el));
  }

  // Year
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Waitlist form
  const form = document.getElementById("waitlist");
  if (!form) return;
  const msg = form.querySelector(".form-msg");
  const btn = form.querySelector("button[type=submit]");
  const linkField = document.getElementById("link-field");
  const success = document.querySelector(".success");

  const placeholders = {
    creator: "youtube.com/@yourchannel",
    developer: "store.steampowered.com/app/...",
    brand: "yourbrand.com",
  };
  form.querySelectorAll("input[name=role]").forEach((r) =>
    r.addEventListener("change", () => {
      const role = form.role.value;
      linkField.hidden = role === "viewer";
      if (placeholders[role]) form.link.placeholder = placeholders[role];
    })
  );

  const errors = {
    invalid_email: "Please enter a valid email address.",
    invalid_role: "Please choose who you are.",
    verification_failed: "Quick check failed. Please try again.",
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    const email = form.email.value.trim();
    if (!email || !form.email.checkValidity()) {
      msg.textContent = errors.invalid_email;
      form.email.focus();
      return;
    }
    const token = form.querySelector("[name='cf-turnstile-response']")?.value;
    if (!token) {
      msg.textContent = "Please wait a second for the human check to finish.";
      return;
    }

    btn.disabled = true;
    btn.textContent = "Joining...";
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: form.role.value, link: form.link.value, turnstileToken: token }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        form.hidden = true;
        success.hidden = false;
        success.querySelector("h3").focus?.();
        return;
      }
      msg.textContent = errors[data.error] || "Something went wrong. Please try again.";
      if (window.turnstile) window.turnstile.reset();
    } catch {
      msg.textContent = "Network error. Please try again.";
    } finally {
      btn.disabled = false;
      btn.textContent = "Join the waitlist";
    }
  });

  document.getElementById("share")?.addEventListener("click", async () => {
    const data = { title: "PromoVote", text: "The social media of ads. Where new creators get discovered first.", url: "https://promovote.com" };
    if (navigator.share) {
      try { await navigator.share(data); } catch {}
    } else {
      await navigator.clipboard?.writeText(data.url);
      document.getElementById("share").textContent = "Link copied!";
    }
  });
})();
