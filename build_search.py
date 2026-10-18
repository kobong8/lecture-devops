"""Generate a static search index from lecture HTML. No third-party dependencies."""
import argparse
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / 'assets' / 'search-index.json'
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}


class LectureParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.slides = []
        self.current = None
        self.depth = 0
        self.course = []
        self.brand_depth = None

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag not in VOID:
            self.stack.append(tag)
        if 'brand-text' in attrs.get('class', '').split():
            self.brand_depth = len(self.stack)
        if tag == 'section' and 'slide' in attrs.get('class', '').split():
            self.current = {'id': attrs.get('id', f'slide-{len(self.slides) + 1}'),
                            'title': attrs.get('data-title', ''), 'parts': []}
            self.depth = len(self.stack)
        if self.current and tag == 'img' and attrs.get('alt'):
            self.current['parts'].append(attrs['alt'])

    def handle_endtag(self, tag):
        if tag not in self.stack:
            return
        depth = len(self.stack) - self.stack[::-1].index(tag)
        if self.current and depth <= self.depth:
            self.current['text'] = re.sub(r'\s+', ' ', ' '.join(self.current.pop('parts'))).strip()
            self.slides.append(self.current)
            self.current = None
        if self.brand_depth is not None and depth <= self.brand_depth:
            self.brand_depth = None
        del self.stack[depth - 1:]

    def handle_data(self, data):
        if self.brand_depth is not None:
            self.course.append(data)
        if self.current and not any(tag in {'script', 'style'} for tag in self.stack):
            self.current['parts'].append(data)


def build_index(root=ROOT):
    entries = []
    for path in sorted((root / 'lecture_note').glob('*.html')):
        parser = LectureParser()
        parser.feed(path.read_text(encoding='utf-8'))
        course = ''.join(parser.course).strip() or path.stem
        if not parser.slides:
            raise ValueError(f'No slides: {path}')
        for number, slide in enumerate(parser.slides, 1):
            entries.append({'course': path.stem, 'courseTitle': course, 'number': number,
                            'title': slide['title'], 'text': slide['text'],
                            'url': f'lecture_note/{path.name}#{quote(slide["id"])}'})
    urls = [entry['url'] for entry in entries]
    if len(set(urls)) != len(urls):
        raise ValueError('Duplicate slide URLs')
    return {'version': 1, 'entries': entries}


def serialize(data):
    return json.dumps(data, ensure_ascii=False, indent=2) + '\n'


if __name__ == '__main__':
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--check', action='store_true', help='Fail if the committed index is stale')
    args = cli.parse_args()
    data = build_index()
    output = serialize(data)
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding='utf-8') != output:
            raise SystemExit('Search index is stale. Run: python build_search.py')
        print(f'Search index is current: {len(data["entries"])} slides')
    else:
        OUTPUT.write_text(output, encoding='utf-8')
        print(f'Generated {OUTPUT.name}: {len(data["entries"])} slides')
