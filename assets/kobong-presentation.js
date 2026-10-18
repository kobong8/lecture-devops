/* Presentation adapter: reuse the lecture's original goSlide, modals and content. */
(() => {
  const main = document.getElementById('main');
  const slides = [...document.querySelectorAll('.slide')];
  if (!main || !slides.length) return;
  const course = document.querySelector('.brand-text').textContent;
  const originalGoSlide = window.goSlide;
  let focused = false;
  let sidebarWasCollapsed = false;
  const skip = document.createElement('a');
  skip.className = 'kobong-skip'; skip.href = '#main'; skip.textContent = '본문으로 이동';
  skip.onclick = event => { event.preventDefault(); main.focus(); };
  main.tabIndex = -1; document.body.prepend(skip);
  const toolbar = document.createElement('header');
  toolbar.className = 'kobong-toolbar';
  toolbar.innerHTML = '<div class="kobong-breadcrumb"></div><div class="kobong-tools"><button type="button" id="kobong-home">강의 목록</button><button type="button" id="kobong-focus" aria-pressed="false">집중 모드 · F</button></div>';
  toolbar.querySelector('.kobong-breadcrumb').textContent = `Kobong / ${course}`;
  toolbar.querySelector('#kobong-home').onclick = () => { location.href = '../'; };
  main.prepend(toolbar);
  const mobile = document.createElement('div');
  mobile.className = 'kobong-mobile';
  mobile.innerHTML = '<label for="kobong-chapter">목차</label><select id="kobong-chapter"></select>';
  const select = mobile.querySelector('select');
  slides.forEach((slide, index) => {
    if (!slide.id) slide.id = `slide-${index + 1}`;
    const option = document.createElement('option'); option.value = index;
    option.textContent = `${String(index + 1).padStart(2, '0')} · ${slide.dataset.title}`;
    select.append(option);
    // Preserve original callout wording and only restyle the final direct child.
    const last = slide.lastElementChild;
    if (last?.matches('.highlight-box,.info-box')) last.classList.add('kobong-takeaway');
    slide.querySelectorAll('table').forEach(table => {
      const wrapper = document.createElement('div'); wrapper.className = 'kobong-table-wrap';
      wrapper.tabIndex = 0; wrapper.setAttribute('role', 'region'); wrapper.setAttribute('aria-label', '표 가로 스크롤');
      table.before(wrapper); wrapper.append(table);
    });
  });
  main.prepend(mobile);
  const footer = document.createElement('footer'); footer.className = 'kobong-position';
  footer.innerHTML = '<strong></strong><span>← → 이동 · F 집중 모드 · T 테마</span>';
  main.append(footer);
  const status = document.createElement('span');
  status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  status.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)';
  document.body.append(status);
  const prev = document.getElementById('btnPrev'), next = document.getElementById('btnNext');
  prev.textContent = '← 이전'; next.textContent = '다음 →';
  const toc = [...document.querySelectorAll('.toc-item')];
  toc.forEach((item, index) => {
    item.tabIndex = 0; item.setAttribute('role', 'button');
    item.querySelector('.toc-num').textContent = String(index + 1).padStart(2, '0');
    item.addEventListener('keydown', event => {
      if (['Enter', ' '].includes(event.key)) { event.preventDefault(); window.goSlide(index); }
    });
  });
  const activeIndex = () => Math.max(0, slides.findIndex(slide => slide.classList.contains('active')));
  window.goSlide = index => {
    if (index < 0 || index >= slides.length) return;
    originalGoSlide(index);
    select.value = index;
    footer.querySelector('strong').textContent = `${String(index + 1).padStart(2, '0')} / ${slides.length}`;
    slides.forEach((slide, i) => { slide.inert = i !== index; slide.setAttribute('aria-hidden', String(i !== index)); });
    toc.forEach((item, i) => i === index ? item.setAttribute('aria-current', 'step') : item.removeAttribute('aria-current'));
    const progress = document.querySelector('.progress-bar');
    progress.setAttribute('role', 'progressbar'); progress.setAttribute('aria-label', '강의 진행');
    progress.setAttribute('aria-valuemin', '1'); progress.setAttribute('aria-valuemax', slides.length); progress.setAttribute('aria-valuenow', index + 1);
    history.replaceState(null, '', `#${slides[index].id}`);
    status.textContent = `${index + 1} / ${slides.length} · ${slides[index].dataset.title}`;
  };
  select.onchange = () => window.goSlide(Number(select.value));
  function fromHash() {
    const index = slides.findIndex(slide => `#${slide.id}` === location.hash);
    window.goSlide(index < 0 ? 0 : index);
  }
  window.addEventListener('hashchange', fromHash);
  const focusButton = toolbar.querySelector('#kobong-focus');
  function setFocus(value) {
    if (value && !focused) sidebarWasCollapsed = document.body.classList.contains('sidebar-collapsed');
    focused = value;
    document.body.classList.toggle('kobong-focused', value);
    document.body.classList.remove('sidebar-open');
    if (!value) {
      document.body.classList.toggle('sidebar-collapsed', sidebarWasCollapsed);
      window.setSidebarToggle?.(!sidebarWasCollapsed && innerWidth > 768);
    }
    focusButton.setAttribute('aria-pressed', String(value));
    focusButton.textContent = value ? '집중 모드 종료 · Esc' : '집중 모드 · F';
  }
  async function toggleFocus() {
    setFocus(!focused);
    try {
      if (focused) await document.documentElement.requestFullscreen?.();
      else if (document.fullscreenElement) await document.exitFullscreen();
    } catch { /* Fullscreen is optional. */ }
  }
  focusButton.onclick = toggleFocus;
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && focused) setFocus(false); });
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) return;
    // Let the existing modal handlers own their keys.
    if ([...document.querySelectorAll('.image-modal,.text-modal')].some(modal => getComputedStyle(modal).display !== 'none')) return;
    if (event.key === 'Escape' && focused) { event.preventDefault(); toggleFocus(); return; }
    if (event.key.toLowerCase() === 'f') { event.preventDefault(); toggleFocus(); return; }
    if (event.key.toLowerCase() === 't') { event.preventDefault(); window.toggleTheme(); return; }
    if (event.key === ' ' && event.target.closest('button,a,summary,[role="button"]')) return;
    const moves = { ArrowRight:1, PageDown:1, ' ':1, ArrowLeft:-1, PageUp:-1 };
    if (event.key in moves) { event.preventDefault(); window.goSlide(activeIndex() + moves[event.key]); }
    if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); window.goSlide(event.key === 'Home' ? 0 : slides.length - 1); }
  });
  const theme = document.querySelector('.theme-toggle');
  theme.tabIndex = 0; theme.setAttribute('role', 'button');
  theme.addEventListener('keydown', event => { if (['Enter',' '].includes(event.key)) { event.preventDefault(); window.toggleTheme(); } });
  // Add a failure path to the existing copy controls without changing code text.
  document.querySelectorAll('.code-block-container').forEach(container => {
    const button = container.querySelector('.copy-btn'), code = container.querySelector('.code-block');
    if (!button || !code) return;
    button.onclick = async () => {
      try { await navigator.clipboard.writeText(code.innerText); button.querySelector('span').textContent = '복사 완료'; }
      catch {
        const range = document.createRange(); range.selectNodeContents(code);
        const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
        status.textContent = '자동 복사가 차단되었습니다. 선택한 코드를 Ctrl+C로 복사하세요.';
        button.querySelector('span').textContent = 'Ctrl+C로 복사';
      }
    };
  });
  fromHash();
})();
