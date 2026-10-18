# DevOps Lecture Notes by Kobong

이 프로젝트는 DevOps의 핵심 기술과 개념을 다루는 강의 자료 모음입니다. 각 주제는 현대적인 웹 인터페이스를 통해 대화형 슬라이드 형식으로 제공됩니다.

SAIF-2026 기반 Kobong 발표 템플릿을 적용했습니다. 밝은 배경과 남색 목차, 카드, 집중 모드(F/Esc), 모바일 목차, 슬라이드별 링크를 제공합니다. 기존 8개 강의와 158개 슬라이드의 본문은 유지합니다. 적용 구조와 검증 범위는 [발표 템플릿 안내](docs/presentation-template.md)를 참고하세요.

## 📚 강의 목록

로컬 실행 (Python 3.10 이상, 프로젝트 폴더에서):

```powershell
.\scripts\install.ps1  # 최초 설치 또는 requirements.txt 변경 시
.\scripts\start.ps1
```

`http://127.0.0.1:8000`에 접속합니다. 포트를 바꾸려면 `.\scripts\start.ps1 -Port 8001`을 실행하세요. 설치는 `.venv`에 진행하며, 실행 스크립트가 이 가상환경을 직접 사용합니다. Git에서 제외된 `images/`가 없으면 빈 폴더를 생성합니다. 실제 강의 이미지는 별도로 준비해야 합니다.

| 주제 | 파일명 | 주요 내용 |
| :--- | :--- | :--- |
| **DevOps 개론** | [devops.html](lecture_note/devops.html) | DevOps 철학, 협업 문화, 자동화의 가치 |
| **Linux 기초** | [linux.html](lecture_note/linux.html) | 리눅스 환경 설정, 기본 명령어, 쉘 활용법 |
| **Git & GitHub** | [github.html](lecture_note/github.html) | 버전 관리 기초, GitHub를 활용한 협업 워크플로우 |
| **Docker** | [docker.html](lecture_note/docker.html) | 컨테이너 기술의 이해, Dockerfile 작성 및 컨테이너 관리 |
| **Kubernetes** | [kubernetes.html](lecture_note/kubernetes.html) | 핵심 개념, 설정·자원 관리, 상태 확인 및 장애 사례 분석 |

---

## 외부 분석 및 E2E 테스트

Cloudflare Web Analytics / RUM은 모든 환경에서 기본 비활성화됩니다.
외부 폰트와 강의 이미지는 기존대로 로딩합니다.
설정 방법, 원인 조사, 프록시 주입 점검 및 브라우저 검증은 [분석 요청 정책](docs/analytics.md)을 참고하세요.


### v0.1.0 - Initial Deployment 

**🚀 Key Changes**
- Initial Deployment Completed: Finalized the foundational project architecture and successfully launched the first official deployment.
- CI/CD Pipeline Established: Integrated GitHub with Vercel to activate an automated workflow, ensuring every code push triggers a seamless build and deployment process.
- Environment Configuration: Completed production setup, including primary domain mapping and essential environment variable configurations.
