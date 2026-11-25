#!/usr/bin/env python3
"""Builds the Zero Miles blog.

    python3 _blog/build.py

Reads   _blog/posts/*.md            (one file per post, see _blog/README.md)
Writes  blog/index.html             (the post list)
        blog/<slug>.html            (one page per post)
        blog/feed.xml               (RSS feed)

The header, footer, stylesheet and script versions are copied from index.html at
build time, so the blog always matches the rest of the site. The `_blog` folder
starts with an underscore, so GitHub Pages never publishes the sources.

No third-party packages are needed.
"""
import argparse
import datetime
import email.utils
import html
import json
import math
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://thezeromilesmeatcompany.co.uk"
DEFAULT_IMAGE = "/assets/hens-tractor-shelter.jpg"
DEFAULT_AUTHOR = "Harry, The Zero Miles Meat Company"


# --------------------------------------------------------------------------- markdown

def esc(s):
    return html.escape(s, quote=True)


def slugify(s):
    s = re.sub(r"<[^>]+>", "", s).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "section"


def inline(s):
    """Inline markdown: **bold**, *italic*, `code`, [text](url). Everything else is escaped."""
    s = html.escape(s, quote=False)
    codes = []

    def stash(m):
        codes.append(m.group(1))
        return "\x00%d\x00" % (len(codes) - 1)

    s = re.sub(r"`([^`]+)`", stash, s)

    def link(m):
        text, url = m.group(1), m.group(2).strip().replace('"', "%22")
        if not re.match(r"^(https?://|/|#|mailto:|tel:)", url):
            url = "/" + url
        ext = url.startswith("http") and not url.startswith(SITE)
        attrs = ' target="_blank" rel="noopener noreferrer"' if ext else ""
        return '<a href="%s"%s>%s</a>' % (url, attrs, text)

    s = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", link, s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])", r"<em>\1</em>", s)
    s = re.sub(r"(?<![\w/])_(?!\s)(.+?)(?<!\s)_(?![\w/])", r"<em>\1</em>", s)
    s = re.sub(r"\x00(\d+)\x00", lambda m: "<code>%s</code>" % codes[int(m.group(1))], s)
    return s


def image_src(path, slug):
    path = path.strip()
    if re.match(r"^(https?://|/)", path):
        return path
    return "/assets/blog/%s/%s" % (slug, path)


def render_md(text, slug):
    """Block markdown: ## / ### headings, paragraphs, lists, > quotes, ---, and ![alt](img "caption")."""
    lines = text.replace("\r\n", "\n").split("\n")
    out, i = [], 0
    special = re.compile(r"^(\||#{1,3}\s|>\s?|[-*]\s+|\d+[.)]\s+|-{3,}\s*$|\*{3,}\s*$|!\[)")
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        m = re.match(r"^(#{1,3})\s+(.*)$", line)
        if m:
            level = max(2, len(m.group(1)))  # the post title is the only h1
            inner = inline(m.group(2).strip())
            out.append('<h%d id="%s">%s</h%d>' % (level, slugify(inner), inner, level))
            i += 1
            continue
        if re.match(r"^(-{3,}|\*{3,})\s*$", line):
            out.append("<hr>")
            i += 1
            continue
        m = re.match(r'^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$', line)
        if m:
            alt, src, cap = m.group(1), image_src(m.group(2), slug), m.group(3)
            fig = '<figure><img src="%s" alt="%s" loading="lazy">' % (esc(src), esc(alt))
            if cap:
                fig += "<figcaption>%s</figcaption>" % inline(cap)
            out.append(fig + "</figure>")
            i += 1
            continue
        if re.match(r"^>\s?", line):
            buf = []
            while i < len(lines) and re.match(r"^>\s?", lines[i]):
                buf.append(re.sub(r"^>\s?", "", lines[i]))
                i += 1
            out.append("<blockquote>%s</blockquote>" % render_md("\n".join(buf), slug))
            continue
        if line.lstrip().startswith("|") and i + 1 < len(lines) and re.match(r"^\s*\|?[\s:|-]+\|[\s:|-]*$", lines[i + 1]):
            def cells(r):
                return [c.strip() for c in r.strip().strip("|").split("|")]
            head = cells(line)
            i += 2
            rows = []
            while i < len(lines) and lines[i].lstrip().startswith("|"):
                rows.append(cells(lines[i]))
                i += 1
            th = "".join("<th>%s</th>" % inline(c) for c in head)
            tr = "".join("<tr>%s</tr>" % "".join("<td data-label=\"%s\">%s</td>" % (esc(head[n]) if n < len(head) else "", inline(c)) for n, c in enumerate(r)) for r in rows)
            out.append('<div class="table-wrap"><table><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (th, tr))
            continue
        ul, ol = re.match(r"^[-*]\s+(.*)$", line), re.match(r"^\d+[.)]\s+(.*)$", line)
        if ul or ol:
            tag, rx = ("ul", r"^[-*]\s+(.*)$") if ul else ("ol", r"^\d+[.)]\s+(.*)$")
            items = []
            while i < len(lines):
                mm = re.match(rx, lines[i])
                if mm:
                    items.append(mm.group(1).strip())
                    i += 1
                elif lines[i].startswith("  ") and lines[i].strip() and items:
                    items[-1] += " " + lines[i].strip()
                    i += 1
                else:
                    break
            out.append("<%s>%s</%s>" % (tag, "".join("<li>%s</li>" % inline(t) for t in items), tag))
            continue
        buf = []
        while i < len(lines) and lines[i].strip() and not (buf and special.match(lines[i])):
            buf.append(lines[i].strip())
            i += 1
        out.append("<p>%s</p>" % inline(" ".join(buf)))
    return "\n".join(out)


# --------------------------------------------------------------------------- posts

def parse_post(path):
    raw = path.read_text(encoding="utf-8")
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", raw, re.S)
    if not m:
        raise SystemExit("%s: missing front matter (--- block at the top)" % path.name)
    meta = {}
    for line in m.group(1).split("\n"):
        if ":" in line and not line.lstrip().startswith("#"):
            k, v = line.split(":", 1)
            v = v.strip()
            if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
                v = v[1:-1]
            meta[k.strip().lower()] = v
    body = m.group(2).strip()
    slug = path.stem
    if not re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", slug):
        raise SystemExit("%s: the file name must be a lowercase-with-hyphens slug, e.g. my-first-post.md" % path.name)
    for key in ("title", "date"):
        if not meta.get(key):
            raise SystemExit("%s: front matter needs a '%s:' line" % (path.name, key))
    try:
        date = datetime.date.fromisoformat(meta["date"])
    except ValueError:
        raise SystemExit("%s: date must look like 2026-11-25" % path.name)
    words = len(re.findall(r"\w+", body))
    first_para = re.sub(r"<[^>]+>", "", inline(next((p for p in re.split(r"\n\s*\n", body) if p.strip() and not special_line(p)), "")))
    excerpt = meta.get("excerpt") or (first_para[:157].rsplit(" ", 1)[0] + "..." if len(first_para) > 160 else first_para)
    image = meta.get("image", "")
    return {
        "slug": slug,
        "title": meta["title"],
        "date": date,
        "excerpt": excerpt,
        "description": meta.get("description") or excerpt,
        "image": image_src(image, slug) if image else "",
        "image_alt": meta.get("image_alt", ""),
        "author": meta.get("author", DEFAULT_AUTHOR),
        "draft": meta.get("draft", "").lower() in ("true", "yes", "1"),
        "body_html": render_md(body, slug),
        "minutes": max(1, round(words / 220)),
    }


def special_line(p):
    return bool(re.match(r"^(\||#{1,3}\s|>|[-*]\s|\d+[.)]\s|-{3,}|!\[)", p.strip()))


def fmt_date(d):
    return "%d %s %d" % (d.day, d.strftime("%B"), d.year)


# --------------------------------------------------------------------------- site chrome (copied from index.html)

class Chrome:
    def __init__(self):
        idx = (ROOT / "index.html").read_text(encoding="utf-8")
        self.css_v = re.search(r"css/style\.css\?v=(\d+)", idx).group(1)
        self.js_v = re.search(r"js/main\.js\?v=(\d+)", idx).group(1)
        self.gtm = re.search(r"<!-- Google Tag Manager \(noscript\) -->.*?<!-- End Google Tag Manager \(noscript\) -->", idx, re.S).group(0)
        self.header = self._root_relative(re.search(r"<header class=\"site-header\">.*?</header>", idx, re.S).group(0))
        self.footer = self._root_relative(re.search(r"<footer class=\"site-footer\">.*?</footer>", idx, re.S).group(0))

    @staticmethod
    def _root_relative(block):
        def fix(m):
            attr, val = m.group(1), m.group(2)
            if re.match(r"^(https?:|//|/|#|mailto:|tel:|data:)", val) or not val:
                return m.group(0)
            return '%s="/%s"' % (attr, val)
        return re.sub(r'\b(href|src)="([^"]*)"', fix, block)


def page(chrome, *, title, description, path, main, og_type="website", og_image="", extra_head=""):
    canonical = SITE + path
    og_image = og_image or DEFAULT_IMAGE
    if og_image.startswith("/"):
        og_image = SITE + og_image
    return """<!doctype html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#131A17">
<link rel="canonical" href="{canonical}">
<link rel="icon" type="image/png" href="/assets/zmmc_logo_green.png">
<link rel="alternate" type="application/rss+xml" title="The Zero Miles Meat Company blog" href="{site}/blog/feed.xml">
<meta property="og:site_name" content="The Zero Miles Meat Company">
<meta property="og:type" content="{og_type}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{og_image}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/style.css?v={css_v}">
{extra_head}</head>
<body>
{gtm}

{header}

{main}

{footer}

<script src="/js/main.js?v={js_v}"></script>
<script>document.getElementById("year").textContent = new Date().getFullYear();</script>
</body>
</html>
""".format(title=esc(title), desc=esc(description), canonical=canonical, site=SITE, og_type=og_type, og_image=esc(og_image),
           css_v=chrome.css_v, js_v=chrome.js_v, gtm=chrome.gtm, header=chrome.header, footer=chrome.footer,
           main=main, extra_head=extra_head)


def card(p):
    img = ""
    if p["image"]:
        img = '<a href="/blog/%s.html" tabindex="-1" aria-hidden="true"><img class="post-card-img" src="%s" alt="" loading="lazy"></a>' % (p["slug"], esc(p["image"]))
    return """      <article class="card post-card">
        {img}
        <div class="post-card-body">
          <span class="post-meta">{date} &middot; {mins} min read</span>
          <h3><a href="/blog/{slug}.html">{title}</a></h3>
          <p>{excerpt}</p>
          <a class="read-more" href="/blog/{slug}.html">Read the post &rarr;</a>
        </div>
      </article>""".format(img=img, date=fmt_date(p["date"]), mins=p["minutes"], slug=p["slug"], title=esc(p["title"]), excerpt=esc(p["excerpt"]))


def index_main(posts):
    if posts:
        body = '    <div class="post-grid">\n%s\n    </div>' % "\n".join(card(p) for p in posts)
    else:
        body = """    <div class="empty-state" style="max-width:620px; margin:0 auto;">
      <h3>First post coming soon</h3>
      <p>We're getting our first posts ready. Please check back shortly.</p>
    </div>"""
    return """<section class="hero" style="padding-bottom:80px;">
  <div class="container" style="max-width:800px;">
    <span class="eyebrow">The Blog</span>
    <h1>Thoughts from <span>The Zero Miles Meat Company.</span></h1>
    <p class="lede">Updates and thoughts from Harry at The Zero Miles Meat Company.</p>
  </div>
</section>

<section>
  <div class="container">
%s
  </div>
</section>""" % body


def post_main(p, newer, older):
    hero_img = ""
    if p["image"]:
        hero_img = """
<section style="padding-top:56px; padding-bottom:0;">
  <div class="container" style="max-width:980px;">
    <div class="photo-banner" style="aspect-ratio:16 / 9;">
      <img src="%s" alt="%s">
    </div>
  </div>
</section>
""" % (esc(p["image"]), esc(p["image_alt"]))
    nav = []
    if newer:
        nav.append('<a class="post-nav-newer" href="/blog/%s.html"><span>Newer post</span>%s</a>' % (newer["slug"], esc(newer["title"])))
    else:
        nav.append("<span></span>")
    if older:
        nav.append('<a class="post-nav-older" href="/blog/%s.html"><span>Older post</span>%s</a>' % (older["slug"], esc(older["title"])))
    postnav = '\n    <nav class="post-nav" aria-label="More posts">%s</nav>' % "".join(nav) if (newer or older) else ""
    lede = '\n    <p class="lede">%s</p>' % esc(p["excerpt"]) if p["excerpt"] else ""
    return """<section class="hero" style="padding-bottom:70px;">
  <div class="container" style="max-width:820px;">
    <a class="post-back" href="/blog/">&larr; All posts</a>
    <span class="eyebrow" style="display:block;">{date} &middot; {mins} min read</span>
    <h1>{title}</h1>{lede}
    <p class="post-byline">By {author}</p>
  </div>
</section>
{hero_img}
<section class="section-oat" style="{pad}">
  <div class="container">
    <article class="post-content">
{body}
    </article>{postnav}
    <p class="text-center" style="margin-top:44px;"><a class="btn btn-outline-dark" href="/blog/">Back to the blog</a></p>
  </div>
</section>""".format(date=fmt_date(p["date"]), mins=p["minutes"], title=esc(p["title"]), lede=lede, author=esc(p["author"]),
                      hero_img=hero_img, pad="padding-top:56px;" if not p["image"] else "padding-top:48px;", body=p["body_html"], postnav=postnav)


def feed(posts):
    now = email.utils.format_datetime(datetime.datetime.now(datetime.timezone.utc))
    items = []
    for p in posts:
        pub = email.utils.format_datetime(datetime.datetime.combine(p["date"], datetime.time(9, 0), tzinfo=datetime.timezone.utc))
        url = "%s/blog/%s.html" % (SITE, p["slug"])
        body = p["body_html"].replace('src="/', 'src="%s/' % SITE).replace('href="/', 'href="%s/' % SITE).replace("]]>", "]]&gt;")
        items.append("""    <item>
      <title>{title}</title>
      <link>{url}</link>
      <guid isPermaLink="true">{url}</guid>
      <pubDate>{pub}</pubDate>
      <description>{desc}</description>
      <content:encoded><![CDATA[{body}]]></content:encoded>
    </item>""".format(title=html.escape(p["title"]), url=url, pub=pub, desc=html.escape(p["excerpt"]), body=body))
    return """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>The Zero Miles Meat Company blog</title>
    <link>{site}/blog/</link>
    <atom:link href="{site}/blog/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Updates and thoughts from Harry at The Zero Miles Meat Company.</description>
    <language>en-gb</language>
    <lastBuildDate>{now}</lastBuildDate>
{items}
  </channel>
</rss>
""".format(site=SITE, now=now, items="\n".join(items))


def jsonld(p):
    data = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": p["title"],
        "datePublished": p["date"].isoformat(),
        "description": p["excerpt"],
        "author": {"@type": "Person", "name": p["author"].split(",")[0].strip()},
        "publisher": {"@type": "Organization", "name": "The Zero Miles Meat Company", "url": SITE},
        "mainEntityOfPage": "%s/blog/%s.html" % (SITE, p["slug"]),
    }
    if p["image"]:
        data["image"] = p["image"] if p["image"].startswith("http") else SITE + p["image"]
    return '<script type="application/ld+json">%s</script>\n' % json.dumps(data, ensure_ascii=False).replace("</", "<\\/")


# --------------------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--posts", default=str(ROOT / "_blog" / "posts"), help="folder of .md posts")
    ap.add_argument("--out", default=str(ROOT / "blog"), help="output folder (published at /blog/)")
    ap.add_argument("--include-drafts", action="store_true", help="also build posts marked 'draft: true'")
    args = ap.parse_args()

    posts_dir, out = pathlib.Path(args.posts), pathlib.Path(args.out)
    posts = [parse_post(f) for f in sorted(posts_dir.glob("*.md"))] if posts_dir.is_dir() else []
    posts = [p for p in posts if args.include_drafts or not p["draft"]]
    posts.sort(key=lambda p: (p["date"], p["slug"]), reverse=True)
    slugs = [p["slug"] for p in posts]
    if len(set(slugs)) != len(slugs):
        raise SystemExit("duplicate post slugs")

    chrome = Chrome()
    out.mkdir(parents=True, exist_ok=True)
    (out / "index.html").write_text(page(
        chrome, title="Blog | The Zero Miles Meat Company",
        description="Updates and thoughts from Harry at The Zero Miles Meat Company.",
        path="/blog/", main=index_main(posts)), encoding="utf-8")

    for n, p in enumerate(posts):
        newer = posts[n - 1] if n > 0 else None
        older = posts[n + 1] if n + 1 < len(posts) else None
        (out / ("%s.html" % p["slug"])).write_text(page(
            chrome, title="%s | The Zero Miles Meat Company" % p["title"], description=p["description"],
            path="/blog/%s.html" % p["slug"], main=post_main(p, newer, older), og_type="article",
            og_image=p["image"], extra_head=jsonld(p)), encoding="utf-8")

    for f in out.glob("*.html"):  # remove pages for posts that no longer exist
        if f.name != "index.html" and f.stem not in slugs:
            f.unlink()
    (out / "feed.xml").write_text(feed(posts), encoding="utf-8")
    print("Built %d post(s) -> %s" % (len(posts), out))
    for p in posts:
        print("  %s  /blog/%s.html  %s" % (p["date"], p["slug"], p["title"]))


if __name__ == "__main__":
    sys.exit(main())
