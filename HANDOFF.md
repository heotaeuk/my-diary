# HANDOFF

작성일: 2026-10-15

## 지금까지 한 일

### 1. 자기소개 페이지 `about.html` 추가
- 구성: 상단 이름 소개(아바타 · 이름 · 직함 · 소개) → 중간 관심사 카드 3개 → 하단 연락처
- `index.html` 상단 바의 "자기소개" 버튼과 `about.html`의 "← 플래너로 가기"로 서로 연결
- 플래너와 같은 색상 토큰을 쓰고, 테마 저장값(`planner_theme`)도 공유해 다크 모드가 두 페이지에서 유지됨
- 이름 · 직함 · 관심사 · 연락처는 **예시 값(홍길동 등)**이라 실제 정보로 바꿔야 함
- 셀프 체크리스트 18개 항목으로 검증 완료(PC/모바일, 라이트/다크, 가로 넘침 없음)

### 2. 프로젝트 지침 `CLAUDE.md` 정비
- `/init`으로 내용을 코드와 대조하고, 백업 파일(`index_backup_*.html`) 주의사항과 `innerHTML = ''` 사용 범위 설명을 추가
- **작업 범위 규칙(Scope rule)** 추가: 지시한 작업만 하고, 추가 작업은 제안 후 승인받기

### 3. Claude Code 환경 점검 (`/doctor`)
- `~/.claude/settings.json`에 `"permissions": { "defaultMode": "auto" }` 적용
- 남은 일(사용자가 직접): 세션 종료 후 터미널에서 `claude install` 실행. 지금은 npm 설치본이 실행되는데 기록에는 네이티브 설치로 되어 있음

### 4. 할 일에 마감일 추가 (`index.html`)
- 추가 폼에 **마감** 날짜 입력칸(`#dueInput`, 선택 사항)을 추가
- 할 일 항목에 `due` 필드(로컬 `YYYY-MM-DD`)를 선택적으로 저장. 마감일이 없으면 필드 자체가 없음
  - 예: `{ id, text, done, date, due? }`. 기존 데이터는 그대로 호환됨
- 목록에서 마감일이 있는 항목 오른쪽에 `마감 10/18` 형태로 표시(마우스를 올리면 전체 날짜 표시)
- 추가 후 마감 입력칸은 비워짐
- 레이아웃: 추가 폼이 항상 2줄(1줄: 할 일 입력 / 2줄: 날짜 · 마감 · 추가), 모바일(760px 이하)에서는 추가 버튼이 3번째 줄로 내려감
- 검증: headless Chrome으로 PC/모바일 · 라이트/다크 화면을 확인하고, 폼으로 추가한 항목에 `due`가 저장되는 것과 가로 넘침이 없는 것을 확인

### 5. 마감일 지난 항목 빨간 표시 (`index.html`) — 완료
- 조건: `todo.due`가 있고, **완료되지 않았고**, `todo.due < todayKey`이면 `span.due`에 `overdue` 클래스 추가(`renderList()`)
- 스타일: `#list li .due.overdue { color: var(--red); font-weight: 600; }` (다크 모드 값 자동 적용)
- 결정 사항: 오늘이 마감일인 항목은 강조하지 않음, 완료 항목은 빨간 표시에서 제외
- 검증(2026-10-15): headless Chrome에서 마감 어제·미완료만 `overdue`가 붙고, 마감 어제·완료 / 오늘 / 미래 / 마감 없음은 붙지 않는 것을 확인

### 6. 오늘 마감 항목 파란 표시 (`index.html`) — 완료
- 조건: `todo.due`가 있고, **완료되지 않았고**, `todo.due === todayKey`이면 `span.due`에 `due-today` 클래스 추가(`renderList()`, `overdue` 판정 바로 다음)
- 스타일: `#list li .due.due-today { color: var(--blue); font-weight: 600; }` (기존 변수라 다크 모드 값 자동 적용)
- 참고: 달력의 토요일 글자도 같은 `--blue`를 사용함
- 검증(2026-10-15): headless Chrome 라이트/다크 화면에서 마감 오늘·미완료만 파랑, 마감 오늘·완료는 일반 색, 마감 지남·미완료는 그대로 빨강인 것을 확인

### 7. 마감일 수정 기능 (`index.html`) — 완료
- 마감 표시(`.due`)를 `button`으로 바꾸고, 누르면 `startDueEdit()`가 그 자리를 날짜 입력칸으로 바꿈(`startEdit()`와 같은 방식)
  - Enter/포커스 해제 → 저장, Esc → 취소, 비우고 저장 → `due` 필드 삭제
- 마감일이 없는 항목: 마우스를 올리면 `+ 마감` 버튼(`.add-due`) 표시. 터치 기기(`hover: none`)에서는 항상 표시
- 저장 후 `render()`로 다시 그리므로 빨강(`overdue`)/파랑(`due-today`) 표시도 즉시 갱신
- 검증(2026-10-15): headless Chrome 스크립트로 변경 · 추가 · 삭제 · Esc 취소가 localStorage와 화면에 반영되는 것을 확인. PC와 390px(iframe) 화면 모두 가로 넘침 없음
  - 참고: headless Chrome은 `--window-size`가 약 758px보다 좁아지지 않으므로, 모바일 확인은 390px 폭 iframe에 페이지를 넣어서 할 것

## 다음 할 일
- 현재 정해진 다음 작업 없음

## 참고 / 미반영 사항
- `CLAUDE.md`의 할 일 데이터 형식 설명을 `{ id, text, done, date, due? }`로 갱신함(2026-10-15, `due`와 `overdue` 설명 포함)
- 할 일 아래 안내 문구("더블클릭하면 내용을 고칠 수 있어요")에는 마감일 수정 방법이 없음(마감 표시의 툴팁에만 안내)
- 작업 규칙: `CLAUDE.md`의 Scope rule에 따라 지시한 범위만 작업
