# Blog

The blog is reached only from the footer ("Blog" under Explore), not the main navigation.
There is no login, comments or user accounts: posts are written here and published with the site.

## Adding a post

1. Create `_blog/posts/<slug>.md` (lowercase words with hyphens, e.g. `why-small-farms-matter.md`).
   The file name becomes the page address: `/blog/why-small-farms-matter.html`.
2. Put images in `assets/blog/<slug>/` (resized to about 1600px wide, JPEG at roughly 80% quality).
3. Run `python3 _blog/build.py`. It rewrites `blog/index.html`, one `blog/<slug>.html` per post and `blog/feed.xml`.
4. Commit the source file, the images and the generated `blog/` folder.

Folders starting with an underscore are never published by GitHub Pages, so the sources stay private.

## Post format

```
---
title: The title of the post
date: 2026-11-25
excerpt: One or two sentences shown on the blog list and in search results (optional).
image: hero.jpg
image_alt: Describe the picture for screen readers
author: Harry, The Zero Miles Meat Company
draft: true
---

Body text in simple Markdown.
```

* Required: `title` and `date` (YYYY-MM-DD). Everything else is optional.
* `image` is the featured picture (a bare file name means `assets/blog/<slug>/<file>`).
* `draft: true` keeps a post out of the build until the line is removed.
* If `excerpt` is left out, the first paragraph is used.

Supported Markdown: `##` and `###` headings, paragraphs, `**bold**`, `*italic*`, `[links](https://...)`,
`-` bullet lists, `1.` numbered lists, `> quotes`, `---` dividers, and images on their own line with an
optional caption: `![alt text](photo.jpg "Caption")`.

The page header, footer and styles are copied from `index.html` when the blog is built, so rebuild
(`python3 _blog/build.py`) after changing the site footer or stylesheet version.
