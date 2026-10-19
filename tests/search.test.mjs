import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findMatches, normalize, excerpt, lectureURL } from '../assets/search-core.mjs';
const entries = JSON.parse(readFileSync(new URL('../assets/search-index.json', import.meta.url))).entries;
test('한글/영문, 공백과 전각 문자 정규화', () => {
  assert.equal(normalize('  ＤＯＣＫＥＲ\n Volume  '), 'docker volume');
  assert.ok(findMatches(entries, '컨테이너').length);
  assert.ok(findMatches(entries, 'docker').length);
});
test('제목 우선 정렬과 다중 단어 AND, 강의 필터', () => {
  const sample = [
    { course:'a', courseTitle:'A', title:'Other', text:'docker volume' },
    { course:'b', courseTitle:'B', title:'Docker volume', text:'example' },
    { course:'a', courseTitle:'A', title:'Docker', text:'network' }
  ];
  assert.deepEqual(findMatches(sample, 'docker volume').map(entry => entry.course), ['b','a']);
  assert.equal(findMatches(sample, 'docker volume', 'a').length, 1);
  assert.equal(findMatches(sample, 'docker volume missing').length, 0);
  assert.equal(findMatches(sample, '   ').length, 0);
  assert.ok(findMatches(entries, 'docker', 'docker-intro').every(entry => entry.course === 'docker-intro'));
});
test('일치 문장 발췌와 특수문자 검색', () => {
  assert.ok(excerpt('앞'.repeat(300) + 'docker volume' + '뒤'.repeat(300), 'docker').includes('docker'));
  assert.equal(findMatches([{course:'a', title:'[a+b]', text:'', courseTitle:''}], '[a+b]').length, 1);
});
test('저장소 하위 경로 링크 허용, 외부/경로 탈출 복귀 차단', () => {
  const root = new URL('https://example.com/lecture-devops/');
  assert.equal(lectureURL('lecture_note/linux.html#slide-2', root).pathname, '/lecture-devops/lecture_note/linux.html');
  for (const value of ['https://evil.test/lecture_note/linux.html#slide-1', 'javascript:alert(1)', '../lecture_note/linux.html#slide-1', 'lecture_note/../index.html#slide-1', 'lecture_note/linux.html?from=x#slide-1']) {
    assert.equal(lectureURL(value, root), null);
  }
});
