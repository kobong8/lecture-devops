"""Browser network regression: pip install playwright; playwright install chromium.
Run a static server on 8765, then python tests/check_analytics.py.
"""
import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PAGES = ['index.html'] + [p.relative_to(ROOT).as_posix() for p in sorted((ROOT / 'lecture_note').glob('*.html'))]

def analytics_url(url):
    host = urlparse(url).hostname or ''
    return host == 'cloudflareinsights.com' or host.endswith('.cloudflareinsights.com') or '/cdn-cgi/rum' in url

with sync_playwright() as pw:
    browser = pw.chromium.launch(args=['--host-resolver-rules=MAP lecture.internal 127.0.0.1', '--no-proxy-server'])
    results = []
    for origin in ['http://localhost:8765', 'http://lecture.internal:8765']:
        context = browser.new_context()
        for path in PAGES:
            page = context.new_page()
            requests, errors = [], []
            page.on('request', lambda req: requests.append(req.url))
            page.on('pageerror', lambda error: errors.append(str(error)))
            response = page.goto(f'{origin}/{path}', wait_until='load')
            assert response.status == 200
            assert page.evaluate('window.LECTURE_ANALYTICS.enabled') is False
            before = page.locator('html').get_attribute('class')
            page.locator('.theme-toggle').first.click()
            assert page.locator('html').get_attribute('class') != before
            if path == 'index.html':
                page.keyboard.press('c')
                assert page.locator('#contactOverlay').evaluate("el => el.classList.contains('active')")
                page.keyboard.press('Escape')
                page.keyboard.press('e')
                assert page.locator('#chicken-game-overlay').evaluate("el => el.classList.contains('active')")
                page.keyboard.press('Escape')
            else:
                active = page.locator('.slide.active').inner_text()
                page.keyboard.press('ArrowRight')
                page.wait_for_timeout(600)
                assert page.locator('.slide.active').inner_text() != active
            page.wait_for_timeout(1000)
            assert page.locator('script[data-cf-beacon]').count() == 0
            page.goto('about:blank')  # Include unload/visibility-related requests.
            page.wait_for_timeout(250)
            blocked = [url for url in requests if analytics_url(url)]
            assert not blocked, blocked
            assert not errors, errors
            results.append({'origin': origin, 'page': path, 'analytics_requests': len(blocked), 'page_errors': errors,
                            'resource_hosts': sorted({urlparse(url).hostname for url in requests})})
            page.close()
        context.close()
    # Exercise opt-in without sending data to a real analytics service.
    context = browser.new_context()
    page = context.new_page()
    captured = []
    page.route('https://static.cloudflareinsights.com/**', lambda route: (captured.append(route.request.url), route.fulfill(body='/* test stub */', content_type='application/javascript')))
    page.goto('http://localhost:8765/')
    loader = (ROOT / 'assets/analytics.js').read_text()
    for config, expected in [
        ({'enabled': True, 'token': 'a' * 32, 'allowedOrigins': ['https://other.example']}, 0),
        ({'enabled': True, 'token': '', 'allowedOrigins': ['http://localhost:8765']}, 0),
        ({'enabled': 'true', 'token': 'a' * 32, 'allowedOrigins': ['http://localhost:8765']}, 0),
        ({'enabled': True, 'token': 'a' * 32, 'allowedOrigins': ['http://localhost:8765']}, 1),
    ]:
        page.evaluate('(config) => window.LECTURE_ANALYTICS = config', config)
        page.evaluate(loader)
        page.wait_for_timeout(200)
        assert len(captured) == expected
    page.evaluate(loader)
    assert page.locator('script[data-cf-beacon]').count() == 1
    browser.close()
    print(json.dumps({'browser': 'Chromium', 'results': results, 'opt_in_checks': 'passed'}, ensure_ascii=False, indent=2))

