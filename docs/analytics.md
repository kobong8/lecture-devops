# 외부 분석 요청 정책

## 원인과 조사 범위

`index.html`, `lecture_note/{devops,linux,github,docker-intro,docker-practice,kubernetes}.html`에
`https://static.cloudflareinsights.com/beacon.min.js`를 로딩하는 태그와 같은 토큰이 직접 들어 있었다.
이 beacon이 Web Analytics / RUM 수집 요청을 시작한다. `jenkins.html`, `server-client.html`에는 원래 없었다.
`docs/template.zip` 안의 두 HTML에도 placeholder 토큰을 사용한 beacon 태그가 있어 제거했다.

공통 HTML 템플릿, JS 패키지 manifest/lockfile, 프런트엔드 빌드 도구, 서비스 워커,
실행용 Nginx/프록시 설정, Vercel 설정 파일은 저장소에 없다. 강의 본문의 서버/프록시 예시는 실행 설정이 아니다.
`app.py`의 FastAPI/StaticFiles/FileResponse는 파일을 제공하며 스크립트를 주입하지 않는다.
README에는 Vercel 배포 이력이 있지만 외부 대시보드 설정은 저장소에서 확인할 수 없다.

## 기본값과 명시적 활성화

모든 9개 페이지는 상대 경로로 `assets/analytics-config.js`, `assets/analytics.js`를 순서대로 로딩한다.
FastAPI에도 `/assets` 경로를 추가했다. 정적 호스팅은 `assets` 디렉터리를 함께 배포해야 한다.
기본값은 모든 환경에서 `enabled: false`, 빈 토큰, 빈 origin 목록이다.
따라서 localhost와 사내 환경에서 외부 분석 스크립트 요소 자체를 생성하지 않는다.
콘솔 필터링, 네트워크 API 덮어쓰기, QAROZ 차단 해제는 사용하지 않는다.

승인된 환경에만 배포할 `assets/analytics-config.js`를 다음처럼 설정한다.

```js
window.LECTURE_ANALYTICS = Object.freeze({
    enabled: true,
    token: '실제 Cloudflare 사이트 토큰(32자리 hex)',
    allowedOrigins: ['https://lectures.example.com']
});
```

세 조건이 모두 충족되어야 활성화된다. origin은 스킴/호스트/포트까지 정확히 일치해야 하며 경로나 끝 `/`를 넣지 않는다.
공개 도메인만 허용하면 같은 파일을 localhost나 사내 호스트에 배포해도 활성화되지 않는다.
개발/사내 분석이 정말 필요한 경우에도 해당 origin을 명시적으로 추가해야 한다.
비활성화는 `enabled: false`로 되돌리고 배포 캐시를 갱신한 뒤 기존 탭을 새로 로딩한다.
정적 사이트이므로 환경 변수만 설정해도 JS가 바뀌지는 않는다. 배포 단계에서 이 파일을 생성/교체해야 한다.
설정 누락, 잘못된 토큰, 문자열 `'true'`, 미허용 origin은 비활성화된다.

## 리소스 다운로드와 수집 구분

| 대상 | 목적 | 처리 |
| --- | --- | --- |
| `static.cloudflareinsights.com/beacon.min.js` | 분석 코드 다운로드 | 기본 비활성화 |
| `cloudflareinsights.com/cdn-cgi/rum` 및 `/cdn-cgi/rum` | 방문/성능 데이터 전송 | beacon을 로딩하지 않아 방지 |
| `fonts.googleapis.com`, `fonts.gstatic.com` | CSS/폰트 다운로드 | 기존 유지 |
| GitHub release 이미지 및 리다이렉트된 자산 호스트 | 강의 이미지 다운로드 | 기존 유지 |

폰트/이미지도 외부 HTTP 요청이지만 앱의 분석 데이터 전송과는 목적이 다르다.
외부 통신 자체가 금지된 환경에서는 별도로 자산을 자체 호스팅해야 한다.

## 외부 주입 확인 및 설정

이번 저장소에서는 직접 삽입된 코드가 확인되었다. 외부 주입 여부까지 확인된 것은 아니다.
수정 배포 후에도 요청이 남으면 브라우저 Network의 HTML 응답 원문과 원본 서버 응답을 비교하고
`beacon.min.js`, `data-cf-beacon` 및 요청 Initiator를 확인한다.
원본에는 없고 프록시를 거친 응답에 있으면 외부 주입의 근거가 된다.

- Cloudflare Web Analytics의 해당 사이트에서 자동 주입을 **Disable**한다. 선택적 로딩을 사용할 때도 자동 주입은 꺼야 한다.
- Web Analytics Rules에서 전체/특정 페이지에 대한 주입 규칙을 확인한다.
- Cloudflare Pages를 사용하는 경우 프로젝트 Web Analytics 연동도 확인하고 끈 후 재배포한다.
- 사내 프록시의 HTML 응답 치환, 태그 관리자, 배포 서비스의 분석 삽입 설정도 확인한다.
- CDN 캐시를 갱신하고 새 브라우저 컨텍스트에서 재검증한다. DOM에서 뒤늦게 태그를 삭제하는 방식은 이미 시작된 요청을 막지 못한다.

공식 문서: [자동 주입 설정](https://developers.cloudflare.com/web-analytics/get-started/),
[주입 규칙](https://developers.cloudflare.com/web-analytics/configuration-options/rules/),
[Pages 연동](https://developers.cloudflare.com/pages/how-to/web-analytics/),
[수집 구조](https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/).

## 브라우저 재검증

```sh
python -m http.server 8765 --bind 127.0.0.1
# 다른 터미널, Playwright가 설치된 Python 환경에서
python tests/check_analytics.py
```

테스트는 실제 Chromium의 request 이벤트로 실패한 요청을 포함해 수집한다.
기본 비활성화 검증에는 요청 차단/모킹을 사용하지 않는다.
localhost와 `lecture.internal`을 로컬 서버에 연결한 사내 호스트 모의 환경에서 전체 9페이지,
테마 전환, 강의 슬라이드 이동, 연락처/게임 열기·닫기, 페이지 이탈을 검사한다.
별도의 활성화 분기 테스트만 beacon 응답을 stub 처리해 실제 분석 전송을 피한다.
사내 실제 URL과 프록시에는 접근하지 않았으므로 배포 후 동일한 Network 검증이 필요하다.

### 검증 결과 (2026-09-28)

- 실제 headless Chromium: 2개 origin × 9페이지 = 18개 검사 통과.
- Cloudflare Insights 및 `/cdn-cgi/rum` 요청 0건, JavaScript pageerror 0건.
- 테마 전환, 슬라이드 이동, 메인 연락처/게임 열기·닫기 통과.
- 미허용 origin, 빈 토큰, 문자열 활성화 값에서는 요청 0건.
- 유효한 명시적 활성화에서는 stub 대상 스크립트 요청 1건, 반복 실행 시 중복 태그 없음.
- 외부 폰트/이미지 요청은 그대로 관측되며 다운로드 성공 여부는 이 테스트의 판정 대상이 아니다.
- [원시 검사 결과](../tests/analytics-result.json), [재현 스크립트](../tests/check_analytics.py).
- Python 정적 서버로 검증했다. FastAPI 실행은 이 환경에 해당 패키지가 없어 검증하지 않았다.
  기존 FastAPI 서버는 `images` 디렉터리가 필요하며 이번 수정은 기존 요구사항을 변경하지 않는다.
