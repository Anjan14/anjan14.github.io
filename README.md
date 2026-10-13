# anjan14.github.io

Personal website of Anjan Roy, live at **https://anjan14.github.io**.

Plain HTML, CSS and JavaScript. No build step: edit a file on GitHub, commit, and the site updates in a minute or two.

## What's where

| File | What it controls |
| --- | --- |
| `index.html` | The homepage: name, intro, about, research, projects, publications, CV sections, contact |
| `blog/posts.json` | The list of blog posts (title, date, tags, summary) |
| `blog/posts/*.md` | The blog posts themselves, written in Markdown |
| `assets/img/anjan-roy.jpg` and `.webp` | Your photo |
| `assets/css/style.css` | Colors, fonts and layout |
| `assets/js/` | Interactive parts (theme switch, menu, photo lens, demos, blog) |
| `404.html` | The "page not found" page |
| `.nojekyll` | Tells GitHub to serve files exactly as they are. **Keep this file**, or blog posts won't load. |

## Write a new blog post

1. On GitHub, open the `blog/posts` folder, click **Add file → Create new file**.
2. Name it something like `my-first-paper.md` (lowercase, dashes instead of spaces). The part before `.md` is the post's *slug*.
3. Write the post in Markdown. Don't repeat the title at the top; it's added for you.
4. Commit the file.
5. Open `blog/posts.json`, click the pencil icon, and add an entry **at the top** of the list:

```json
[
  {
    "slug": "my-first-paper",
    "title": "What I learned writing my first paper",
    "date": "2026-11-02",
    "tags": ["Research"],
    "summary": "One sentence that appears in the post list."
  },
  {
    "slug": "hello-world",
    ...
  }
]
```

Every entry except the last needs a comma after its closing `}`. If the blog page says the list has a formatting error, a missing comma or quote is almost always the cause.

To hide a post while you're still writing it, add `"draft": true` to its entry.

**Images in posts:** upload them to `blog/posts/images/` and use `![Description of the image](posts/images/photo.jpg)`.

## Update the homepage

Open `index.html` on GitHub and click the pencil icon. Each section is marked with a comment like `<!-- ============ Projects ============ -->`.

- **Add a link to a project write-up:** in the Projects section, replace `<p class="project-more">A full write-up is coming soon.</p>` with
  `<p class="project-more"><a href="blog/post.html?slug=genmor">Read the write-up</a></p>`
- **Add a downloadable CV:** upload a PDF as `assets/cv.pdf` (a version without your phone number), then add this line after the Instagram link in the hero:
  `<li><a href="assets/cv.pdf">CV (PDF)</a></li>`
- **Add a research entry:** copy one `<li data-topics="...">…</li>` block in the Research section and edit it. The `data-topics` value decides which filter button it appears under; separate several topics with `|`.

## Change the photo

Replace `assets/img/anjan-roy.jpg` and `assets/img/anjan-roy.webp` with new files of the same names. A portrait crop (4:5, about 960 × 1200 pixels) works best.

## Preview on your own computer

Opening `index.html` by double-clicking works for the homepage, but the blog needs a small local server:

```
cd path/to/this/folder
python3 -m http.server
```

Then visit http://localhost:8000.

## Keyboard shortcuts

- `Ctrl K` (or `⌘K` on a Mac), or `/`: open the menu to jump to any section, post or action
- The moon/sun button switches between light and dark themes; "Match my device's theme" in the menu resets it

## Credits

Fonts: [Newsreader](https://github.com/productiontype/Newsreader), [Schibsted Grotesk](https://github.com/schibsted/schibsted-grotesk) and [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono), all under the SIL Open Font License. Markdown rendering by [marked](https://github.com/markedjs/marked) (MIT).
