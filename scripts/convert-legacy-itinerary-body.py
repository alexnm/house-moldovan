#!/usr/bin/env python3
"""Convert body of old itinerary .md: img paths, videos, Nunjucks, figures."""

import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src/assets"

# case-insensitive stem -> relpath from src/assets/ using forward slashes
def build_asset_index():
    idx: dict[str, str] = {}
    for f in ASSETS.rglob("*"):
        if f.suffix.lower() in {".jpg", ".jpeg", ".png", ".gif", ".webp", ".JPG", ".avif"}:
            rel = f.relative_to(ASSETS).as_posix()
            key = f.stem.lower()
            if key not in idx:
                idx[key] = rel
    return idx


ASSET_BY_STEM = build_asset_index()


def resolve_path(img_subpath: str) -> str | None:
    """/img/vietnam/foo.jpg or vietnam/foo -> assets relpath"""
    s = img_subpath.strip().strip("/")
    s = re.sub(r"^img/", "", s)
    parts = s.split("/")
    if not parts:
        return None
    name = parts[-1]
    stem = os.path.splitext(name)[0].lower()
    if stem in ASSET_BY_STEM:
        return ASSET_BY_STEM[stem]
    # try full path
    rel = s
    if (ASSETS / rel).is_file():
        return rel
    if (ASSETS / rel).with_suffix('.JPG').is_file():
        return rel.rsplit(".", 1)[0] + ".JPG"
    return None


def sub_img_tags(body: str) -> str:
    def rep(m: re.Match) -> str:
        block = m.group(0)
        sm = re.search(r'src="/img/([^"]+)"', block)
        if not sm:
            return block
        ap = resolve_path(sm.group(1))
        if not ap:
            return block
        am = re.search(r'alt="([^"]*)"', block)
        alt = am.group(1) if am else ""
        return f'<AssetImage path="{ap}" alt="{alt}" />'

    return re.sub(r"<img\b[\s\S]*?>", rep, body)


def sub_videos(body: str) -> str:
    def repl(m):
        path = m.group(1)
        if "hanoi-video" in path:
            p = "/media/vietnam-hanoi.mp4"
        elif "ha-long-bay-video" in path:
            p = "/media/vietnam-ha-long-bay.mp4"
        elif "saigon-video" in path:
            p = "/media/vietnam-saigon.mp4"
        elif "tokyo-shibuya" in path:
            p = "/media/japan-tokyo-shibuya.mp4"
        else:
            p = path
        return f'<source src="{p}" type="video/mp4" />'

    return re.sub(
        r'<source\s+src="/img/([^"]+)"\s+type="video/mp4"\s*/\s*>',
        repl,
        body,
    )


def sub_responsive_nunjucks(body: str) -> str:
    def r1(m):
        p = m.group(1).rsplit("_", 1)[0]  # drop cloudinary id
        # jordan/petra_m88 -> jordan/petra
        p = p.replace("_m88", "").replace("bn5", "")
        ap = resolve_path(f"{p.split('/')[0]}/" + p.split("/")[-1] + ".jpg")
        if not ap and "/" in p:
            folder, base = p.split("/", 1)
            for ext in (".jpg", ".JPG", ".jpeg"):
                trial = f"{folder}/{os.path.splitext(base)[0]}{ext}"
                if (ASSETS / trial).is_file():
                    ap = trial
                    break
        if not ap:
            base_stem = os.path.splitext(p.split("/")[-1])[0]
            if base_stem.lower() in ASSET_BY_STEM:
                ap = ASSET_BY_STEM[base_stem.lower()]
        if not ap:
            return f"<!-- missing image: {m.group(0)[:60]} -->\n"
        alt = m.group(2) or ""
        cap = m.group(3) or ""
        if cap:
            return (
                f'<figure class="prose-figure">\n  <AssetImage path="{ap}" alt="{alt}" />\n'
                f"  <figcaption>{cap}</figcaption>\n</figure>\n"
            )
        return f'<AssetImage path="{ap}" alt="{alt}" />\n'

    return re.sub(
        r"{%\s*responsiveImage\s+\"([^\"]+)\"\s*,\s*\"([^\"]*)\"\s*,\s*\"([^\"]*)\"\s*%}",
        r1,
        body,
    )


def extract_body_from_legacy(md: str) -> str:
    """Content after the markdown table, first ## heading."""
    m = re.search(r"^##\s", md, re.MULTILINE)
    if not m:
        return md
    return md[m.start() :].strip()


def convert_body(text: str) -> str:
    b = sub_responsive_nunjucks(text)
    b = sub_img_tags(b)
    b = sub_videos(b)
    b = b.replace("Sorry, your browser doesn't support embedded videos.", "")
    b = b.replace("rel=\"noreferrer noopener\"", "rel=\"noreferrer\"")
    return b


if __name__ == "__main__":
    import sys

    p = Path(sys.argv[1])
    full = p.read_text(encoding="utf-8")
    body = extract_body_from_legacy(full)
    out = convert_body(body)
    print(out)
