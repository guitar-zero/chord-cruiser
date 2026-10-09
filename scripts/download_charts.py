#!/usr/bin/env python3
"""Download chord-chart images for local reading. Uses Python 3 and macOS curl."""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

DEFAULT_INDEX = 'https://standardrepertoire.com/'
DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / 'charts'


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.links = []
        self.images = []
        self.list_depth = 0
        self.anchor = None
        self.heading = None
        self.headings = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'ol':
            self.list_depth += 1
        if tag == 'a' and self.list_depth and attrs.get('href'):
            self.anchor = [attrs['href'], '']
        if tag == 'img':
            self.images.append(attrs)
        if re.fullmatch(r'h[1-6]', tag):
            self.heading = []

    def handle_data(self, data):
        if self.anchor is not None:
            self.anchor[1] += data
        if self.heading is not None:
            self.heading.append(data)

    def handle_endtag(self, tag):
        if tag == 'ol':
            self.list_depth = max(0, self.list_depth - 1)
        if tag == 'a' and self.anchor is not None:
            self.links.append(tuple(self.anchor))
            self.anchor = None
        if re.fullmatch(r'h[1-6]', tag) and self.heading is not None:
            self.headings.append(''.join(self.heading).strip())
            self.heading = None


def song_slug(url):
    stem = Path(unquote(urlparse(url).path)).stem
    slug = re.sub(r'[^a-z0-9_-]+', '-', stem.lower()).strip('-')
    if not slug:
        raise ValueError(f'Cannot derive a song name from {url}')
    return slug


def index_songs(html, index_url):
    host = urlparse(index_url).netloc
    songs = {}
    for href, title in Page(html).links:
        url = urljoin(index_url, href)
        parsed = urlparse(url)
        if parsed.netloc == host and parsed.path.endswith('.html'):
            songs.setdefault(url, {'url': url, 'title': title.strip(), 'slug': song_slug(url)})
    if not songs:
        raise ValueError('No song links found in the index’s numbered list.')
    return list(songs.values())


def chart_image(html, page_url):
    images = Page(html).images
    preferred = [image for image in images if 'chord' in image.get('alt', '').lower()]
    fallback = [image for image in images if '/images/' in urljoin(page_url, image.get('src', '')) and re.search(r'\.(jpe?g|png|webp)(?:\?|$)', image.get('src', ''), re.I)]
    for image in preferred + fallback:
        source = image.get('src') or image.get('data-src')
        if source:
            return urljoin(page_url, source)
    raise ValueError('No chord-chart image found on the song page.')


def image_extension(data):
    if data.startswith(b'\xff\xd8\xff') and len(data) > 20:
        return '.jpg'
    if data.startswith(b'\x89PNG\r\n\x1a\n') and len(data) > 20:
        return '.png'
    if data.startswith(b'RIFF') and data[8:12] == b'WEBP' and len(data) > 20:
        return '.webp'
    raise ValueError('Downloaded response is not a supported image (JPEG, PNG, or WebP).')


class Fetcher:
    def __init__(self, delay=.5):
        self.delay = delay
        self.last_request = None
        if not shutil.which('curl'):
            raise RuntimeError('curl is required; macOS includes it by default.')

    def __call__(self, url):
        if urlparse(url).scheme not in ('http', 'https'):
            raise ValueError('Only HTTP/HTTPS URLs are supported.')
        if self.last_request is not None:
            time.sleep(max(0, self.delay - (time.monotonic() - self.last_request)))
        result = subprocess.run(['curl', '--fail', '--location', '--silent', '--show-error', '--retry', '2', '--retry-delay', '1', '--connect-timeout', '10', '--max-time', '30', url], capture_output=True)
        self.last_request = time.monotonic()
        if result.returncode:
            raise RuntimeError(result.stderr.decode('utf-8', errors='replace').strip() or f'curl failed: {result.returncode}')
        return result.stdout


def write_json(path, value):
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    temporary.replace(path)


def download_song(song, output, fetch, previous=None, force=False):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    slug = song['slug']
    # Verify existing files before skipping, even when the manifest is missing.
    if not force:
        for suffix in ['.jpg', '.png', '.webp']:
            path = output / f'{slug}{suffix}'
            if path.exists():
                data = path.read_bytes()
                try:
                    image_extension(data)
                except ValueError:
                    continue
                return {**(previous or {}), **song, 'status': 'downloaded', 'file': path.name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}, True
    html = fetch(song['url']).decode('utf-8', errors='replace')
    image_url = chart_image(html, song['url'])
    data = fetch(image_url)
    suffix = image_extension(data)
    path = output / f'{slug}{suffix}'
    temporary = path.with_suffix(path.suffix + '.part')
    temporary.write_bytes(data)
    temporary.replace(path)
    (output / f'{slug}.html').write_text(html, encoding='utf-8')
    headings = Page(html).headings
    return {**song, 'title': headings[0] if headings else song['title'], 'image_url': image_url, 'file': path.name, 'source_html': f'{slug}.html', 'status': 'downloaded', 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'downloaded_at': datetime.now(timezone.utc).isoformat()}, False


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--index', default=DEFAULT_INDEX, help='Repertoire index URL')
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument('--all', action='store_true', help='Download every song in the numbered index')
    selection.add_argument('--song', nargs='+', help='Song slugs or full song-page URLs, e.g. all-of-me solar')
    selection.add_argument('--list', action='store_true', help='List songs without downloading images')
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT, help=f'Destination (default: {DEFAULT_OUTPUT})')
    parser.add_argument('--limit', type=int, help='Maximum songs in this batch')
    parser.add_argument('--delay', type=float, default=.5, help='Seconds between requests (default: .5)')
    parser.add_argument('--force', action='store_true', help='Refresh images already downloaded')
    args = parser.parse_args(argv)
    if args.delay < 0 or (args.limit is not None and args.limit < 1):
        parser.error('--delay must be nonnegative; --limit must be positive.')
    try:
        fetch = Fetcher(args.delay)
        if args.song:
            songs = []
            for name in args.song:
                url = name if '://' in name else urljoin(args.index, name if name.endswith('.html') else name + '.html')
                slug = song_slug(url)
                if not any(song['url'] == url for song in songs):
                    songs.append({'slug': slug, 'title': slug.replace('-', ' ').title(), 'url': url})
        else:
            songs = index_songs(fetch(args.index).decode('utf-8', errors='replace'), args.index)
        if args.limit:
            songs = songs[:args.limit]
        if args.list:
            for song in songs:
                print(f"{song['slug']:36} {song['title']}")
            return 0
        output = args.output.expanduser().resolve()
        output.mkdir(parents=True, exist_ok=True)
        manifest_path = output / 'manifest.json'
        manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {'index_url': args.index, 'songs': {}}
        failures = 0
        print(f'Saving {len(songs)} charts to {output}', flush=True)
        for index, song in enumerate(songs, 1):
            try:
                entry, skipped = download_song(song, output, fetch, manifest['songs'].get(song['slug']), args.force)
                print(f"[{index}/{len(songs)}] {'SKIP' if skipped else 'SAVED'} {song['title']} → {entry['file']}", flush=True)
            except (OSError, ValueError, RuntimeError) as error:
                failures += 1
                entry = {**song, 'status': 'error', 'error': str(error)}
                print(f"[{index}/{len(songs)}] FAILED {song['title']}: {error}", file=sys.stderr, flush=True)
            manifest['songs'][song['slug']] = entry
            write_json(manifest_path, manifest)
        print(f'Finished: {len(songs) - failures} ready, {failures} failed. Manifest: {manifest_path}', flush=True)
        return 1 if failures else 0
    except (OSError, ValueError, RuntimeError, KeyError) as error:
        print(f'Error: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print('\nInterrupted. Completed downloads are saved; rerun to resume.', file=sys.stderr)
        sys.exit(130)
