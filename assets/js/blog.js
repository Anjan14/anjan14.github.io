/* ==========================================================================
   Blog: list page (blog/index.html) and single post page (blog/post.html)

   Posts live in blog/posts/<slug>.md and are listed in blog/posts.json.
   See README.md for how to add a post.
   ========================================================================== */
(function () {
  "use strict";

  const page = document.body.dataset.page;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  const dateFormat = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  function formatDate(iso) {
    const d = new Date(`${iso}T00:00:00Z`);
    return isNaN(d) ? iso : dateFormat.format(d);
  }

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function tagList(tags) {
    const ul = make("ul", "tags");
    (tags || []).forEach((t) => ul.appendChild(make("li", null, t)));
    return ul;
  }

  // A friendly message box used for errors and empty states
  function notice(title, body, action) {
    const box = make("div", "notice");
    box.appendChild(make("h2", null, title));
    const p = make("p");
    p.innerHTML = body;
    box.appendChild(p);
    if (action) {
      const a = make("a", "btn btn-quiet", action.label);
      a.href = action.href;
      box.appendChild(a);
    }
    return box;
  }

  const openedFromFile = location.protocol === "file:";
  const FILE_HELP = "Browsers don’t let a page opened straight from your computer load other files. "
    + "Posts will appear once the site is on GitHub Pages. To preview locally, run <code>python3 -m http.server</code> "
    + "in the site folder and open <code>http://localhost:8000/blog/</code>.";

  async function loadPosts() {
    const response = await fetch("posts.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`posts.json returned ${response.status}`);
    let posts;
    try {
      posts = JSON.parse(await response.text());
    } catch (e) {
      const err = new Error("posts.json is not valid JSON");
      err.invalidJson = e.message;
      throw err;
    }
    return (Array.isArray(posts) ? posts : [])
      .filter((p) => p && p.slug && p.title && !p.draft)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  /* ======================================================================
     Blog index
     ====================================================================== */
  async function initIndex() {
    const list = $("[data-post-list]");
    const status = $("[data-post-status]");
    const noticeSlot = $("[data-post-notice]");
    const search = $("[data-search]");
    const tagFilter = $("[data-tag-filter]");

    let posts;
    try {
      posts = await loadPosts();
    } catch (err) {
      if (openedFromFile) {
        noticeSlot.appendChild(notice("Posts can’t load from a local file", FILE_HELP));
      } else if (err.invalidJson) {
        noticeSlot.appendChild(notice(
          "The post list has a formatting error",
          "blog/posts.json couldn’t be read. Check it for a missing comma, quote or bracket, "
          + "especially around the post you added last."
        ));
      } else {
        noticeSlot.appendChild(notice("The post list didn’t load", "Refresh the page to try again."));
      }
      return;
    }

    if (!posts.length) {
      noticeSlot.appendChild(notice("No posts yet", "The first one is on its way."));
      return;
    }

    // Tag chips
    const tags = [...new Set(posts.flatMap((p) => p.tags || []))].sort();
    let activeTag = "all";
    if (tags.length > 1) {
      tagFilter.hidden = false;
      ["all", ...tags].forEach((tag) => {
        const chip = make("button", "chip", tag === "all" ? "All posts" : tag);
        chip.type = "button";
        chip.dataset.tag = tag;
        chip.setAttribute("aria-pressed", String(tag === "all"));
        tagFilter.appendChild(chip);
      });
      tagFilter.addEventListener("click", (e) => {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        activeTag = chip.dataset.tag;
        tagFilter.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
        render();
      });
    }

    // Search from ?q= so searches can be linked
    const params = new URLSearchParams(location.search);
    if (params.get("q")) search.value = params.get("q");
    if (params.get("tag") && tags.includes(params.get("tag"))) {
      activeTag = params.get("tag");
      tagFilter.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.tag === activeTag)));
    }

    function render() {
      const query = search.value.trim().toLowerCase();
      const words = query.split(/\s+/).filter(Boolean);
      const shown = posts.filter((p) => {
        if (activeTag !== "all" && !(p.tags || []).includes(activeTag)) return false;
        const text = `${p.title} ${p.summary || ""} ${(p.tags || []).join(" ")}`.toLowerCase();
        return words.every((w) => text.includes(w));
      });

      list.innerHTML = "";
      noticeSlot.innerHTML = "";
      shown.forEach((p) => {
        const li = make("li", "post-row");
        const time = make("time", null, formatDate(p.date));
        time.dateTime = p.date;
        const body = make("div");
        const h2 = make("h2");
        const a = make("a", null, p.title);
        a.href = `post.html?slug=${encodeURIComponent(p.slug)}`;
        h2.appendChild(a);
        body.appendChild(h2);
        if (p.summary) body.appendChild(make("p", null, p.summary));
        if (p.tags && p.tags.length) body.appendChild(tagList(p.tags));
        li.append(time, body);
        list.appendChild(li);
      });

      if (!shown.length) {
        const box = make("div", "notice");
        box.appendChild(make("h2", null, "No posts match"));
        box.appendChild(make("p", null, query ? `Nothing matches “${search.value.trim()}”${activeTag !== "all" ? ` in ${activeTag}` : ""}.` : `No posts are tagged ${activeTag} yet.`));
        const clear = make("button", "btn btn-quiet", "Show all posts");
        clear.type = "button";
        clear.addEventListener("click", () => {
          search.value = "";
          activeTag = "all";
          tagFilter.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.tag === "all")));
          render();
          search.focus();
        });
        box.appendChild(clear);
        noticeSlot.appendChild(box);
        status.textContent = "";
      } else {
        status.textContent = query || activeTag !== "all"
          ? `${shown.length} of ${posts.length} ${posts.length === 1 ? "post" : "posts"}`
          : "";
      }
    }

    search.addEventListener("input", render);
    render();
  }

  /* ======================================================================
     Single post
     ====================================================================== */
  async function initPost() {
    const article = $("[data-post]");
    const loading = $("[data-post-loading]");
    const slug = new URLSearchParams(location.search).get("slug") || "";

    const fail = (title, body) => {
      loading.remove();
      article.appendChild(notice(title, body, { label: "See all posts", href: "./" }));
      document.title = `${title} | Anjan Roy`;
    };

    if (openedFromFile) { fail("Posts can’t load from a local file", FILE_HELP); return; }
    if (!slug) { fail("No post selected", "Pick a post from the list."); return; }

    let posts = [];
    try { posts = await loadPosts(); } catch (e) { /* the post can still load without the list */ }
    const index = posts.findIndex((p) => p.slug === slug);
    const meta = posts[index] || { slug, title: slug.replace(/-/g, " ") };

    let markdown;
    try {
      const response = await fetch(`posts/${encodeURIComponent(slug)}.md`, { cache: "no-cache" });
      if (!response.ok) throw new Error(String(response.status));
      markdown = await response.text();
    } catch (e) {
      if (index >= 0) {
        fail("This post’s file is missing",
          `The list mentions it, but <code>blog/posts/${slug.replace(/[^\w-]/g, "")}.md</code> wasn’t found. `
          + "Check that the file was uploaded with exactly that name, and that the <code>.nojekyll</code> file is in the main folder of the repository.");
      } else {
        fail("Post not found", "There’s no post at this address. It may have been renamed or removed.");
      }
      return;
    }

    // Header
    loading.remove();
    const h1 = make("h1", "post-title", meta.title);
    const metaRow = make("div", "post-meta");
    if (meta.date) {
      const time = make("time", null, formatDate(meta.date));
      time.dateTime = meta.date;
      metaRow.appendChild(time);
    }
    const words = markdown.split(/\s+/).filter(Boolean).length;
    metaRow.appendChild(make("span", null, `${Math.max(1, Math.round(words / 220))} min read`));
    if (meta.tags && meta.tags.length) metaRow.appendChild(tagList(meta.tags));
    article.append(h1, metaRow);

    // Body
    const body = make("div", "post-body");
    body.innerHTML = window.marked ? window.marked.parse(markdown) : `<pre>${markdown.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))}</pre>`;
    body.querySelectorAll("a[href^='http']").forEach((a) => { a.target = "_blank"; a.rel = "noopener"; });
    body.querySelectorAll("img").forEach((img) => { img.loading = "lazy"; img.decoding = "async"; });
    article.appendChild(body);

    // Page title and description
    document.title = `${meta.title} | Anjan Roy`;
    if (meta.summary) {
      const desc = document.querySelector('meta[name="description"]');
      if (desc) desc.content = meta.summary;
    }

    // Newer / older post links
    if (index >= 0 && posts.length > 1) {
      const nav = $("[data-post-nav]");
      const newer = posts[index - 1];
      const older = posts[index + 1];
      const link = (post, label, cls) => {
        const a = make("a", cls);
        a.href = `post.html?slug=${encodeURIComponent(post.slug)}`;
        a.append(make("span", "k", label), make("span", "t", post.title));
        return a;
      };
      if (older) nav.appendChild(link(older, "Older post", "prev"));
      if (newer) nav.appendChild(link(newer, "Newer post", "next"));
      nav.hidden = false;
    }

    // Reading progress bar
    const bar = $("[data-progress]");
    const update = () => {
      const rect = article.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.6;
      const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1;
      bar.style.transform = `scaleX(${progress})`;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

  if (page === "blog-index") initIndex();
  if (page === "blog-post") initPost();
})();
