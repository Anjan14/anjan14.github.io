/* ==========================================================================
   Shared behaviour for every page:
   theme switch, header, command menu, copy email, portrait lens, research filter
   ========================================================================== */
(function () {
  "use strict";

  const doc = document.documentElement;
  const root = doc.dataset.root || "";              // "" on the homepage, "../" inside /blog/
  const isHome = !!document.querySelector(".hero");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  const EMAIL = "ar567s@missouristate.edu";
  const LINKS = {
    linkedin: "https://www.linkedin.com/in/anjan-roy14/",
    github: "https://github.com/Anjan14",
    instagram: "https://www.instagram.com/_anjanroy/",
  };

  /* ---------- Small helpers ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function readStorage(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function writeStorage(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) { /* storage blocked: the choice just won't be remembered */ }
  }

  /* ---------- Keyboard shortcut label ---------- */
  $$("[data-shortcut]").forEach((el) => { el.textContent = isMac ? "⌘K" : "Ctrl K"; });

  /* ---------- Footer year ---------- */
  $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Toast ---------- */
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  document.body.appendChild(toast);
  let toastTimer;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  /* ---------- Theme ---------- */
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
  const themeButton = $(".theme-toggle");

  function currentTheme() {
    return doc.dataset.theme || (systemDark.matches ? "dark" : "light");
  }

  function updateThemeButton() {
    if (!themeButton) return;
    const next = currentTheme() === "dark" ? "light" : "dark";
    themeButton.setAttribute("aria-label", `Switch to ${next} theme`);
    themeButton.title = `Switch to ${next} theme`;
  }

  // mode: "light" | "dark" | "system"
  function setTheme(mode, origin) {
    const apply = () => {
      if (mode === "system") {
        delete doc.dataset.theme;
        writeStorage("theme", null);
      } else {
        doc.dataset.theme = mode;
        writeStorage("theme", mode);
      }
      updateThemeButton();
    };

    if (!document.startViewTransition || reducedMotion.matches) { apply(); return; }

    const x = origin ? origin.x : window.innerWidth - 40;
    const y = origin ? origin.y : 32;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transition = document.startViewTransition(apply);
    transition.ready.then(() => {
      doc.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 600, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)", pseudoElement: "::view-transition-new(root)" }
      );
    }).catch(() => {});
  }

  if (themeButton) {
    updateThemeButton();
    themeButton.addEventListener("click", () => {
      const rect = themeButton.getBoundingClientRect();
      setTheme(currentTheme() === "dark" ? "light" : "dark", {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    });
  }
  systemDark.addEventListener("change", updateThemeButton);

  /* ---------- Header border on scroll ---------- */
  const header = $(".site-header");
  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Highlight the nav link for the section in view (homepage) ---------- */
  if (isHome && "IntersectionObserver" in window) {
    const navLinks = $$('.site-nav a[href^="#"]');
    const targets = navLinks
      .map((a) => ({ link: a, section: document.getElementById(a.getAttribute("href").slice(1)) }))
      .filter((t) => t.section);

    const visible = new Map();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => visible.set(e.target, e.isIntersecting));
      let active = null;
      targets.forEach((t) => { if (visible.get(t.section)) active = active || t; });
      navLinks.forEach((a) => a.removeAttribute("aria-current"));
      if (active) active.link.setAttribute("aria-current", "true");
    }, { rootMargin: "-35% 0px -60% 0px" });

    targets.forEach((t) => observer.observe(t.section));
  }

  /* ---------- Copy email ---------- */
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL);
      showToast("Email address copied");
    } catch (e) {
      window.prompt("Copy this email address:", EMAIL);
    }
  }
  $$("[data-copy-email]").forEach((btn) => btn.addEventListener("click", copyEmail));

  /* ---------- Portrait: color lens ---------- */
  const portrait = $("[data-portrait]");
  if (portrait) {
    const canHover = window.matchMedia("(hover: hover)").matches;

    const setLensPosition = (event) => {
      const rect = portrait.getBoundingClientRect();
      portrait.style.setProperty("--x", `${event.clientX - rect.left}px`);
      portrait.style.setProperty("--y", `${event.clientY - rect.top}px`);
    };

    // Opening moment: the photo appears in color, then the color drains away.
    if (!reducedMotion.matches) {
      portrait.classList.add("is-intro");
      const img = $(".portrait-color", portrait);
      const drain = () => {
        setTimeout(() => {
          portrait.classList.add("is-draining");
          portrait.classList.remove("is-intro");
          setTimeout(() => portrait.classList.remove("is-draining"), 1700);
        }, 900);
      };
      if (img.complete) drain();
      else { img.addEventListener("load", drain, { once: true }); img.addEventListener("error", drain, { once: true }); }
    }

    portrait.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      portrait.classList.remove("is-intro", "is-draining");
      setLensPosition(e);
      portrait.classList.add("is-lit");
    });
    portrait.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      setLensPosition(e);
    });
    portrait.addEventListener("pointerleave", (e) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      portrait.classList.remove("is-lit");
    });

    // Touch screens: tap to flood the photo with color from where you tapped, tap again to drain it.
    portrait.addEventListener("click", (e) => {
      if (canHover && e.pointerType !== "touch") return;
      portrait.classList.remove("is-intro", "is-draining");
      setLensPosition(e);
      portrait.classList.toggle("is-full");
    });
  }

  /* ---------- Research: filter by topic ---------- */
  const filter = $("[data-filter]");
  if (filter) {
    const items = $$("[data-topics]");
    const groups = $$("[data-group]");
    const status = $("#filter-status");
    const counts = new Map();
    items.forEach((item) => {
      item.dataset.topics.split("|").forEach((t) => counts.set(t, (counts.get(t) || 0) + 1));
    });

    const order = ["Generative models", "Uncertainty", "NLP", "Explainable AI", "Data science", "Systems"];
    const topics = [...counts.keys()].sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });

    topics.forEach((topic) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.dataset.topic = topic;
      chip.setAttribute("aria-pressed", "false");
      chip.innerHTML = `${topic} <span class="count">${counts.get(topic)}</span>`;
      filter.appendChild(chip);
    });

    filter.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      const topic = chip.dataset.topic;
      $$(".chip", filter).forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));

      let shown = 0;
      items.forEach((item) => {
        const match = topic === "all" || item.dataset.topics.split("|").includes(topic);
        item.hidden = !match;
        if (match) shown++;
      });
      groups.forEach((g) => { g.hidden = $$("[data-topics]", g).every((i) => i.hidden); });

      status.textContent = topic === "all"
        ? ""
        : `Showing ${shown} ${shown === 1 ? "project" : "projects"} about ${topic}.`;
    });
  }

  /* ==========================================================================
     Command menu (Ctrl K / Cmd K)
     ========================================================================== */
  const sectionsOnHome = [
    ["About", "about"], ["Research", "research"], ["Projects", "projects"],
    ["Publications", "publications"], ["Experience", "experience"], ["Education", "education"],
    ["Awards", "awards"], ["Skills", "skills"], ["Volunteering", "volunteering"], ["Contact", "contact"],
  ];

  function baseCommands() {
    const go = (hash) => () => {
      if (isHome) {
        const el = document.getElementById(hash);
        if (el) { el.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" }); history.replaceState(null, "", `#${hash}`); }
      } else {
        window.location.href = `${root || "./"}#${hash}`;
      }
    };
    const open = (url) => () => window.open(url, "_blank", "noopener");
    const dark = currentTheme() === "dark";

    return [
      ...sectionsOnHome.map(([label, id]) => ({ group: "Go to", label, hint: isHome ? "Section" : "Homepage", run: go(id) })),
      { group: "Go to", label: "Home", hint: "Page", run: () => { window.location.href = root || "./"; } },
      { group: "Go to", label: "Blog", hint: "Page", run: () => { window.location.href = `${root}blog/`; } },
      { group: "Actions", label: dark ? "Switch to light theme" : "Switch to dark theme", run: () => setTheme(dark ? "light" : "dark") },
      { group: "Actions", label: "Match my device’s theme", run: () => setTheme("system") },
      { group: "Actions", label: "Copy email address", hint: EMAIL, run: copyEmail },
      { group: "Contact", label: "Send an email", run: () => { window.location.href = `mailto:${EMAIL}`; } },
      { group: "Contact", label: "LinkedIn", hint: "Opens in a new tab", run: open(LINKS.linkedin) },
      { group: "Contact", label: "GitHub", hint: "Opens in a new tab", run: open(LINKS.github) },
      { group: "Contact", label: "Instagram", hint: "Opens in a new tab", run: open(LINKS.instagram) },
    ];
  }

  let postCommands = [];
  let postsRequested = false;
  function loadPostCommands() {
    if (postsRequested || location.protocol === "file:") return;
    postsRequested = true;
    fetch(`${root}blog/posts.json`, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : []))
      .then((posts) => {
        postCommands = (Array.isArray(posts) ? posts : [])
          .filter((p) => p && p.slug && p.title && !p.draft)
          .sort((a, b) => String(b.date).localeCompare(String(a.date)))
          .map((p) => ({
            group: "Blog posts",
            label: p.title,
            hint: (p.tags || []).join(", "),
            run: () => { window.location.href = `${root}blog/post.html?slug=${encodeURIComponent(p.slug)}`; },
          }));
        if (palette.open) render();
      })
      .catch(() => {});
  }

  const palette = document.createElement("dialog");
  palette.className = "palette";
  palette.setAttribute("aria-label", "Site menu");
  palette.innerHTML = `
    <div class="palette-search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>
      <input class="palette-input" type="text" role="combobox" aria-expanded="true" aria-controls="palette-list"
             aria-autocomplete="list" placeholder="Search the site" autocomplete="off" spellcheck="false">
    </div>
    <ul class="palette-list" id="palette-list" role="listbox" aria-label="Results" tabindex="-1"></ul>
    <div class="palette-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> to move</span><span><kbd>Enter</kbd> to open</span><span><kbd>Esc</kbd> to close</span></div>`;
  document.body.appendChild(palette);

  const input = $(".palette-input", palette);
  const list = $(".palette-list", palette);
  let results = [];
  let selected = 0;

  function score(command, query) {
    if (!query) return 1;
    const text = `${command.label} ${command.group} ${command.hint || ""}`.toLowerCase();
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.every((w) => text.includes(w))) return 0;
    return command.label.toLowerCase().startsWith(words[0]) ? 2 : 1;
  }

  function render() {
    const query = input.value.trim();
    const all = [...baseCommands(), ...postCommands];
    results = all
      .map((c, i) => ({ c, s: score(c, query), i }))
      .filter((r) => r.s > 0)
      .sort((a, b) => (query ? b.s - a.s : 0) || a.i - b.i)
      .map((r) => r.c);

    // Keep groups together in their original order when not searching
    if (!query) {
      const groupOrder = ["Go to", "Blog posts", "Actions", "Contact"];
      results.sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group));
    }
    selected = Math.min(selected, Math.max(results.length - 1, 0));

    list.innerHTML = "";
    if (!results.length) {
      const empty = document.createElement("li");
      empty.className = "palette-empty";
      empty.textContent = `Nothing matches “${query}”. Try a section name like “research” or “contact”.`;
      list.appendChild(empty);
      input.removeAttribute("aria-activedescendant");
      return;
    }

    let lastGroup = null;
    results.forEach((cmd, i) => {
      if (cmd.group !== lastGroup && !query) {
        const g = document.createElement("li");
        g.className = "palette-group";
        g.setAttribute("role", "presentation");
        g.textContent = cmd.group;
        list.appendChild(g);
        lastGroup = cmd.group;
      }
      const li = document.createElement("li");
      li.className = "palette-item";
      li.id = `palette-opt-${i}`;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", String(i === selected));
      li.innerHTML = `<span class="label"></span>${cmd.hint ? '<span class="hint"></span>' : ""}`;
      $(".label", li).textContent = cmd.label;
      if (cmd.hint) $(".hint", li).textContent = cmd.hint;
      li.addEventListener("click", () => runCommand(i));
      li.addEventListener("pointermove", () => { if (selected !== i) { selected = i; highlight(); } });
      list.appendChild(li);
    });
    highlight();
  }

  function highlight() {
    $$(".palette-item", list).forEach((li) => {
      const isSel = li.id === `palette-opt-${selected}`;
      li.setAttribute("aria-selected", String(isSel));
      if (isSel) {
        input.setAttribute("aria-activedescendant", li.id);
        li.scrollIntoView({ block: "nearest" });
      }
    });
  }

  function runCommand(i) {
    const cmd = results[i];
    if (!cmd) return;
    closePalette();
    // Let the dialog close before scrolling or changing theme
    requestAnimationFrame(() => cmd.run());
  }

  function openPalette() {
    if (palette.open) return;
    input.value = "";
    selected = 0;
    render();
    loadPostCommands();
    // On touch screens, don't focus the text box (that would pop up the keyboard over the list)
    const canHover = window.matchMedia("(hover: hover)").matches;
    input.autofocus = canHover;
    list.autofocus = !canHover;
    palette.showModal();
  }
  function closePalette() { if (palette.open) palette.close(); }

  input.addEventListener("input", () => { selected = 0; render(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); selected = (selected + 1) % results.length; highlight(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); selected = (selected - 1 + results.length) % results.length; highlight(); }
    else if (e.key === "Enter") { e.preventDefault(); runCommand(selected); }
  });
  palette.addEventListener("click", (e) => { if (e.target === palette) closePalette(); }); // click on backdrop

  $$("[data-open-palette]").forEach((btn) => btn.addEventListener("click", openPalette));
  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      palette.open ? closePalette() : openPalette();
    } else if (e.key === "/" && !typing && !palette.open) {
      e.preventDefault();
      openPalette();
    }
  });

  // Expose for other scripts on the page (blog uses the toast)
  window.site = { showToast, root };
})();
