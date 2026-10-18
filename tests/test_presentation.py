"""Static integration checks; browser behavior requires separate visual QA."""
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = {'devops': 8, 'docker-intro': 21, 'docker-practice': 21,
            'github': 23, 'jenkins': 15, 'kubernetes': 26, 'linux': 28, 'server-client': 16}


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.slides = []
        self.ids = []
        self.styles = []
        self.scripts = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'section' and 'slide' in attrs.get('class', '').split():
            self.slides.append(attrs)
        if tag == 'link' and attrs.get('rel') == 'stylesheet':
            self.styles.append(attrs.get('href'))
        if tag == 'script' and 'src' in attrs:
            self.scripts.append(attrs)


class PresentationTests(unittest.TestCase):
    def test_every_lecture_retains_slides_and_hooks(self):
        for name, count in EXPECTED.items():
            with self.subTest(lecture=name):
                page = Page((ROOT / 'lecture_note' / f'{name}.html').read_text(encoding='utf-8'))
                self.assertEqual(len(page.slides), count)
                self.assertTrue(all(slide.get('data-title') for slide in page.slides))
                for hook in ['main', 'sidebar', 'tocList', 'btnPrev', 'btnNext', 'curNum', 'totNum', 'progressFill']:
                    self.assertIn(hook, page.ids)
                self.assertEqual(page.styles[-1], '../assets/kobong-presentation.css')
                adapter = [script for script in page.scripts if script['src'] == '../assets/kobong-presentation.js']
                self.assertEqual(len(adapter), 1)
                self.assertIn('defer', adapter[0])

    def test_portal_and_shared_assets(self):
        page = Page((ROOT / 'index.html').read_text(encoding='utf-8'))
        self.assertEqual(page.styles[-1], 'assets/kobong-presentation.css')
        for file in ['kobong-presentation.css', 'kobong-presentation.js']:
            self.assertTrue((ROOT / 'assets' / file).is_file())


if __name__ == '__main__':
    unittest.main()
