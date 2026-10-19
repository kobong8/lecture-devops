import json
from pathlib import Path
import unittest

from build_search import LectureParser, build_index, serialize

ROOT = Path(__file__).resolve().parents[1]


class SearchIndexTests(unittest.TestCase):
    def test_generated_index_is_current(self):
        self.assertEqual((ROOT / 'assets/search-index.json').read_text(encoding='utf-8'), serialize(build_index()))

    def test_all_lectures_and_links(self):
        data = build_index()['entries']
        self.assertEqual(len(data), 158)
        self.assertEqual(len({entry['course'] for entry in data}), 8)
        self.assertEqual(len({entry['url'] for entry in data}), len(data))
        for entry in data:
            self.assertTrue(entry['title'])
            self.assertTrue(entry['text'])
            self.assertTrue((ROOT / entry['url'].split('#')[0]).is_file())

    def test_nested_blocks_code_tables_and_alt_text(self):
        parser = LectureParser()
        parser.feed('''<div class="brand-text">Docker 강의</div>
        <section class="slide" data-title="Volume" id="volumes">
          <h1>볼륨</h1><section><table><tr><td>volume</td></tr></table></section>
          <pre>docker run --rm &lt;image&gt;</pre><img alt="컨테이너 구조">
          <script>excludedSecret()</script><style>.excludedStyle {}</style>
        </section><footer>제외할 footer</footer>
        <section class="slide" data-title="Next"><p>다음 장</p></section>''')
        self.assertEqual(len(parser.slides), 2)
        first = parser.slides[0]
        self.assertEqual(first['id'], 'volumes')
        self.assertIn('volume', first['text'])
        self.assertIn('docker run --rm <image>', first['text'])
        self.assertIn('컨테이너 구조', first['text'])
        for excluded in ['excludedSecret', 'excludedStyle', 'footer', '다음 장']:
            self.assertNotIn(excluded, first['text'])
        self.assertEqual(parser.slides[1]['id'], 'slide-2')


if __name__ == '__main__':
    unittest.main()
