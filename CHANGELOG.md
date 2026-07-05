# CHANGELOG — harness-kit 규칙 개정 이력 (append-only)

역이식의 착지점이다. `/retro`에서 승인된 개정은 반드시 여기에 한 항목씩 쌓인다.
형식: `## vX.Y — YYYY-MM-DD · <출처 프로젝트>` + 변경 내용 + 근거(회고 경로).

## v0.15 — 2026-07-05 · academy-ops cycle 2 (킷 공통 역이식)
- CLAUDE §3(권한)에 추가: 에이전트 레지스트리의 등록 상태는 리포가 아니라 세션의 속성 —
  이전 세션의 log 등록/미등록 기록을 배분 근거로 재사용 금지, 커맨드 진입 시 세션마다 새로 확인
  (근거: academy-ops retro/2026-07-05-cycle2-retro.md 관찰 1 — 같은 리포에서 시작 세션 미등록·폴백,
  확정 세션 정식 등록이 실측됨. v0.12 폴백 규정의 전제 보강)

## v0.14 — 2026-07-05 · academy-ops cycle 2 (킷 공통 역이식)
- CLAUDE §2-1(이동 가능성)에 추가: 커밋 && 체인 금지 — add·commit 분리 실행, 커밋은 직후 git log
  해시로만 증명, gitignore 대상 경로(state/ 등) add 인자 금지
  (근거: academy-ops retro/2026-07-05-cycle2-retro.md 실패 3 — state.json add 실패가 && 체인의
  확정 커밋을 통째로 생략, 발견이 status 확인 재량에 의존했음)

## v0.13 — 2026-07-05 · academy-ops cycle 2 (킷 공통 역이식)
- CLAUDE §2-1(이동 가능성)에 추가: 커밋되지 않은 걸음은 걸음 완료가 아니다 — 걸음의 원자 단위 =
  산출·기록(state/log) + 커밋, 세션 시작 시 git status로 미커밋 잔재 확인·복구 커밋 의무
  (근거: academy-ops retro/2026-07-05-cycle2-retro.md 실패 1 — 크래시로 cycle 2 시작 걸음이
  미커밋으로 잔존, "걸음마다 커밋"이 걸음의 완료 조건이 아니었음)

## v0.12 — 2026-07-05 · academy-ops cycle 1 (킷 공통 역이식)
- CLAUDE §3(권한)에 추가: 미등록 에이전트 타입의 즉흥 대체 금지 — 폴백은 general-purpose +
  정체성 파일 Read 방식만, 정체성 파일 부재 시 중단·보고, 미등록 발견은 log 기록
  (근거: academy-ops retro/2026-07-05-retro.md 실패 6 — cycle 1에서 doc-writer 등 3종 미등록,
  올바른 폴백이 전부 재량이었음)

## v0.11 — 2026-07-05 · academy-ops cycle 1 (킷 공통 역이식 · 훅 코드 동반)
- CLAUDE §4(훅 배선)에 추가: 훅 매처를 Bash에만 걸지 마라 — 환경의 모든 셸 도구를 같은 검사에,
  cmdlet 대칭 패턴 + 셸별 예외, 변경 시 deny·통과 재검증 의무
- 코드 동반 반영: settings.json PreToolUse 매처에 PowerShell 추가 · pre-tool-use.mjs에
  PS 전용 패턴(psRemove/psOverwrite, -Append 예외, 개행=문장 경계) + deny 메시지 도구명 동적화
- 재검증 실측: deny 2건(Remove-Item·Set-Content → rounds/) · 통과 1건(Add-Content log.md) — 2026-07-05
  (근거: academy-ops retro/2026-07-05-retro.md 실패 5 — Remove-Item이 벽2 통과 실측)

## v0.10 — 2026-07-05 · academy-ops cycle 1 (킷 공통 역이식)
- CLAUDE §4(훅 배선)에 추가: 파괴 패턴 검사의 평면 매칭 금지 — 실행 구조 앵커 · 개행=문장 경계 ·
  데이터 오탐은 알려진 한계로 명시 · 오탐 시 표준 우회는 임시 파일 + append만
  (근거: academy-ops retro/2026-07-05-retro.md 실패 4 — 벽2 오탐 실측 4회: 서열 문구 "사용자 > SOUL.md"를
  리다이렉트로 오인, PS 패턴 초판의 줄 넘김 오탐 등)

## v0.9 — 2026-07-05 · 이동 가능성 확보 (사용자 요청, 정식 회고 아님)
- CLAUDE §2에 §2-1(이동 가능성) 신설: 다른 하네스를 하드코딩 절대경로로 참조 금지(형제 디렉토리를
  이름·내용으로 탐색) · 로컬 전용 상태(git-ignored) 금지 · 미푸시 커밋 남긴 채 세션 종료 금지
- `.claude/commands/retro.md`·`README.md`·`00_사용법.md`의 `C:\work\harness-kit` 하드코딩 경로를
  "형제 디렉토리 중 README 첫 줄이 `# harness-kit`인 폴더" 탐색 방식으로 교체
- 근거: 다른 컴퓨터로 작업 환경을 옮기며 `.git`이 누락되고 절대경로 문서가 무효화된 사건(사용자 보고,
  2026-07-05) — 과거 이력(records/·retro/·이전 CHANGELOG 항목)의 `C:\work\...` 표기는 그 시점의
  사실이므로 수정하지 않음
- 범위: 킷 공통 — 여러 컴퓨터를 오가는 것은 도메인과 무관한 환경 조건

## v0.8 — 2026-07-04 · ai-worklog cycle 1 (킷 공통 역이식)
- AGENTS §2(발언·기록 규칙)에 추가: 확정되지 않은 판정·수치의 log.md·state 기록 금지 —
  내부 기록도 발화(SOUL §1), 판정·실측 수치는 확정 시점에만
  (근거: ai-worklog retro/2026-07-04-retro.md 실패 5 — 확정 전 "PASS"와 1차본 수치가 append-only log에 영구 기록됨)

## v0.7 — 2026-07-04 · ai-worklog cycle 1 (킷 공통 역이식)
- CLAUDE §4(훅 배선)에 추가: 하네스 커맨드를 동명 Skill·플러그인 호출로 대체 금지 —
  절차 원본은 .claude/commands/*.md, 출처 경로가 프로젝트 밖이면 중단 후 커맨드 파일 직접 Read
  (근거: ai-worklog retro/2026-07-04-retro.md 실패 4 — /retro가 외부 플러그인 동명 스킬로 오발사.
  커맨드명은 프로젝트별 치환: ai-worklog=/worklog·/posts·/retro)

## v0.6 — 2026-07-04 · ai-worklog cycle 1 (킷 공통 역이식)
- AGENTS §4(컨텍스트 태만)에 추가: 에이전트 반환 텍스트를 산출물 증거로 삼지 마라 —
  진행 판단·검수·상태 전이는 파일 상태(Read)로만, 세션 재개 시 파일 재검증
  (근거: ai-worklog retro/2026-07-04-retro.md 실패 3 — 세션 한도로 writer 반환 유실, 파일 복구는 재량이었음)

## v0.5 — 2026-07-03 · 사용법 치트시트 추가
- 00_사용법.md 신설: 상황별 커맨드 표 + 커맨드 상세 + 자동(훅) 항목 + 이식법 + 막혔을 때 FAQ
  — 커맨드 키워드를 외우지 않아도 되게 (근거: 사용자 요청, 이식 시 프로젝트별로 특화해 복사)

## v0.4 — 2026-07-03 · ai-worklog 이식 (첫 실전 이식 마찰 반영)
- pre-tool-use 훅의 특화 지점을 상수 3줄(PROTECTED/IMMUTABLE_DIRS/MUTABLE_DIRS)로 승격
  — 이전엔 디렉토리명이 코드 5군데에 흩어져 있어 이식 시 전부 수정해야 했음
- 범위: 킷 공통(구조 개선, 규칙 변경 없음) · 근거: ai-worklog 이식 작업(2026-07-03), 정식 회고 아님

## v0.3 — 2026-07-03 · harness-kit (역이식 안전장치)
- /retro 승인 단계에 적용 범위 분류 추가: 킷 공통 / 프로젝트 전용 (애매하면 전용이 기본값)
  — 프로젝트 특화 규칙이 킷을 오염시키는 경로 차단
- /retro에 원본 킷 git 커밋·푸시 단계 내장: 1 개정 = 1 커밋 = 자동 백업, force-push 금지,
  복구는 git revert로만 (근거: 원본 유실 우려에 대한 사용자 질문, 2026-07-03)

## v0.2 — 2026-07-03 · harness-kit (0단계 골격)
- 훅 4종 추가 (.claude/hooks/): session-start(재주입) · pre-tool-use(append-only+rounds 불변) ·
  post-tool-use(AI-slop·증거부실 경고) · stop-retro-guard(회고 없는 종료 차단, attempts 3회 상한)
- 커맨드 3종 추가 (.claude/commands/): /meeting · /meeting-round · /retro
- /retro에 역이식 절차 내장: 사람 승인 1회 → 프로젝트 + 원본 킷 + 양쪽 CHANGELOG 동시 반영
- settings.json 훅 배선, 산출 폴더 시드(state/rounds/wiki/report/retro), log.md 시드
- 출처: gec-prd 검증 훅 포팅 + 강사 아카이버 설계 §8 sentinel 패턴

## v0.1 — 2026-07-03 · 초판
- SOUL.md(헌법) · AGENTS.md(회의 파이프라인) · CLAUDE.md(배선) · README.md(원칙 매핑표)
- 에이전트 6종: moderator · panelist-pm · panelist-tech · devils-advocate · scribe · retrospector
- 교정: 수업 필기의 노션/슬랙은 강사 예시였음 — 서비스명 제거, 발행처 등록 표(⬜) 방식으로 교체
