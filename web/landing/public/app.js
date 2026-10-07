(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Nav border on scroll
  const nav = document.querySelector(".nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Hero phone video: respect reduced motion
  const heroVideo = document.querySelector(".pvideo");
  if (heroVideo && reduceMotion) {
    heroVideo.removeAttribute("autoplay");
    heroVideo.pause();
  }

  // Now showing player: plays muted when visible, guests can watch freely
  const showVideo = document.getElementById("show-video");
  if (showVideo) {
    const playBtn = document.getElementById("show-play");
    const soundBtn = document.getElementById("show-sound");
    const bar = document.getElementById("show-bar");
    let userPaused = false;
    const syncPlay = () => {
      const playing = !showVideo.paused;
      playBtn.textContent = playing ? "❚❚" : "▶";
      playBtn.setAttribute("aria-label", playing ? "Pause video" : "Play video");
    };
    playBtn.addEventListener("click", () => {
      if (showVideo.paused) { userPaused = false; showVideo.play().catch(() => {}); }
      else { userPaused = true; showVideo.pause(); }
    });
    soundBtn.addEventListener("click", () => {
      showVideo.muted = !showVideo.muted;
      soundBtn.textContent = showVideo.muted ? "🔇" : "🔊";
      soundBtn.setAttribute("aria-label", showVideo.muted ? "Turn sound on" : "Turn sound off");
      if (!showVideo.muted && showVideo.paused) showVideo.play().catch(() => {});
    });
    showVideo.addEventListener("play", syncPlay);
    showVideo.addEventListener("pause", syncPlay);
    showVideo.addEventListener("timeupdate", () => {
      if (showVideo.duration) bar.style.width = `${(showVideo.currentTime / showVideo.duration) * 100}%`;
    });
    if ("IntersectionObserver" in window && !reduceMotion) {
      new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !userPaused) showVideo.play().catch(() => {});
          else if (!e.isIntersecting) showVideo.pause();
        });
      }, { threshold: 0.5 }).observe(showVideo);
    }
    syncPlay();
  }

  // Guests can watch but cannot vote or earn Scout Score
  const voteNote = document.getElementById("vote-note");
  document.querySelectorAll("[data-vote]").forEach((b) =>
    b.addEventListener("click", () => {
      voteNote.innerHTML = 'Voting and Scout Score are for members. <a href="#join">Join the waitlist</a> to be first in line. Watching stays free.';
      voteNote.classList.add("is-nudge");
    })
  );

  // "Join" buttons preselect the viewer role in the waitlist form
  document.querySelectorAll("[data-join-role]").forEach((a) =>
    a.addEventListener("click", () => {
      const input = document.querySelector(`#waitlist input[name=role][value="${a.dataset.joinRole}"]`);
      if (input) { input.checked = true; input.dispatchEvent(new Event("change")); }
    })
  );

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

  let pending = false;
  window.pvTurnstileDone = () => {
    if (pending) {
      pending = false;
      form.requestSubmit();
    }
  };
  window.pvTurnstileExpired = () => window.turnstile?.reset();
  window.pvTurnstileError = () => {
    pending = false;
    btn.disabled = false;
    btn.textContent = "Join the waitlist";
    msg.textContent = "Human check could not load. Please refresh the page and try again.";
  };

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
      // Human check still running: wait for it, then submit automatically.
      pending = true;
      btn.disabled = true;
      btn.textContent = "Verifying you're human...";
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
    const data = { title: "PromoVote", text: "The social network for promos. Where new creators get discovered first.", url: "https://promovote.com" };
    if (navigator.share) {
      try { await navigator.share(data); } catch {}
    } else {
      await navigator.clipboard?.writeText(data.url);
      document.getElementById("share").textContent = "Link copied!";
    }
  });
})();
