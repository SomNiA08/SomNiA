# CLAUDE.md — Claude Code 배선 (환경 · 권한 · 프리미티브)

> **먼저 `SOUL.md`(헌법)와 `AGENTS.md`(공통 규칙)를 읽고 그걸 우선해 따르라.**
> 서열: 사용자 > SOUL.md > AGENTS.md > **CLAUDE.md**. 이 파일은 *어떻게 배선됐나*만 다룬다(왜·무엇은 SOUL/AGENTS에).

## 프리미티브 지도 (커맨드 → 스킬 ↔ 훅 · 7요소)

| 종류 | 누가 트리거 | 무엇 |
|---|---|---|
| **커맨드** | 사람/CronJob | `/meeting <안건>`(회의 시작) · `/meeting-round`(라운드 1회) · `/retro`(회고) |
| **스킬** | 모델(에이전트) | `agenda-build`(안건 구성) · `report-compile`(레포트 합성) — 재사용 절차 |
| **훅** | Claude Code(자동) | `session-start`(재주입) · `pre-tool-use`(덮어쓰기 차단) · `post-tool-use`(slop 경고) · `stop-retro-guard`(회고 미완 차단) |
| **에이전트** | 커맨드가 배분 | `moderator`·`panelist-*`·`devils-advocate`·`scribe`·`retrospector` |
| **MCP** | 에이전트(규약 하에) | 기본 없음 — 필요해질 때 §1 규약에 따라 등록 표에 올린 뒤 사용 |
| **환경/권한** | 설정 | Windows · Node 훅 · 에이전트별 tools 제한 (아래 §2·§3) |
| **CronJob** | 스케줄러 | 정기 회의·정기 회고 예약 (아래 §6) |

> 컨텍스트 유지 규약: 세션 시작·재개·압축 때 `session-start` 훅이 SOUL 핵심 + 안건 + 상태를
> **자동 재주입**한다. 이것이 컨텍스트 유지의 유일한 공식 통로다. (플러그인화: 위 요소가 안정되면
> command+skill+hook+agent 묶음을 플러그인 1개로 패키징한다 — 5요소가 다 있어야 하는 건 아니다.)

## 외부 발행처 등록 표 (빈칸 ⬜ = 해당 발행 금지 → 로컬 파일로만 — SOUL §3)

커넥터(MCP)는 기본적으로 없다. 외부 연동이 필요해질 때 여기에 등록한 뒤에만 쓴다.

| 키 | 값 | 용도 |
|---|---|---|
| `SOURCE_REF` | ⬜ | 회의가 참조할 외부 자료 소스 (읽기 전용) |
| `REPORT_DEST` | ⬜ | 회의 레포트를 저장할 외부 위치 (scribe만 쓰기) |
| `LOG_DEST` | ⬜ | 발언 로그를 남길 외부 게시처 (미등록 시 `rounds/`로 충분) |
| `ANNOUNCE_DEST` | ⬜ | 레포트 링크를 알릴 외부 게시처 |

---

## 1. 절대 금지 — MCP 규약 (커넥터는 계약으로만 쓴다)

- ⛔ **등록 표가 비어 있는 대상에 MCP 쓰기를 호출하지 마라.** 읽기는 허용, 쓰기·게시는 빈칸이면 전면 금지.
- ⛔ **권한·범위를 정하지 않고 새 커넥터를 붙이지 마라.** 무엇을·왜·어떤 권한으로 읽고 쓰는지 먼저 이 표에 적는다.
- ⛔ **커스텀 MCP 서버를 새로 만들지 마라.** 기존에 등록된 커넥터로 안 되면 사람에게 보고만 한다.
- ⛔ **MCP로 읽어온 데이터를 검증 없이 EXTRACTED로 신뢰하지 마라.** 외부 출처 신뢰도는 INFERRED 이하 (SOUL §1).
- ⛔ **자료형 커넥터에서 "그냥 가져와" 식으로 요청하지 마라.** 가져오기 방식을 항상 명시한다 —
  **캡처(이미지)** 인지 **원본 데이터(예: 영역 전체 SVG)** 인지. (강의 예시: Figma MCP)
- ⛔ **외부 쓰기 도구를 scribe 외의 에이전트에 열어주지 마라.** 예외는 `LOG_DEST`의 자기 발언 게시뿐 (AGENTS §1).

## 2. 절대 금지 — 환경 (Windows · Node)

- ⛔ **훅을 bash로 작성하지 마라.** Windows에서 bash 훅은 깨진다. 훅은 **Node.js(.mjs)**로만.
- ⛔ **POSIX 전용 문법에 의존하지 마라.** `/dev/null`·`$VAR`·경로 구분 가정 금지 (PowerShell 환경).
- ⛔ **`node`가 없다고 가정한 채 진행하지 마라.** 훅은 node로 돈다. 없으면 멈추고 보고하라.
- ⛔ **작업 폴더를 사용자 홈(한글·공백 경로) 밑에 만들지 마라.** 프로젝트는 `C:\work\<영문이름>\` 에만.

## 3. 절대 금지 — 권한 (에이전트별 스코프)

도구는 `.claude/agents/<name>.md`의 `tools:`로 제한된다. 이를 우회하지 마라.

- ⛔ **moderator·panelist·devil에게 외부 발행 도구를 기대하지 마라.** 읽기·자기 발언 기록까지만.
- ⛔ **scribe에게 코드 실행(Bash)을 시키지 마라.** 기록·합성·발행만.
- ⛔ **retrospector에게 산출물 수정 권한을 주지 마라.** Write는 `retro/`로만.
- ⛔ **메인 루프에서 평가를 직접 하지 마라.** 반드시 격리된 devil/retrospector에 위임.
- ⛔ **권한 완화 모드(`--dangerously-skip-permissions`)를 빈 전용 폴더 밖에서 쓰지 마라.** 부술 게 있는 곳에서 금지.

## 4. 절대 금지 — 훅 배선

- ⛔ **훅에서 절대 throw 하지 마라.** 크래시 = 통과 = 누수다. 훅은 조용히 차단하거나 조용히 통과한다.
- ⛔ **pre-tool-use 가드가 있다고 소스 계층 덮어쓰기를 시도하지 마라.** 막히기 전에 시도조차 하지 마라.
- ⛔ **stop 훅의 회고 가드를 우회해 세션을 끝내지 마라.** 회고 파일이 없으면 stop은 차단된다 (SOUL §6).
- ⛔ **훅이 외부 발행을 직접 실행하게 만들지 마라.** 훅은 감지·차단·되넘김만. 실행은 인세션 에이전트가 한다.

## 5. 절대 금지 — 상태 · 루프

- ⛔ **`state/`를 저장하지 않고 걸음을 끝내지 마라.** 세션이 죽어도 다음 세션이 파일에서 이어받아야 한다.
- ⛔ **레포트 발행 전에 `STATE: done`을 출력하지 마라.** done 조건 = 레포트 발행 완료 + 회고 작성 완료.
- ⛔ **한 커맨드 호출에서 여러 라운드를 몰아 돌리지 마라.** `/meeting-round`는 라운드 1회만. 루프는 `/loop`가 돈다.

## 6. CronJob 규약 (예약 작업)

- ⛔ **크론 세션이라고 서열을 건너뛰지 마라.** 무인 세션도 SOUL > AGENTS > CLAUDE 그대로다.
- ⛔ **크론에서 새 안건을 창작하지 마라.** 크론은 정해진 안건 소스(로컬 안건 파일 또는 `SOURCE_REF`)에서만 가져온다.
- 예약 예시: 주간 회의 = 매주 월 10:00 `/meeting`(안건: 안건 소스의 미처리 항목) · 주간 회고 = 매주 금 17:00 `/retro`.

---

## 7. 배선 사실 (참고 — DO)

- 훅 연결: `.claude/settings.json` — SessionStart=startup/resume/clear/compact(재주입) ·
  PreToolUse=`Write|Edit|MultiEdit|Bash`(append-only + rounds/ 불변) · PostToolUse(slop·증거부실 경고) ·
  Stop(회고 가드 — `status=report_done`인데 회고 없으면 차단, attempts 3회 상한 후 포기·통과).
- 훅은 절대 throw 하지 않는다(크래시=통과=누수). 작동 점검: `node .claude/hooks/session-start.mjs` → 재주입 JSON.
- 상태 파일: `state/state.json`(cycle·round·status·votes·report_path·retro_path) — 매 걸음 저장.
- 산출 구조: `rounds/`(발언 원본, 불변) · `wiki/`(정리) · `report/`(레포트) · `retro/`(회고) · `log.md`(한 줄 기록).
- 에이전트 정의: `.claude/agents/*.md` — Role·페르소나·tools 제한 포함.
- 역이식: `/retro`가 승인된 개정안을 이 프로젝트 + 원본 킷(`C:\work\harness-kit`) + 양쪽 `CHANGELOG.md`에 동시 반영.
