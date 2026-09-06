/* ═══════════════════════════════════════════════════════════
   AI Resume Screening — Application Logic
   Extraordinary Interactive Edition
   ═══════════════════════════════════════════════════════════ */
/* ─────────────────────────────────────────────────────────────
   INTRO SPLASH SCREEN CONTROLLER
───────────────────────────────────────────────────────────── */
(function IntroController() {
  const screen   = document.getElementById("introScreen");
  const startBtn = document.getElementById("introStartBtn");
  const ripple   = document.getElementById("introBtnRipple");
  const sidebar  = document.querySelector(".sidebar");
  const mainWrap = document.querySelector(".main-wrap");
  let running = true;

  if (!screen) return;

  // Lock scroll
  document.body.classList.add("intro-active");

  // Subtle background particles
  (function initIntroCanvas() {
    const canvas = document.getElementById("introCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W, H;
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const pts = [];
    for (let i = 0; i < 40; i++) {
      pts.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        a: Math.random() * 0.3 + 0.1
      });
    }

    running = true;
    function loop() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      
      // Draw lines
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 150) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(192, 132, 252, ${0.05 * (1 - d/150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw points
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(236, 72, 153, ${p.a})`;
        ctx.fill();
      });

      requestAnimationFrame(loop);
    }
    loop();

  })();

  // ── Typewriter Animation ──
  const twEl = document.getElementById("introTypewriter");
  const text = " SCREENING";   // "AI RESUME" is already in the HTML, so only type this
  let idx = 0;

  function type() {
    if (!twEl) return;
    if (idx <= text.length) {
      twEl.textContent = text.slice(0, idx);
      idx++;
      setTimeout(type, 90 + Math.random() * 60);
    } else {
      // Done — fade the cursor to just blink, don't hide
    }
  }

  // Start after particles settle
  setTimeout(type, 500);


  // Click handler with ripple effect
  startBtn?.addEventListener("click", function(e) {
    if (ripple) {
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      ripple.classList.remove("rippling");
      void ripple.offsetWidth;
      ripple.classList.add("rippling");
    }
    setTimeout(dismiss, 400);
  });

  function dismiss() {
    screen.classList.add("intro-exit");
    screen.addEventListener("animationend", () => {
      screen.style.display = "none";
      document.body.classList.remove("intro-active");
      running = false;
      
      // Animate main layout in
      if (sidebar) {
        sidebar.style.transition = "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)";
        sidebar.style.opacity = "1";
        sidebar.style.transform = "none";
      }
      if (mainWrap) {
        mainWrap.style.transition = "opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)";
        mainWrap.style.opacity = "1";
        mainWrap.style.transform = "none";
      }
    }, { once: true });
  }

  // ESC shortcut
  document.addEventListener("keydown", function handler(e) {
    if (e.key === "Escape") {
      document.removeEventListener("keydown", handler);
      dismiss();
    }
  });
})();

/* ─────────────────────────────────────────────────────────────
   LOGIN ACCESS GATE
───────────────────────────────────────────────────────────── */
(function LoginController() {
  const screen = document.getElementById("loginScreen");
  const form = document.getElementById("loginForm");
  if (!screen || !form) return;

  const email = document.getElementById("loginEmail");
  const password = document.getElementById("loginPassword");
  const feedback = document.getElementById("loginFeedback");
  const submit = document.getElementById("loginSubmit");
  const remember = document.getElementById("rememberLogin");
  const sessionKey = "ai_resume_authenticated";
  const savedEmail = localStorage.getItem("ai_resume_login_email");

  document.body.classList.add("login-active");
  if (savedEmail) { email.value = savedEmail; remember.checked = true; }
  if (sessionStorage.getItem(sessionKey) || localStorage.getItem(sessionKey)) unlock();

  document.getElementById("togglePassword")?.addEventListener("click", function () {
    const showing = password.type === "text";
    password.type = showing ? "password" : "text";
    this.classList.toggle("visible", !showing);
    this.setAttribute("aria-label", showing ? "Show password" : "Hide password");
  });

  document.getElementById("demoLogin")?.addEventListener("click", () => {
    email.value = "recruiter@demo.com";
    password.value = "demo123";
    feedback.textContent = "Demo credentials filled in. Select Enter workspace.";
    feedback.className = "login-feedback ok";
  });

  document.getElementById("forgotPassword")?.addEventListener("click", () => {
    feedback.textContent = "For this local demo, use recruiter@demo.com / demo123.";
    feedback.className = "login-feedback";
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    const normalizedEmail = email.value.trim().toLowerCase();
    if (!normalizedEmail || !email.checkValidity()) return showError("Enter a valid work email.");
    if (!password.value) return showError("Enter your password to continue.");
    if (normalizedEmail !== "recruiter@demo.com" || password.value !== "demo123") return showError("Those credentials do not match the local demo account.");
    submit.disabled = true;
    submit.querySelector("span").textContent = "Opening workspace…";
    if (remember.checked) {
      localStorage.setItem(sessionKey, "true");
      localStorage.setItem("ai_resume_login_email", normalizedEmail);
    } else {
      sessionStorage.setItem(sessionKey, "true");
      localStorage.removeItem(sessionKey);
      localStorage.removeItem("ai_resume_login_email");
    }
    setTimeout(unlock, 350);
  });

  function showError(message) {
    feedback.textContent = message;
    feedback.className = "login-feedback";
    password.focus();
  }

  function unlock() {
    screen.classList.add("is-hidden");
    document.body.classList.remove("login-active");
    setTimeout(() => { screen.style.display = "none"; }, 550);
  }

  window.addEventListener("ai-resume-logout", () => {
    screen.style.display = "flex";
    requestAnimationFrame(() => screen.classList.remove("is-hidden"));
    document.body.classList.add("login-active");
    form.reset();
    password.type = "password";
    document.getElementById("togglePassword")?.classList.remove("visible");
    document.getElementById("togglePassword")?.setAttribute("aria-label", "Show password");
    submit.disabled = false;
    submit.querySelector("span").textContent = "Enter workspace";
    feedback.textContent = "";
    sessionStorage.removeItem(sessionKey);
    localStorage.removeItem(sessionKey);
  });
})();

/* ─────────────────────────────────────────────────────────────
   MAIN APPLICATION
───────────────────────────────────────────────────────────── */
(() => {
  "use strict";


  /* ─────────────────────────────────────
     PARTICLE CANVAS
  ───────────────────────────────────── */
  (function initParticles() {
    const canvas = document.getElementById("particleCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W, H, particles = [];

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const COLORS = ["rgba(59,130,246,", "rgba(139,92,246,", "rgba(6,182,212,"];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * (window.innerWidth  || 1400),
        y: Math.random() * (window.innerHeight || 900),
        r: Math.random() * 1.5 + 0.4,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: Math.random() * 0.4 + 0.1,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.x += p.vx;  p.y += p.vy;
        if (p.x < 0) p.x = W;  if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;  if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + p.alpha + ")";
        ctx.fill();
      });

      // Draw faint connection lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(59,130,246,${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }
    draw();
  })();

  /* ─────────────────────────────────────
     API LAYER
  ───────────────────────────────────── */
  const STORE_KEY = "ai_resume_api_v2";
  let API = localStorage.getItem(STORE_KEY) || "http://localhost:8000";

  async function apiCall(path, opts = {}) {
    const isForm = opts.body instanceof FormData;
    const headers = isForm ? {} : { "Content-Type": "application/json" };
    const res = await fetch(`${API}${path}`, { ...opts, headers });
    if (!res.ok) {
      let detail = res.statusText;
      try { const d = await res.json(); detail = d.detail || JSON.stringify(d); } catch {}
      throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
    if (res.status === 204) return null;
    return res.json();
  }

  /* ─────────────────────────────────────
     GLOBAL STATE
  ───────────────────────────────────── */
  let jobsCache       = [];
  let candidatesCache = [];
  let rankingsCount   = 0;
  let activityLog     = [];

  /* Make switchTab globally accessible for inline onclick */
  window.switchTab = function(name) {
    const btn = document.querySelector(`.nav-item[data-tab="${name}"]`);
    if (btn) btn.click();
  };

  /* ─────────────────────────────────────
     TOAST NOTIFICATIONS
  ───────────────────────────────────── */
  function toast(title, body = "", type = "info") {
    const stack = document.getElementById("toastStack");
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <div class="toast-content">
        <div class="toast-title">${esc(title)}</div>
        ${body ? `<div class="toast-body">${esc(body)}</div>` : ""}
      </div>
      <button class="toast-dismiss" onclick="this.parentElement.remove()">×</button>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add("hide");
      setTimeout(() => el.remove(), 350);
    }, 4500);
  }

  /* ─────────────────────────────────────
     ACTIVITY FEED
  ───────────────────────────────────── */
  function addActivity(text, color = "blue") {
    activityLog.unshift({ text, color, time: new Date() });
    if (activityLog.length > 8) activityLog.pop();
    renderActivity();
  }

  function renderActivity() {
    const feed = document.getElementById("activityFeed");
    if (!feed) return;
    feed.innerHTML = activityLog.map((a, i) => `
      <div class="activity-item" style="animation-delay:${i * 0.05}s">
        <div class="activity-dot activity-dot-${a.color}"></div>
        <div class="activity-text">
          <span>${esc(a.text)}</span>
          <span class="activity-time">${timeAgo(a.time)}</span>
        </div>
      </div>`).join("");
  }

  /* ─────────────────────────────────────
     HELPERS
  ───────────────────────────────────── */
  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function timeAgo(date) {
    const d = (Date.now() - new Date(date).getTime()) / 1000;
    if (isNaN(d) || d < 5)    return "just now";
    if (d < 60)                return `${Math.floor(d)}s ago`;
    if (d < 3600)              return `${Math.floor(d / 60)}m ago`;
    if (d < 86400)             return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
  }

  /**
   * Sanitize a "name" — if it looks like body text (no whitespace, very long,
   * or starts with lowercase), return null so we can fall back to email.
   */
  function cleanName(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    // Reject extremely long single words (unlikely to be a human name)
    if (s.length > 15 && !/\s/.test(s)) return null;
    // Reject long description text
    if (s.length > 40) return null;
    // Starts lowercase and is long (likely body text)
    if (s.length > 25 && /^[a-z]/.test(s)) return null;
    return s || null;
  }

  /** Get initials for avatar */
  function initials(name, email) {
    if (name && /\s/.test(name.trim())) {
      const parts = name.trim().split(/\s+/);
      return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
    }
    if (email) return email[0].toUpperCase();
    return "?";
  }

  /** Avatar background gradient based on seed string */
  function avatarGradient(seed) {
    const GRADS = [
      "135deg, #3b82f6, #8b5cf6",
      "135deg, #10b981, #3b82f6",
      "135deg, #8b5cf6, #ec4899",
      "135deg, #f59e0b, #ef4444",
      "135deg, #06b6d4, #3b82f6",
      "135deg, #10b981, #06b6d4",
    ];
    let h = 0;
    for (let i = 0; i < (seed || "").length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xFFFF;
    return GRADS[h % GRADS.length];
  }

  /* ─────────────────────────────────────
     ANIMATED COUNTER
  ───────────────────────────────────── */
  function animateCounter(el, target, suffix = "") {
    if (!el) return;
    const start = parseInt(el.dataset.current || "0", 10);
    if (start === target) return;
    el.dataset.current = target;
    const duration = 800;
    const startTime = performance.now();
    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const val = Math.round(start + (target - start) * eased);
      el.innerHTML = val + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ─────────────────────────────────────
     CONNECTION STATUS
  ───────────────────────────────────── */
  const connDot   = document.getElementById("connDot");
  const connLabel = document.getElementById("connLabel");
  const connModal = document.getElementById("connModal");
  const apiInput  = document.getElementById("apiUrlInput");

  function openConnModal() {
    apiInput.value = API;
    connModal.classList.add("open");
    setTimeout(() => apiInput.focus(), 50);
  }

  document.getElementById("connStatus").addEventListener("click", openConnModal);
  document.getElementById("connEditBtn").addEventListener("click", e => { e.stopPropagation(); openConnModal(); });
  document.getElementById("connCancel").addEventListener("click", () => connModal.classList.remove("open"));
  connModal.addEventListener("click", e => { if (e.target === connModal) connModal.classList.remove("open"); });
  document.getElementById("connSave").addEventListener("click", () => {
    const v = (apiInput.value || "").trim().replace(/\/$/, "");
    if (!v) return;
    API = v;
    localStorage.setItem(STORE_KEY, API);
    connModal.classList.remove("open");
    checkHealth();
    loadAll();
  });

  async function checkHealth() {
    connDot.className = "conn-dot";
    connLabel.textContent = "Connecting…";
    try {
      const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error("not ok");
      connDot.classList.add("ok");
      try { connLabel.textContent = new URL(API).host; } catch { connLabel.textContent = "Connected"; }
      addActivity("API connection established", "green");
    } catch {
      connDot.classList.add("bad");
      connLabel.textContent = "Offline";
      addActivity("API unreachable — click to configure", "amber");
    }
  }

  /* ─────────────────────────────────────
     TAB NAVIGATION
  ───────────────────────────────────── */
  const PAGE_META = {
    dashboard:  { title: "Dashboard",         sub: "Overview & Analytics" },
    jobs:       { title: "Job Descriptions",  sub: "Manage and create job postings" },
    upload:     { title: "Upload Resumes",    sub: "Add candidates to your pool" },
    candidates: { title: "All Candidates",    sub: "Browse and search your talent pool" },
    rank:       { title: "AI Ranking",        sub: "Semantic NLP candidate matching" },
  };

  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      const panel = document.getElementById(`panel-${tab}`);
      if (panel) panel.classList.add("active");
      const meta = PAGE_META[tab] || {};
      const title = document.getElementById("pageTitle");
      const breadcrumb = document.getElementById("pageBreadcrumb");
      if (title) title.textContent = meta.title || tab;
      if (breadcrumb) breadcrumb.textContent = meta.sub || "";

      // Lazy loads
      if (tab === "jobs")       loadJobs();
      if (tab === "candidates") loadCandidates();
      if (tab === "rank")       populateJobSelect();
    });
  });

  /* ─────────────────────────────────────
     GLOBAL SEARCH
  ───────────────────────────────────── */
  document.getElementById("globalSearch")?.addEventListener("input", function () {
    const q = this.value.toLowerCase().trim();
    if (!q) return;
    // Switch to candidates tab and filter
    window.switchTab("candidates");
    const searchEl = document.getElementById("candidateSearch");
    if (searchEl) { searchEl.value = this.value; filterCandidates(); }
  });

  /* ─────────────────────────────────────
     REFRESH ALL BUTTON
  ───────────────────────────────────── */
  document.getElementById("refreshAllBtn")?.addEventListener("click", async function () {
    this.classList.add("spinning");
    await loadAll();
    setTimeout(() => this.classList.remove("spinning"), 600);
    toast("Data Refreshed", "All panels have been updated", "info");
  });

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    window.dispatchEvent(new Event("ai-resume-logout"));
  });

  /* ─────────────────────────────────────
     DASHBOARD
  ───────────────────────────────────── */
  function updateDashboard() {
    const jc = jobsCache.length;
    const cc = candidatesCache.length;

    // Badge counts in sidebar
    const nbJobs = document.getElementById("nb-jobs");
    const nbCand = document.getElementById("nb-candidates");
    if (nbJobs) nbJobs.textContent = jc;
    if (nbCand) nbCand.textContent = cc;

    // Animate KPI counters
    animateCounter(document.getElementById("dashStatJobs"),       jc);
    animateCounter(document.getElementById("dashStatCandidates"), cc);
    animateCounter(document.getElementById("dashStatRankings"),   rankingsCount);

    // Average experience
    let totalExp = 0;
    candidatesCache.forEach(c => { totalExp += (c.total_experience_years || 0); });
    const avgExp = cc > 0 ? Math.round(totalExp / cc) : 0;
    animateCounter(document.getElementById("dashStatAvgExp"), avgExp);

    // KPI progress bars (visual only, relative to a reference)
    setTimeout(() => {
      const setBar = (id, pct) => {
        const el = document.getElementById(id);
        if (el) el.style.width = `${Math.min(pct, 100)}%`;
      };
      setBar("kpiBarJobs",       Math.min(jc * 20, 100));
      setBar("kpiBarCandidates", Math.min(cc * 10, 100));
      setBar("kpiBarRankings",   Math.min(rankingsCount * 25, 100));
      setBar("kpiBarAvgExp",     Math.min(avgExp * 10, 100));
    }, 300);

    // Experience distribution
    let junior = 0, mid = 0, senior = 0;
    candidatesCache.forEach(c => {
      const y = c.total_experience_years || 0;
      if (y < 2) junior++;
      else if (y <= 5) mid++;
      else senior++;
    });
    const total = cc || 1;

    setTimeout(() => {
      const jBar = document.getElementById("expJuniorBar");
      const mBar = document.getElementById("expMidBar");
      const sBar = document.getElementById("expSeniorBar");
      if (jBar) jBar.style.width = `${(junior / total) * 100}%`;
      if (mBar) mBar.style.width = `${(mid    / total) * 100}%`;
      if (sBar) sBar.style.width = `${(senior / total) * 100}%`;
    }, 400);

    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setText("expJuniorVal", junior);
    setText("expMidVal",    mid);
    setText("expSeniorVal", senior);

    // Candidates count badge
    const ccBadge = document.getElementById("candidatesCountBadge");
    if (ccBadge) ccBadge.textContent = cc;
    const jcBadge = document.getElementById("jobsCountBadge");
    if (jcBadge) jcBadge.textContent = jc;

    // Top skills cloud
    renderSkillsCloud();
    // AI insights
    renderInsights();
  }

  function renderSkillsCloud() {
    const container = document.getElementById("topSkillsList");
    if (!container) return;

    const freq = {};
    const bestCase = {};
    candidatesCache.forEach(c => {
      (c.skills || []).forEach(s => {
        const k = s.trim().toLowerCase();
        if (!k) return;
        freq[k] = (freq[k] || 0) + 1;
        if (!bestCase[k]) bestCase[k] = s;
      });
    });

    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 18);
    if (!top.length) {
      container.innerHTML = `<div class="empty-placeholder"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><p>Upload resumes to see skills</p></div>`;
      return;
    }
    container.innerHTML = top.map(([k, n], i) => `
      <span class="skill-chip" style="animation-delay:${i * 0.04}s">
        ${esc(bestCase[k] || k)}
        <span class="chip-count">${n}</span>
      </span>`).join("");
  }

  function renderInsights() {
    const container = document.getElementById("aiInsights");
    if (!container) return;
    const cc = candidatesCache.length;
    const jc = jobsCache.length;

    const insights = [];
    if (cc === 0 && jc === 0) {
      insights.push({ icon: "💡", text: "Get started by creating a job description and uploading resumes to see AI-powered insights here." });
    } else {
      if (cc > 0) {
        let totalExp = 0;
        candidatesCache.forEach(c => { totalExp += (c.total_experience_years || 0); });
        const avg = (totalExp / cc).toFixed(1);
        insights.push({ icon: "📊", text: `Your candidate pool of ${cc} has an average experience of ${avg} years.` });
      }
      if (jc > 0 && cc > 0) {
        insights.push({ icon: "🎯", text: `You have ${jc} job${jc > 1 ? "s" : ""} and ${cc} candidate${cc > 1 ? "s" : ""}. Run AI Ranking to find the best matches.` });
      }
      if (cc > 5) {
        insights.push({ icon: "⚡", text: "Tip: Use the Top N filter in Rank Candidates to quickly surface your top 5 candidates." });
      }
      if (jc === 0) {
        insights.push({ icon: "📝", text: "Create at least one job description to start matching candidates semantically." });
      }
    }

    container.innerHTML = insights.map(i => `
      <div class="insight-item">
        <div class="insight-icon">${i.icon}</div>
        <p>${esc(i.text)}</p>
      </div>`).join("");
  }

  /* ─────────────────────────────────────
     JOBS PANEL
  ───────────────────────────────────── */
  async function loadJobs() {
    const list = document.getElementById("jobsList");
    if (!list) return;
    list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--tx3);font-size:13px;display:flex;align-items:center;justify-content:center;gap:8px"><div class="spinner"></div> Loading jobs…</div>`;
    try {
      jobsCache = await apiCall("/jobs");
      updateDashboard();
      populateJobSelect();
      if (!jobsCache.length) {
        list.innerHTML = `<div class="empty-placeholder"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg><p>No job descriptions yet.<br>Create one on the left.</p></div>`;
        return;
      }
      list.innerHTML = jobsCache.map((j, i) => {
        const skills = (j.required_skills || []);
        return `
          <div class="job-card" style="animation-delay:${i * 0.06}s">
            <div class="job-card-top">
              <div class="job-card-title">${esc(j.title)}</div>
              <span class="job-card-id">ID #${j.id}</span>
            </div>
            <div class="job-card-meta">
              Min ${j.min_experience_years}y exp &nbsp;·&nbsp; ${timeAgo(j.created_at)}
            </div>
            <div class="job-card-desc">${esc((j.raw_text || "").slice(0, 120))}${(j.raw_text || "").length > 120 ? "…" : ""}</div>
            <div class="tag-row">
              ${skills.slice(0, 5).map(s => `<span class="chip chip-blue">${esc(s)}</span>`).join("")}
              ${skills.length > 5 ? `<span class="chip chip-muted">+${skills.length - 5} more</span>` : ""}
            </div>
          </div>`;
      }).join("");
    } catch (err) {
      list.innerHTML = `<div class="empty-placeholder"><p>Failed to load jobs: ${esc(err.message)}</p></div>`;
    }
  }

  document.getElementById("createJobBtn")?.addEventListener("click", async () => {
    const msgEl = document.getElementById("jobFormMsg");
    const btn   = document.getElementById("createJobBtn");
    const title  = document.getElementById("jobTitle")?.value.trim();
    const raw    = document.getElementById("jobText")?.value.trim();
    const skills = document.getElementById("jobSkills")?.value.trim();
    const minExp = parseFloat(document.getElementById("jobMinExp")?.value) || 0;

    if (!title || !raw) {
      msgEl.className = "form-feedback err";
      msgEl.textContent = "Job title and description are required.";
      return;
    }

    const required_skills = skills
      ? skills.split(",").map(s => s.trim()).filter(Boolean)
      : [];

    btn.disabled = true;
    btn.innerHTML = `<div class="spinner"></div> Creating…`;
    msgEl.className = "form-feedback";
    msgEl.textContent = "";

    try {
      const job = await apiCall("/jobs", {
        method: "POST",
        body: JSON.stringify({ title, raw_text: raw, required_skills, min_experience_years: minExp }),
      });
      msgEl.className = "form-feedback ok";
      msgEl.textContent = `Job "${title}" created successfully (ID #${job.id}).`;
      toast("Job Created", `"${title}" is now live`, "ok");
      addActivity(`New job created: ${title}`, "blue");
      // Reset form
      ["jobTitle","jobText","jobSkills"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
      const me = document.getElementById("jobMinExp"); if (me) me.value = "0";
      await loadJobs();
    } catch (err) {
      msgEl.className = "form-feedback err";
      msgEl.textContent = err.message;
      toast("Failed to create job", err.message, "err");
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Create Job Description`;
    }
  });

  document.getElementById("refreshJobsBtn")?.addEventListener("click", loadJobs);

  function populateJobSelect() {
    const sel = document.getElementById("rankJobSelect");
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = `<option value="">Choose a job description…</option>` +
      jobsCache.map(j => `<option value="${j.id}">Job #${j.id} — ${esc(j.title)}</option>`).join("");
    if (prev) sel.value = prev;
  }

  /* ─────────────────────────────────────
     UPLOAD PANEL
  ───────────────────────────────────── */
  const dropzone  = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");

  dropzone?.addEventListener("click", () => fileInput?.click());
  dropzone?.addEventListener("dragover", e => { e.preventDefault(); dropzone.classList.add("drag"); });
  dropzone?.addEventListener("dragleave", e => { if (!dropzone.contains(e.relatedTarget)) dropzone.classList.remove("drag"); });
  dropzone?.addEventListener("drop", e => {
    e.preventDefault();
    dropzone.classList.remove("drag");
    if (e.dataTransfer.files.length) handleFiles(Array.from(e.dataTransfer.files));
  });
  fileInput?.addEventListener("change", e => {
    if (e.target.files.length) handleFiles(Array.from(e.target.files));
    fileInput.value = "";
  });

  function handleFiles(files) {
    files.forEach(f => uploadOne(f));
  }

  async function uploadOne(file) {
    const queue = document.getElementById("uploadQueue");
    const itemId = `uq-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const item = document.createElement("div");
    item.className = "upload-item";
    item.id = itemId;
    item.innerHTML = `
      <div class="spinner"></div>
      <span class="upload-name" title="${esc(file.name)}">${esc(file.name)}</span>
      <span class="upload-tag pending">Parsing…</span>`;
    queue?.prepend(item);

    const form = new FormData();
    form.append("file", file);

    try {
      const candidate = await apiCall("/resumes/upload", { method: "POST", body: form });
      const el = document.getElementById(itemId);
      if (el) {
        el.querySelector(".spinner").remove();
        el.querySelector(".upload-tag").className = "upload-tag ok";
        el.querySelector(".upload-tag").textContent = "✓ Parsed";
      }
      const displayName = cleanName(candidate.full_name) || candidate.email || file.name;
      toast("Resume Parsed", `${displayName} added to candidate pool`, "ok");
      addActivity(`Resume parsed: ${displayName}`, "green");
      renderParsedProfile(candidate);
      await loadCandidates();
    } catch (err) {
      const el = document.getElementById(itemId);
      if (el) {
        el.querySelector(".spinner").remove();
        el.querySelector(".upload-tag").className = "upload-tag err";
        el.querySelector(".upload-tag").textContent = "Failed";
      }
      toast("Upload Failed", err.message, "err");
      addActivity(`Upload failed: ${file.name}`, "amber");
    }
  }

  function renderParsedProfile(c) {
    const container = document.getElementById("lastParsed");
    if (!container) return;

    const name  = cleanName(c.full_name);
    const email = c.email || null;
    const phone = c.phone || null;
    const exp   = c.total_experience_years || 0;
    const skills  = (c.skills || []);
    const edu     = (c.education || []);
    const orgs    = (c.organizations || []);
    const avatar  = initials(name, email);
    const grad    = avatarGradient(name || email || "");

    container.innerHTML = `
      <div>
        <div class="profile-hd">
          <div class="profile-avatar-lg" style="background:linear-gradient(${grad})">${avatar}</div>
          <div>
            <div class="profile-full-name">${esc(name || email || "Unknown Candidate")}</div>
            <div class="profile-sub">${esc(email || "No email")} ${phone ? `· ${esc(phone)}` : ""}</div>
            <div class="profile-chips" style="margin-top:8px">
              <span class="chip chip-blue">${exp}y experience</span>
              ${c.file_type ? `<span class="chip chip-muted">${esc(c.file_type.toUpperCase())}</span>` : ""}
            </div>
          </div>
        </div>

        ${skills.length ? `
        <div class="profile-section">
          <div class="profile-section-label">Skills Extracted</div>
          <div class="tag-row">${skills.map(s => `<span class="chip chip-blue">${esc(s)}</span>`).join("")}</div>
        </div>` : ""}

        ${edu.length ? `
        <div class="profile-section">
          <div class="profile-section-label">Education</div>
          <div class="tag-row">${edu.map(s => `<span class="chip chip-muted">${esc(s)}</span>`).join("")}</div>
        </div>` : ""}

        ${orgs.length ? `
        <div class="profile-section">
          <div class="profile-section-label">Organizations</div>
          <div class="tag-row">${orgs.map(s => `<span class="chip chip-violet">${esc(s)}</span>`).join("")}</div>
        </div>` : ""}

        <div style="margin-top:16px;padding:12px 14px;background:var(--c-green-dim);border:1px solid rgba(16,185,129,.2);border-radius:var(--r-md)">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--c-green);margin-bottom:4px">AI Extraction Complete</div>
          <div style="font-size:12.5px;color:var(--tx2)">This profile has been added to your candidate pool and is ready for ranking.</div>
        </div>
      </div>`;
  }

  /* ─────────────────────────────────────
     CANDIDATES PANEL
  ───────────────────────────────────── */
  async function loadCandidates() {
    try {
      candidatesCache = await apiCall("/candidates");
      updateDashboard();
      renderCandidates(candidatesCache);
      if (typeof populateCompareSelects === "function") populateCompareSelects();
    } catch (err) {
      const grid = document.getElementById("candidatesGrid");
      if (grid) grid.innerHTML = `<div class="empty-placeholder" style="grid-column:1/-1"><p>Could not load candidates: ${esc(err.message)}</p></div>`;
    }
  }

  function renderCandidates(list) {
    const grid = document.getElementById("candidatesGrid");
    if (!grid) return;
    const ccBadge = document.getElementById("candidatesCountBadge");
    if (ccBadge) ccBadge.textContent = list.length;

    if (!list.length) {
      grid.innerHTML = `<div class="empty-placeholder" style="grid-column:1/-1">
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <p>No candidates yet. Upload resumes to start building your talent pool.</p>
      </div>`;
      return;
    }

    grid.innerHTML = list.map((c, i) => {
      const name  = cleanName(c.full_name);
      const email = c.email || "No email";
      const exp   = c.total_experience_years || 0;
      const skills = (c.skills || []).slice(0, 5);
      const avatar = initials(name, c.email);
      const grad   = avatarGradient(name || c.email || String(c.id));

      let expChip = "";
      if (exp < 2) expChip = `<span class="chip chip-blue">Entry</span>`;
      else if (exp <= 5) expChip = `<span class="chip chip-green">Mid</span>`;
      else expChip = `<span class="chip chip-violet">Senior</span>`;

      return `
        <div class="candidate-card" data-id="${c.id}" style="animation-delay:${i * 0.05}s" onclick="openCandidateModal(${c.id})">
          <div class="candidate-card-top">
            <div class="candidate-avatar" style="background:linear-gradient(${grad})">${esc(avatar)}</div>
            <div>
              <div class="candidate-name">${esc(name || email)}</div>
              <div class="candidate-email">${esc(email)}</div>
            </div>
          </div>
          <div class="candidate-meta">
            ${expChip}
            <span class="chip chip-muted">${exp}y exp</span>
            ${c.file_type ? `<span class="chip chip-muted">${esc(c.file_type.toUpperCase())}</span>` : ""}
          </div>
          ${skills.length ? `
          <div class="candidate-skills">
            ${skills.map(s => `<span class="candidate-skill">${esc(s)}</span>`).join("")}
            ${(c.skills || []).length > 5 ? `<span class="candidate-skill" style="opacity:.6">+${c.skills.length - 5}</span>` : ""}
          </div>` : ""}
          <div class="view-profile-hint">Click to view full profile →</div>
        </div>`;
    }).join("");
  }

  // Search + filter
  document.getElementById("candidateSearch")?.addEventListener("input", filterCandidates);
  document.getElementById("expFilter")?.addEventListener("change", filterCandidates);

  function filterCandidates() {
    const q    = (document.getElementById("candidateSearch")?.value || "").toLowerCase().trim();
    const exp  = document.getElementById("expFilter")?.value || "";

    let filtered = candidatesCache;
    if (q) {
      filtered = filtered.filter(c => {
        const name  = (cleanName(c.full_name) || "").toLowerCase();
        const email = (c.email || "").toLowerCase();
        const skills= (c.skills || []).join(" ").toLowerCase();
        return name.includes(q) || email.includes(q) || skills.includes(q);
      });
    }
    if (exp === "entry")  filtered = filtered.filter(c => (c.total_experience_years || 0) < 2);
    if (exp === "mid")    filtered = filtered.filter(c => { const y = c.total_experience_years || 0; return y >= 2 && y <= 5; });
    if (exp === "senior") filtered = filtered.filter(c => (c.total_experience_years || 0) > 5);

    renderCandidates(filtered);
  }

  document.getElementById("refreshCandidatesBtn")?.addEventListener("click", loadCandidates);

  /* ─────────────────────────────────────
     CANDIDATE MODAL
  ───────────────────────────────────── */
  window.openCandidateModal = function(id) {
    const c = candidatesCache.find(x => x.id === id);
    if (!c) return;

    const modal = document.getElementById("candidateModal");
    const body  = document.getElementById("candidateModalBody");
    if (!modal || !body) return;

    const name  = cleanName(c.full_name);
    const email = c.email || "No email";
    const phone = c.phone || null;
    const exp   = c.total_experience_years || 0;
    const skills = c.skills || [];
    const edu    = c.education || [];
    const orgs   = c.organizations || [];
    const avatar = initials(name, c.email);
    const grad   = avatarGradient(name || c.email || String(c.id));

    body.innerHTML = `
      <div class="profile-hd">
        <div class="profile-avatar-lg" style="background:linear-gradient(${grad})">${esc(avatar)}</div>
        <div>
          <div class="profile-full-name">${esc(name || email)}</div>
          <div class="profile-sub">${esc(email)}${phone ? ` · ${esc(phone)}` : ""}</div>
          <div class="profile-chips">
            <span class="chip chip-${exp < 2 ? "blue" : exp <= 5 ? "green" : "violet"}">${exp}y experience</span>
            <span class="chip chip-muted">ID #${c.id}</span>
            ${c.file_type ? `<span class="chip chip-muted">${esc(c.file_type.toUpperCase())}</span>` : ""}
            <span class="chip chip-muted">Uploaded ${timeAgo(c.created_at)}</span>
          </div>
        </div>
      </div>

      ${skills.length ? `
      <div class="profile-section">
        <div class="profile-section-label">Technical Skills (${skills.length})</div>
        <div class="tag-row">${skills.map(s => `<span class="chip chip-blue">${esc(s)}</span>`).join("")}</div>
      </div>` : ""}

      ${edu.length ? `
      <div class="profile-section">
        <div class="profile-section-label">Education</div>
        <div class="tag-row">${edu.map(s => `<span class="chip chip-muted">${esc(s)}</span>`).join("")}</div>
      </div>` : ""}

      ${orgs.length ? `
      <div class="profile-section">
        <div class="profile-section-label">Organizations & Work History</div>
        <div class="tag-row">${orgs.map(s => `<span class="chip chip-violet">${esc(s)}</span>`).join("")}</div>
      </div>` : ""}

      <div class="profile-section">
        <div class="profile-section-label">Experience Level</div>
        <div style="background:var(--surface2);border-radius:var(--r-md);padding:14px 16px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--tx3);margin-bottom:8px">
            <span>Total Experience</span><span style="color:var(--tx);font-weight:600">${exp} years</span>
          </div>
          <div style="height:8px;background:var(--surface3);border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${Math.min(exp / 10 * 100, 100)}%;background:linear-gradient(90deg,var(--c-blue),var(--c-violet));border-radius:99px;transition:width 1s ease"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--tx4);margin-top:5px">
            <span>0y</span><span>Entry</span><span>Mid</span><span>Senior</span><span>10y+</span>
          </div>
        </div>
      </div>`;

    modal.classList.add("open");
  };

  document.getElementById("closeCandidateModal")?.addEventListener("click", () => {
    document.getElementById("candidateModal")?.classList.remove("open");
  });
  document.getElementById("candidateModal")?.addEventListener("click", e => {
    if (e.target.id === "candidateModal") e.target.classList.remove("open");
  });

  /* ─────────────────────────────────────
     RANK PANEL
  ───────────────────────────────────── */
  function scoreColor(pct) {
    if (pct >= 70) return "var(--c-green)";
    if (pct >= 45) return "#f59e0b";
    return "var(--c-red)";
  }

  function buildGaugeSVG(pct, color) {
    const r = 37, C = 2 * Math.PI * r;
    const clamp = Math.min(Math.max(pct, 0), 100);
    const offset = C - (clamp / 100) * C;
    return `
      <div class="gauge-wrap">
        <svg width="90" height="90" viewBox="0 0 90 90">
          <circle class="gauge-track" cx="45" cy="45" r="${r}"/>
          <circle class="gauge-fill"
            cx="45" cy="45" r="${r}"
            stroke="${color}"
            stroke-dasharray="${C.toFixed(2)}"
            stroke-dashoffset="${C.toFixed(2)}"
            data-final="${offset.toFixed(2)}"/>
        </svg>
        <div class="gauge-center">
          <div class="gauge-num">${Math.round(pct)}</div>
          <div class="gauge-unit">/ 100</div>
        </div>
      </div>`;
  }

  function renderRankResults(results) {
    const container = document.getElementById("rankResults");
    if (!results.length) {
      container.innerHTML = `<div class="empty-placeholder"><p>No candidates matched this job description. Try uploading more resumes.</p></div>`;
      return;
    }

    container.innerHTML = results.map((r, i) => {
      const fp  = normalizeScore(r.final_score);
      const sp  = normalizeScore(r.semantic_score);
      const skp = normalizeScore(r.skill_overlap_score);
      const col = scoreColor(fp);
      const name  = cleanName(r.candidate_name);
      const email = r.candidate_email || "No email";
      const exp   = r.total_experience_years || 0;
      const matched = (r.matched_skills || []).slice(0, 6);
      const missing = (r.missing_skills || []).slice(0, 4);
      const grad  = avatarGradient(name || email || String(i));
      const ini   = initials(name, r.candidate_email);
      const delay = i * 0.08;

      return `
        <div class="rank-card" style="animation-delay:${delay}s">
          <div class="rank-card-strip" style="background:${col}"></div>
          <div class="rank-card-rank-badge">Rank #${i + 1}</div>

          ${buildGaugeSVG(fp, col)}

          <div class="rank-body">
            <div class="rank-pos">Match Score</div>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">
              <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(${grad});display:flex;align-items:center;justify-content:center;font-family:var(--f-head);font-size:14px;font-weight:700;color:#fff;flex-shrink:0">${esc(ini)}</div>
              <div>
                <div class="rank-name">${esc(name || email)}</div>
                <div class="rank-email">${esc(email)}</div>
              </div>
            </div>

            <div class="subscores">
              <div class="subscore-item">
                <div class="subscore-header">
                  <span>Semantic Fit</span>
                  <span style="font-weight:600;color:var(--tx)">${Math.round(sp)}%</span>
                </div>
                <div class="subscore-bar">
                  <span style="background:${col}" data-w="${sp}%"></span>
                </div>
              </div>
              <div class="subscore-item">
                <div class="subscore-header">
                  <span>Skill Overlap</span>
                  <span style="font-weight:600;color:var(--tx)">${Math.round(skp)}%</span>
                </div>
                <div class="subscore-bar">
                  <span style="background:${col}" data-w="${skp}%"></span>
                </div>
              </div>
            </div>

            <div class="rank-skills">
              ${matched.map(s => `<span class="chip chip-green">✓ ${esc(s)}</span>`).join("")}
              ${missing.map(s => `<span class="chip chip-red">✕ ${esc(s)}</span>`).join("")}
            </div>
          </div>

          <div class="rank-side">
            <span class="exp-pill ${r.meets_min_experience ? "pass" : "fail"}">
              ${r.meets_min_experience ? "✓" : "✕"} ${exp}y exp
            </span>
            <span class="chip chip-muted" style="font-size:11px">${fp >= 70 ? "🌟 Strong Fit" : fp >= 45 ? "👍 Moderate" : "⚠ Weak Fit"}</span>
          </div>
        </div>`;
    }).join("");

    // Animate gauges and bars after paint
    requestAnimationFrame(() => {
      setTimeout(() => {
        container.querySelectorAll(".gauge-fill").forEach(el => {
          el.style.strokeDashoffset = el.dataset.final;
        });
        container.querySelectorAll(".subscore-bar span").forEach(el => {
          el.style.width = el.dataset.w;
        });
      }, 80);
    });
  }

  function normalizeScore(v) {
    if (v == null) return 0;
    return v <= 1 ? v * 100 : v;
  }

  document.getElementById("runRankBtn")?.addEventListener("click", async () => {
    const msgEl  = document.getElementById("rankFormMsg");
    const btn    = document.getElementById("runRankBtn");
    const jobId  = document.getElementById("rankJobSelect")?.value;
    const topN   = document.getElementById("rankTopN")?.value;
    const results = document.getElementById("rankResults");

    if (!jobId) {
      msgEl.className = "form-feedback err";
      msgEl.textContent = "Please select a job description first.";
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<div class="spinner"></div> Ranking…`;
    msgEl.className = "form-feedback";
    msgEl.textContent = "";
    if (results) results.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px;padding:20px 0">
        ${[1,2,3].map(n => `
          <div style="height:120px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-xl);display:flex;align-items:center;justify-content:center;gap:10px;color:var(--tx3);font-size:13px;animation:pulse 1.5s ease-in-out ${n * 0.15}s infinite alternate">
            <div class="spinner"></div> Running AI semantic matching…
          </div>`).join("")}
      </div>`;

    try {
      const payload = { job_id: parseInt(jobId, 10) };
      if (topN) payload.top_n = parseInt(topN, 10);
      const data = await apiCall("/rank", { method: "POST", body: JSON.stringify(payload) });

      rankingsCount++;
      const jobName = jobsCache.find(j => j.id === parseInt(jobId))?.title || `Job #${jobId}`;
      addActivity(`Ranked ${data.length} candidates for "${jobName}"`, "violet");
      updateDashboard();
      msgEl.className = "form-feedback ok";
      msgEl.textContent = `✓ Ranked ${data.length} candidate${data.length !== 1 ? "s" : ""} — results below.`;
      renderRankResults(data);
      toast("Ranking Complete", `${data.length} candidates ranked for "${jobName}"`, "ok");
    } catch (err) {
      msgEl.className = "form-feedback err";
      msgEl.textContent = err.message;
      if (results) results.innerHTML = `<div class="empty-placeholder"><p>Ranking failed: ${esc(err.message)}</p></div>`;
      toast("Ranking Failed", err.message, "err");
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run AI Ranking`;
    }
  });

  /* ─────────────────────────────────────
     KEYBOARD SHORTCUTS
  ───────────────────────────────────── */
  document.addEventListener("keydown", e => {
    // Cmd/Ctrl + K — focus search
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      document.getElementById("globalSearch")?.focus();
    }
    // Escape — close modals
    if (e.key === "Escape") {
      document.getElementById("candidateModal")?.classList.remove("open");
      document.getElementById("connModal")?.classList.remove("open");
    }
  });

  /* ─────────────────────────────────────
     COMPARE CANDIDATES PANEL
  ───────────────────────────────────── */
  const selA = document.getElementById("compareCandA");
  const selB = document.getElementById("compareCandB");

  function populateCompareSelects() {
    if (!selA || !selB) return;
    const vA = selA.value;
    const vB = selB.value;
    const opts = `<option value="">Select a candidate…</option>` +
      candidatesCache.map(c => `<option value="${c.id}">${esc(cleanName(c.full_name) || c.email)}</option>`).join("");
    selA.innerHTML = opts; selA.value = vA;
    selB.innerHTML = opts; selB.value = vB;
    renderCompare();
  }

  function renderCompare() {
    const res = document.getElementById("compareResults");
    if (!res) return;
    const idA = selA.value, idB = selB.value;
    if (!idA || !idB || idA === idB) {
      if (idA === idB && idA) toast("Same Candidate", "Please select two different candidates", "info");
      res.innerHTML = `
        <div class="compare-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <p>Select two candidates above to see a detailed side-by-side comparison of their skills, experience, and education.</p>
        </div>`;
      return;
    }

    const cA = candidatesCache.find(x => x.id === parseInt(idA));
    const cB = candidatesCache.find(x => x.id === parseInt(idB));
    if (!cA || !cB) return;

    // Logic for comparison
    const skA = new Set((cA.skills || []).map(s => s.trim().toLowerCase()));
    const skB = new Set((cB.skills || []).map(s => s.trim().toLowerCase()));
    
    const rawA = cA.skills || [];
    const rawB = cB.skills || [];

    function renderCol(c, isA) {
      const name  = cleanName(c.full_name);
      const email = c.email || "No email";
      const exp   = c.total_experience_years || 0;
      const avatar = initials(name, c.email);
      const grad   = avatarGradient(name || c.email || String(c.id));
      const edu    = c.education || [];
      
      const otherSet = isA ? skB : skA;
      const myRaw    = isA ? rawA : rawB;

      const shared = [], unique = [], missing = [];
      myRaw.forEach(s => {
        if (otherSet.has(s.toLowerCase())) shared.push(s);
        else unique.push(s);
      });
      (isA ? rawB : rawA).forEach(s => {
        if (!(isA ? skA : skB).has(s.toLowerCase())) missing.push(s);
      });

      return `
        <div class="compare-col ${exp > (isA ? (cB.total_experience_years||0) : (cA.total_experience_years||0)) ? "winner-col" : "loser-col"}">
          <div class="compare-col-hd">
            <div class="compare-avatar" style="background:linear-gradient(${grad})">${esc(avatar)}</div>
            <div>
              <div class="compare-name">${esc(name || email)}</div>
              <div class="compare-email">${esc(email)}</div>
              <div class="compare-exp-badge" style="background:var(--surface2);border:1px solid var(--border);color:var(--tx2)">
                ${exp} Years Experience
              </div>
            </div>
          </div>

          <div class="compare-section">
            <div class="compare-section-label">Technical Skills Match</div>
            <div class="skill-match-list">
              ${shared.map(s => `<div class="skill-match-row shared"><span class="skill-match-icon">✓</span> Both have ${esc(s)}</div>`).join("")}
              ${unique.map(s => `<div class="skill-match-row unique"><span class="skill-match-icon">+</span> Unique: ${esc(s)}</div>`).join("")}
              ${missing.slice(0,4).map(s => `<div class="skill-match-row missing"><span class="skill-match-icon">✕</span> Lacks ${esc(s)}</div>`).join("")}
            </div>
          </div>

          ${edu.length ? `
          <div class="compare-section">
            <div class="compare-section-label">Education</div>
            <div class="tag-row">${edu.map(s => `<span class="chip chip-muted">${esc(s)}</span>`).join("")}</div>
          </div>` : ""}
        </div>
      `;
    }

    res.innerHTML = renderCol(cA, true) + renderCol(cB, false);
  }

  selA?.addEventListener("change", renderCompare);
  selB?.addEventListener("change", renderCompare);

  /* ─────────────────────────────────────
     INIT
  ───────────────────────────────────── */
  async function loadAll() {
    await Promise.allSettled([loadJobs(), loadCandidates()]);
  }

  addActivity("Application started", "blue");
  checkHealth();
  loadAll();

  // Periodic health check every 30s
  setInterval(checkHealth, 30000);
})();
