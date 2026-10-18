import { findMatches, tokensFor, excerpt, lectureURL } from './search-core.mjs';

const root = new URL('../', import.meta.url);
const course = location.pathname.split('/').pop().replace(/\.html$/, '');
const isLecture = Boolean(document.querySelector('.slide'));
const host = document.querySelector('.kobong-tools') || document.querySelector('.nav-controls');
const key = `kobong-search-return:${root.pathname}`;
let entries, loading, opener, composing = false, searchVersion = 0;
const dialog = document.createElement('dialog');
dialog.id = 'lecture-search';
dialog.setAttribute('aria-labelledby', 'lecture-search-title');
dialog.innerHTML = `<div class="search-heading"><h2 id="lecture-search-title">자료 검색</h2><button type="button" data-close>닫기 · Esc</button></div>
  <p>제목·본문·표·코드를 검색합니다. 여러 단어를 입력하면 모두 포함된 장을 찾습니다.</p>
  <form class="search-controls"><label>검색 범위<select name="scope"><option value="all">전체 강의</option></select></label>
  <label class="search-query">검색어<input name="query" type="search" maxlength="200" autocomplete="off" placeholder="예: docker volume"></label><button type="submit">검색</button></form>
  <p class="search-status" role="status" aria-live="polite"></p><ol class="search-results" aria-label="검색 결과"></ol>`;
document.body.append(dialog);
const form = dialog.querySelector('form'), input = form.elements.query, scope = form.elements.scope;
const status = dialog.querySelector('.search-status'), results = dialog.querySelector('ol');
function button(text, action) {
  const element = document.createElement('button'); element.type = 'button';
  element.textContent = text; element.className = 'lecture-action'; element.onclick = action;
  host.append(element); return element;
}
const searchButton = button('자료 검색', openSearch);
searchButton.title = '자료 검색 (Ctrl+K / ⌘K)'; searchButton.setAttribute('aria-haspopup', 'dialog');

async function load() {
  if (entries) return entries;
  if (loading) return loading;
  loading = (async () => {
    const response = await fetch(new URL('assets/search-index.json', root), { cache: 'no-cache' });
    if (!response.ok) throw new Error('index');
    const data = await response.json();
    if (data.version !== 1 || !Array.isArray(data.entries) || !data.entries.length) throw new Error('index');
    entries = data.entries.filter(entry => lectureURL(entry.url, root));
    const courses = new Map(entries.map(entry => [entry.course, entry.courseTitle]));
    for (const [value, text] of courses) scope.add(new Option(text, value));
    scope.value = isLecture && courses.has(course) ? course : 'all';
    return entries;
  })();
  try { return await loading; } finally { loading = null; }
}
async function openSearch() {
  if (dialog.open) { input.focus(); return; }
  if (document.querySelector('dialog[open]')) return;
  if (document.querySelector('.image-modal[style*="block"],.text-modal[style*="block"],#contactOverlay.active,#chicken-game-overlay.active')) return;
  opener = document.activeElement;
  if (!dialog.open) dialog.showModal();
  input.focus();
  status.textContent = '검색 자료를 불러오는 중입니다.';
  try { await load(); status.textContent = '검색어를 입력한 뒤 Enter 또는 검색 버튼을 누르세요.'; }
  catch { status.textContent = '검색 자료를 불러오지 못했습니다. 검색 버튼을 눌러 다시 시도하세요.'; }
}
function highlight(parent, value, query) {
  const text = String(value).normalize('NFKC');
  const tokens = tokensFor(query).map(token => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!tokens.length) { parent.textContent = text; return; }
  const regex = new RegExp(tokens.sort((a,b) => b.length-a.length).join('|'), 'giu');
  let end = 0;
  for (const match of text.matchAll(regex)) {
    parent.append(document.createTextNode(text.slice(end, match.index)));
    const mark = document.createElement('mark'); mark.textContent = match[0]; parent.append(mark);
    end = match.index + match[0].length;
  }
  parent.append(document.createTextNode(text.slice(end)));
}
async function search(event) {
  event?.preventDefault();
  if (composing) return;
  const version = ++searchVersion;
  results.replaceChildren();
  if (!tokensFor(input.value).length) { status.textContent = '검색어를 입력하세요.'; return; }
  try { await load(); }
  catch { status.textContent = '검색 자료를 불러오지 못했습니다. 검색 버튼을 눌러 다시 시도하세요.'; return; }
  if (version !== searchVersion) return;
  const matches = findMatches(entries, input.value, scope.value);
  status.textContent = matches.length ? `${matches.length}개 슬라이드 · 제목 일치 우선` : '검색 결과가 없습니다. 다른 단어나 전체 강의 범위를 선택해 보세요.';
  for (const entry of matches) {
    const item = document.createElement('li'), link = document.createElement('a');
    link.href = destination(entry.url).href;
    const meta = document.createElement('small'), title = document.createElement('strong'), detail = document.createElement('span');
    meta.textContent = `${entry.courseTitle} · ${entry.number}장`;
    highlight(title, entry.title, input.value); highlight(detail, excerpt(entry.text, input.value), input.value);
    link.append(meta, title, detail); item.append(link); results.append(item);
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      if (isLecture && !returnURL()) {
        try { sessionStorage.setItem(key, JSON.stringify({ url: cleanURL().href, scroll: document.querySelector('.slide.active').scrollTop, focused: document.body.classList.contains('kobong-focused') })); } catch {}
      }
      // Native link navigation also handles other lecture documents and modified clicks.
    });
  }
  results.scrollTop = 0;
}
function cleanURL() { const url = new URL(location.href); url.search = ''; return url; }
function returnURL() { return lectureURL(new URL(location.href).searchParams.get('from') || '', root); }
function destination(value) {
  const url = lectureURL(value, root);
  const origin = returnURL() || (isLecture ? cleanURL() : null);
  if (origin) url.searchParams.set('from', `${origin.pathname.slice(root.pathname.length)}${origin.hash}`);
  return url;
}
const origin = returnURL();
if (origin) {
  button('발표 위치로 복귀', () => {
    const url = new URL(origin); url.searchParams.set('resume', '1'); location.assign(url.href);
  });
}
// Restore the original long-slide scroll position and focused layout, if storage is available.
let saved;
try { saved = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch {}
const resume = new URL(location.href).searchParams.has('resume');
if (saved && lectureURL(saved.url, root)) {
  if (origin && saved.url === origin.href) window.kobongPresentation?.setFocused(Boolean(saved.focused));
  if (resume && saved.url === cleanURL().href) {
    window.kobongPresentation?.setFocused(Boolean(saved.focused));
    const slide = document.querySelector('.slide.active'); if (slide) slide.scrollTop = Number(saved.scroll) || 0;
    try { sessionStorage.removeItem(key); } catch {}
  }
}
if (resume) history.replaceState(null, '', cleanURL());
if (isLecture) button('링크 복사', async event => {
  const trigger = event.currentTarget;
  try {
    await navigator.clipboard.writeText(cleanURL().href);
    trigger.textContent = '복사 완료';
    setTimeout(() => { trigger.textContent = '링크 복사'; }, 1800);
  } catch {
    const copyDialog = document.createElement('dialog'); copyDialog.className = 'link-copy-dialog';
    copyDialog.innerHTML = '<h2>현재 장 링크</h2><p>자동 복사가 차단되었습니다. 링크를 선택해 직접 복사하세요.</p><input aria-label="현재 장 주소" readonly><button type="button">닫기</button>';
    copyDialog.querySelector('input').value = cleanURL().href;
    copyDialog.querySelector('button').onclick = () => copyDialog.close();
    copyDialog.onclose = () => copyDialog.remove();
    document.body.append(copyDialog); copyDialog.showModal(); copyDialog.querySelector('input').select();
  }
});
form.onsubmit = search;
scope.onchange = () => search();
input.oncompositionstart = () => { composing = true; };
input.oncompositionend = () => { composing = false; };
input.oninput = () => { searchVersion++; results.replaceChildren(); status.textContent = 'Enter 또는 검색 버튼을 눌러 검색하세요.'; };
input.addEventListener('keydown', event => {
  if (event.isComposing || event.keyCode === 229) { if (event.key === 'Enter') event.preventDefault(); return; }
  if (event.key === 'ArrowDown') { event.preventDefault(); results.querySelector('a')?.focus(); }
});
dialog.querySelector('[data-close]').onclick = () => dialog.close();
dialog.addEventListener('close', () => { if (opener?.isConnected) opener.focus({ preventScroll:true }); });
// All portal and presentation shortcuts explicitly ignore an open dialog.
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.isComposing && event.key.toLowerCase() === 'k') {
    event.preventDefault(); event.stopImmediatePropagation(); openSearch(); return;
  }
}, true);
