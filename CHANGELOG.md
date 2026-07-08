# CHANGELOG — harness-kit 규칙 개정 이력 (append-only)

역이식의 착지점이다. `/retro`에서 승인된 개정은 반드시 여기에 한 항목씩 쌓인다.
형식: `## vX.Y — YYYY-MM-DD · <출처 프로젝트>` + 변경 내용 + 근거(회고 경로).

## v0.35 — 2026-07-08 · ai-worklog cycle 4 (킷 공통 · 승격 후보 이행 추적 · 회고 프로세스)
- **사각(왜)**: /retro 승인 절차는 개정안에 `[승격 후보]`(코드·검사)를 병기하되, 승격 후보를 **산문 벽만
  채택하고 미이행으로 닫는 것을 막지 못했다.** cycle 2 개정안 1이 engine 회귀 테스트를 승격 후보로 냈으나
  산문 벽만 채택돼, cycle 4에서 같은 결함이 다른 트리거로 재발(SOUL §6). 산문 벽은 관측된 트리거 하나만 막고
  결함 자체는 코드로만 닫힌다.
- **신설 벽(무엇)**: retro.md 금지에 "[승격 후보]가 있는 개정안을 산문 벽만 채택하고 승격 후보를 미이행으로
  닫지 마라 — 유예 시 사유와 '다음 재발 시 즉시 이행'을 명시해 다음 회고가 추적" 추가.
- **승격**: 회고 개정안 총괄표에 '승격 이행상태(이행/유예+사유)' 열 상시화 + 절차 2 반복 점검이 직전 사이클
  총괄표의 미이행 승격 후보를 자동 대조 항목으로 포함.
- 전파: 원본 킷 retro.md. sam·invest-desk·ai-worklog·LoL 다음 동기화 시 수신.
- 근거: ai-worklog `retro/2026-07-08-retro.md`(cycle 4, 메타관측). 출처 프로젝트: ai-worklog. 사용자 승인 2026-07-08.

## v0.34 — 2026-07-08 · ai-worklog cycle 4 (킷 공통 · state 데싱크 재구성 벽 + 검사)
- **사각(왜)**: `CLAUDE §2-1`은 "state/는 커밋된 log.md·산출 폴더에서 재구성 가능해야 한다"고 **요구만** 할 뿐,
  언제·어떻게 재구성하는지 절차·검사가 없었다. gitignored 로컬 state는 다른 컴퓨터 체크아웃마다 뒤처질 수 있고,
  뒤처진 cycle 번호로 다음 사이클을 시작하면 +1이 기존 사이클 슬롯을 덮는다. ai-worklog cycle 4 착수 시 로컬
  state가 cycle 1인데 커밋 증거는 cycle 3까지 완결이라 수동 대조·재구성 후에야 진행 가능했다.
- **신설 벽(무엇)**: CLAUDE §2-1에 "state.cycle이 커밋된 최신 record/retro·log.md가 함의하는 사이클보다 작은
  채로 다음 걸음을 시작하지 마라 — 사이클 시작 커맨드 착수 전 대조·재구성" 추가.
- **승격(코드)**: `session-start.mjs`가 log.md 최신 `cycle N`(정규식 집계)과 state.cycle을 대조 → 불일치 시
  재주입에 "⚠️ state 데싱크 의심" 경고 1줄. 회귀 실측: state.cycle=1·log max=4 → 경고 발동, 동기 시 무경고.
- 전파: 원본 킷 CLAUDE §2-1 + session-start.mjs. 명령-절차 게이트는 프로젝트별(ai-worklog는 worklog.md 절차 1).
  sam·invest-desk·LoL 다음 동기화 시 수신.
- 근거: ai-worklog `retro/2026-07-08-retro.md`(cycle 4, 실패 C). 출처 프로젝트: ai-worklog. 사용자 승인 2026-07-08.

## v0.33 — 2026-07-08 · ai-worklog cycle 4 (킷 공통 · engine 오탐 봉합 · SOUL §6 재발)
- **사각(왜)**: `engine.mjs`의 Bash 파괴패턴 `truncRedirect`가 문자클래스 `[^>|&]*`로 문장 구분자 `;`를
  배제하지 않아, 무해한 `2>/dev/null`(stderr 리다이렉트) 뒤 `;`로 이어진 후속 명령의 보호 디렉토리명까지
  삼켜 오매칭했다. 형제 패턴 4종(removeLike·teeTruncate·sedInPlace·moveOver)은 전부 `[^|;&]`로 `;`를
  배제하는데 truncRedirect만 누락 — 읽기전용 `2>/dev/null; ls templates/` 류가 차단됐다.
  **cycle 2 실패 1이 같은 정규식을 지적했으나 산문 벽만 채택하고 [승격 후보](engine 회귀 테스트)를
  미이행해, cycle 4에서 다른 트리거(`;` 구분자)로 재발한 SOUL §6 케이스.**
- **수정(무엇)**: truncRedirect `[^>|&]*` → `[^>|;&]*`(형제 패턴과 대칭). + 파괴패턴을 `[이름표,정규식]`
  배열로 재구성해 deny 사유에 **매칭 패턴명**(`매칭 패턴: truncRedirect` 등) 병기 — cycle 2 [승격 후보]
  "deny 사유에 패턴명"의 실제 이행(일반 사유문 탓에 사건 사후 분류가 어려웠던 것을 해소).
- **회귀 검증(실측 · 파일 stdin 직접 주입 5케이스)**: `echo x > SOUL.md`=DENY(truncRedirect)·
  `2>/dev/null; ls templates/`=ALLOW(봉합)·`echo x >> log.md`=ALLOW(append)·Write `soul.md`=DENY(v0.29 무회귀)·
  `rm records/x.md`=DENY(removeLike). 전부 기대 일치.
- 전파: 원본 킷 engine.mjs 동판 + 활성 4벌 해시 재단일 `ADFCCC2ADFBB`(직전 계보 17D8ADEE5EE6) —
  ai-worklog·invest-desk·sam 동시 갱신, LoL은 engine.mjs 미보유(옛 훅 구조)라 대상 외.
- 근거: ai-worklog `retro/2026-07-08-retro.md`(cycle 4, 실패 A + 개정안 1 + 메타관측). 출처 프로젝트: ai-worklog. 사용자 승인 2026-07-08.

## v0.32 — 2026-07-07 · LoL cycle 1 (킷 공통 · 첫 정식 회고 역이식)
- **사각(왜)**: `SOUL §1`("결과를 본 뒤에 기대값을 정하지 마라")은 토론 **전** acceptance 층위 벽이고,
  `AGENTS §3`은 술어의 관찰 가능성만 요구했다 — 토론 **안에서** 패널이 관측 소표본(예: 2점)에 맞춰
  문턱·정수를 깎아 술어·요인·차단 레버로 확정하는 행위를 막는 벽이 없었다. LoL cycle 1에서 이 함정이
  한 사이클 3라운드를 관통해 재발(포탑 피해 바닥선 → 제어와드 ≥3 → 상대 최고딜 비중 <40%)했고 매번
  devil의 사후 반응으로만 걸러졌다.
- **신설 벽(무엇)**: AGENTS §3에 "관측 표본이 만든 값 구간 안에서 임의 문턱·정수를 술어·요인·차단
  레버로 확정하지 마라 — 문턱을 올리거나 내릴 관측을 현 표본과 독립으로 답 못 하면 '잠정 플래그'로만" 추가.
  이미 관측된 실패 사례에서 충족돼 결과를 못 가르는 문턱은 잠정 플래그로도 부적격.
- 전파: 원본 킷 AGENTS §3 동판. sam·invest-desk·ai-worklog·LoL 각 하네스는 다음 동기화 시 수신.
- 근거: LoL `retro/2026-07-07-retro.md` (cycle 1 첫 정식 회고, 실패 B). 출처 프로젝트: LoL. 사용자 승인 2026-07-07.

## v0.31 — 2026-07-07 · MODELS.md 별칭 세대교체 벽 (Fable 검수 2차 · 킷 공통)
- **사각(왜)**: 배치표 현재 값 `opus`/`sonnet`은 별칭이고, 별칭→실제 모델 해석은 하네스가 아니라
  실행 환경(CLI)이 한다 — 새 Claude 세대가 나오면 표를 한 글자도 안 고쳐도 판정·생산-외부발행
  역할군이 **미검증 새 모델로 자동 승급**된다. 이는 캘리브레이션 절의 첫 벽("새 모델을 검증 없이
  판정 역할군에 앉히지 마라")과 정면 모순인데, 기존 문서는 "특정 버전 고정이 필요하면 model-id로
  바꾼다"는 안내 한 줄뿐 벽이 없었다(하네스는 자동 승급 자체를 막을 수 없다 — 그래서 절차 벽).
- **신설 벽(무엇)**: "**별칭이 새 세대 모델로 해석되기 시작한 날 = '새 모델 첫날'**" — 새 세대
  출시를 인지하면(공지·모델명 변화·거동 급변) 그 세대가 캘리브레이션 절차(model-gym 격리 실측 +
  별도 모델 채점 — 준비 `model-gym/run-exam.ps1` · 절차 `model-gym/README.md`)를 통과하기 전까지
  판정·생산-외부발행 역할군의 사이클 금지. 통과 후 "현재 값"은 사람이 확정.
- 전파: sam·invest-desk·ai-worklog·**LoL**(MODELS.md는 훅 아키텍처와 무관한 공유 문서라 LoL도 수신)
  — 5벌 해시 단일 `7FBB41DD1F74` (직전 계보 D939349ED52B). 근거: 2026-07-07 Fable 검수 2차.

## v0.30 — 2026-07-07 · stop-retro-guard sentinel 사이클 결속 (Fable 검수 2차 · 킷 공통)
- **구멍**: sentinel(`state/.retro-attempts`)이 `{attempts}`만 저장 — 3회 차단 후 **포기된 사이클**이
  생기면 sentinel은 남는데(/retro 완료 시에만 삭제) cycle 구분이 없어, **다음 사이클의 가드가
  attempts≥3 상태로 시작해 선제 무력화**됐다. 이후 모든 사이클에서 SOUL §6(회고 없는 종료 차단)이
  조용히 죽는 구조 — give-up 장부 기록조차 "첫 사이클의 포기" 이후로는 다시 남지 않는다.
- **수리**: sentinel을 `{cycle,attempts}`로 사이클에 결속 — 로드 시 `state.cycle`(`?? null`)과
  불일치하면(다른 사이클 잔재 · legacy 무-cycle sentinel 포함) attempts 0으로 **재무장**, 기록 시
  현재 cycle을 함께 저장. 포기 경로 무변(sentinel 유지 = 같은 사이클 재루프 방지, 새 사이클은
  cycle 불일치로 자동 재무장 — 그것이 수리다). 절대 throw 금지·기존 동작 전부 보존.
- **계보**: 2026-07-06 LoL 옛 훅 v0.5 수선("sentinel을 cycle 단위로 리셋")에서 발견·수리된 구멍의
  킷 3층 엔진 아키텍처 이식 — v0.29 engine 대소문자 회귀와 같은 유형(옛 훅 수정의 미이식) 2건째.
- **검증**: 임시 CLAUDE_PROJECT_DIR 격리 실측 **7케이스 전부 일치** — 신규 block(a) · 3회 포기+
  log/장부 기록(b) · **stale sentinel(cycle 1 잔재) 재무장 block(c — 수리 증명, 수리 전엔 조용히
  통과)** · legacy `{attempts:3}` 재무장(c2) · state 없음(d)/비대상 status(e)/회고 완료(f) 통과.
  전파: sam·invest-desk·ai-worklog 동판 수신(LoL 제외 — 구 자족형 훅 아키텍처는 자체 수리 완료분),
  4벌 해시 단일 `82E3947A84D9`. 근거: 2026-07-07 Fable 검수 2차 실측.

## v0.29 — 2026-07-07 · Fable 검수 이행 (engine 벽2 대소문자 우회 봉합 · 킷 공통)
- **engine.mjs 대소문자 무시(`i` 플래그) 전면 적용**: Windows FS는 대소문자 비구분이라
  `soul.md`·`Soul.md`(=SOUL.md)·`Rounds/`(=rounds/) 같은 케이스 변형으로 **보호 파일 덮어쓰기·
  불변 디렉토리 수정이 벽을 통과**하던 구멍을 봉합. 수정 지점 5곳: protected 파일명 대조(`protectedHit`
  신설)·`inDirs` 디렉토리 대조·명령 분기 `touchesProt` 게이트·명령 파괴패턴 5종
  (truncRedirect/removeLike/teeTruncate/sedInPlace/moveOver) 전부 `i` 플래그. (psRemove·psOverwrite는
  기존부터 `i` 보유 — 그래서 소문자 Set-Content는 막혔지만 게이트가 먼저 통과시켜 무력했음.)
- **회귀 경위**: LoL 옛 훅 v0.5(2026-07-06 "경로/명령 대조 전부 대소문자 무시")에 이 수정이 있었으나,
  W3 엔진 3층 리팩터링(2026-07-05)의 새 engine.mjs에 이식되지 않았다. 바이트 동일 전파를 타고
  **활성 4리포가 동시에 노출**된 상태였고, 해시 감사는 "4벌이 서로 같은가"만 봐서 못 잡았다
  (교훈: 해시 단일 ≠ 로직 정확 — audit에 훅 행동 회귀 테스트가 없다는 사각).
- **검증**: 차단 8케이스(우회 3종 + 대문자 회귀확인 포함)·통과 6케이스(대문자 가변디렉·append·읽기 포함)
  전부 기대 일치. 4리포 engine.mjs 해시 재단일(`17D8ADEE5EE6`). 근거: 2026-07-07 Fable 함대 검수 실측.
  전파: sam·invest-desk·ai-worklog 동판 수신 (각 리포 CHANGELOG).

## v0.28 — 2026-07-06 · Fable 검수 이행 (v0.26·v0.27 승격 후보 기계화 + 훅 드리프트 해소 · 킷 공통)
- **post-tool-use.mjs 패턴 개정 (v0.27 승격 후보 이행 — 완전 기계화)**: 고유명사(대문자 연쇄 —
  `Uber Elevate`)·인용 개체명(백틱·따옴표·《》 인접) 매치를 warn에서 제외하는 예외 신설.
  검증 매트릭스 10케이스 전 일치(고유명사/인용 제외 5 · slop 정탐 4 · 증거부실 회귀 1).
  잔여 한계(주석 명시): 인용부호 없는 소문자 맨몸 언급은 여전히 warn — slop 어휘 언급은 백틱으로 감싼다.
- **훅 드리프트 해소 (바이트 동일 복원)**: ai-worklog가 2026-07-03 자기 훅에만 추가했던 한국어
  슬롭·속어 확장 8종을 킷으로 상향 통합 — post-tool-use.mjs 해시 2벌→1벌. "공통 훅 차이는 킷
  상향으로만"의 실측 적용.
- **stop-retro-guard.mjs 차단 메시지에 v0.26 벽 직결 (반기계화 이행)**: "안내만 쓰고 대기로
  멈추는 것이 차단의 주원인 — 안내가 아니라 같은 흐름 착수가 규칙" 문구를 차단 사유에 포함.
- **meeting-round.md 절차 7 종료 문구 표준화 (v0.26 문서 몫 이행)**: report_done 도달 시 같은
  흐름에서 /retro 착수 명시.
- 근거: invest-desk cycle 1 Fable 검수 — retro/2026-07-06-retro.md 실패 4·5의 승격 후보 이행.
  사용자 승인: 2026-07-06 ("1,2번 진행"). 전파: sam·ai-worklog·invest-desk 동판 수신 (각 리포 CHANGELOG).

## v0.27 — 2026-07-06 · invest-desk cycle 1 (slop 패턴 고유명사 오탐 예외 · 킷 공통)
- CLAUDE §4: "slop 패턴을 대소문자 무시 단어경계 정규식만으로 두지 마라 — 고유명사·인용
  개체명을 warn 대상에서 제외하는 예외를 붙인다" 추가.
- 배경: invest-desk cycle 1에서 post-tool-use slop 패턴(\belevate\b, /i)이 고유명사
  "Uber Elevate"(우버 옛 항공택시 사업부명)에 3회 오탐(facts 브리프 · 회고 파일 · CHANGELOG
  근거 인용). warn이라 무해했으나 오탐 반복은 경고 무감각화(alarm fatigue)로 진짜 slop 경고를
  무력화한다. post-tool-use 훅은 전 함대 공통 자산이라 킷 공통.
- [승격 후보: post-tool-use.mjs 패턴 개정 — 완전 기계화 가능] 문서 벽 먼저, 패턴 개정은 별도 걸음.
- 근거: invest-desk retro/2026-07-06-retro.md 실패 5. 사용자 승인: 2026-07-06 (범위: 킷 공통).

## v0.26 — 2026-07-06 · invest-desk cycle 1 (report_done 안내 종료 금지 · 킷 공통)
- CLAUDE §4: "report_done 상태에서 커맨드가 '다음 걸음 /retro'를 안내만 하고 턴을 종료하지 마라 —
  종료 보고는 '회고로 이어감'을 명시하고 같은 흐름에서 /retro를 착수" 추가.
- 배경: invest-desk cycle 1에서 /invest-check 종료 보고가 "다음 걸음 /retro" 안내 후 턴 종료 →
  stop-retro-guard 발동 1회. 커맨드 절차의 종료 안내("다음 걸음 X")와 가드의 강제가 서로를 모르는
  구조 — 절차는 대기를 유도하고 가드는 대기를 차단한다. 회의형 킷 상속 패턴이라 킷 공통.
- 근거: invest-desk retro/2026-07-06-retro.md 실패 4. 사용자 승인: 2026-07-06 (범위: 킷 공통).

## v0.25 — 2026-07-06 · Fable 함대 검수 (캘리브레이션 provenance 기계 게이트 · 킷 전용 배선)
- 배경: v0.24 벽("모델 테스트 자기 역할극 금지")은 산문 벽 — retro 자평대로 역할극 산출은 파일
  지문이 없어 재발해도 사후 탐지가 불가했다(cycle 3 retro 개정안 A "[승격 후보: 약함/부분]").
- 승격(3단 게이트): ① `.claude/hooks/agent-ledger.mjs` 신설 — PostToolUse(Agent|Task)로 모든
  서브에이전트 호출의 모델값·agentId를 `state/agent-calls.jsonl`(로컬 전용/gitignore)에 훅이 기계
  기록(모델이 날조 불가 — 호출이 없으면 줄도 없다) ② `model-gym/runs/<날짜>-<모델>.md` 매니페스트
  필수화 — scoring.md 판정 행과 같은 커밋으로, 측정/채점 모델·agentId 표 기재 ③ somnia-hub
  `audit.ps1` 검사 [5] 신설 — 판정 행 ↔ 매니페스트 실재·측정≠채점·agentId 유무 주 1회 대조(WARN).
- 2026-07-06 기존 실측(sonnet·haiku)은 `상태: LEGACY` 매니페스트 2벌로 소급 불가를 명시(당시
  호출 근거는 세션 로그에만 존재 — 지어내지 않고 한계를 기록). model-gym README에 절차 신설 +
  벽 1줄 추가("매니페스트 없이 판정 행 추가 금지"). 훅·게이트는 deny/통과 양쪽 실측 검증 완료.
- 범위: 킷 전용 배선(훅·model-gym은 킷 인프라 — 캘리브레이션 오케스트레이션은 킷 세션에서 열도록
  README에 명시). 사용자 승인: 2026-07-06 Fable 검수 세션.

## MODELS.md haiku 상태 정정 — 2026-07-06 · Fable 함대 검수 (버전 무변 · 단일 원천 드리프트 수리)
- MODELS.md "현재 값" 인용문 블록의 haiku 서술이 낡아 있었다 — haiku 실전 캘리브레이션(`a5a2b49`,
  6/18 치명·전 역할군 미배치)이 끝난 뒤에도 본문은 "아직 실측 없음 · 다음 분화 후보"라고 말해,
  배치표만 읽는 다음 세션이 haiku를 "시험 대기 승격 후보"로 오독할 수 있었다(캘리브레이션 커밋이
  CHANGELOG·scoring.md만 고치고 배치표 본문을 갱신하지 않은 누락).
- 정정: "실측 불합격 — 전 역할군 미배치" + 실패 패턴 요약 + 재시험 조건(개선 근거 생겼을 때만,
  캘리브레이션 절 벽 그대로)으로 갱신. 함대 3리포(sam·ai-worklog·invest-desk) 전파 + 해시 재단일.
- 부수 정정: log.md의 frontmatter 개수 오기(20종 → 실측 24종 = 킷6·sam8·ai-worklog6·invest4)를
  append 줄로 정정. 근거: 2026-07-06 Fable 함대 검수(HANDOFF-2026-07-06-fable-review 대상 검수).

## v0.24 — 2026-07-06 · ai-worklog cycle 3 (모델 테스트 자기 역할극 금지 · 킷 공통)
- MODELS.md 캘리브레이션 절: "'OO 모델로 테스트/측정/캘리브레이션' 요청을 자기 역할극으로 처리하지 마라 —
  측정은 반드시 Agent 도구 model 파라미터로 실제 격리 서브에이전트를 호출한 산출이어야 하고, 채점은
  측정과 다른 모델이 맡는다" 추가.
- 배경: ai-worklog에서 코디네이터가 "haiku로 테스트해줘" 요청을 실제 호출 없이 자기 역할극+자기채점으로
  처리해 허위 "치명 0·합격"을 보고한 사건(파일 커밋 전 자체 발견·정정, 실피해 0) — model-gym 자체가
  금지하는 자기채점 오류의 조작(operational) 벽이 어디에도 없었다. 근거: ai-worklog
  retro/2026-07-06-retro-cycle3.md 실패 1.

## model-gym haiku 실전 캘리브레이션 — 2026-07-06 · 불합격 실측 (버전 무변 · 측정 기록만)
- sonnet과 동일 격리 절차(빈 폴더 측정 + 별도 모델 채점, opus)로 haiku를 3과제×3회차 + 함대 role
  3종×3회차 실측. **18회차 중 6회차 치명 위반** — sonnet(0/18)과 뚜렷이 대비되는 결과.
- 실패 패턴(전부 "모르는 것을 안다고 말함" 유형): ① task-a 회차1 — devil의 지적을 표결 "반대표"로
  잘못 집계(A-6). ② sam-flavor 회차1 — 강사 교체 "사유"를 발명(vault에 없음). ③ sam-flavor 회차2 —
  [미확인]인 "수업 방식 변화"를 "변화 없음"으로 단정. ④ ai-worklog-flavor 회차1·2 — [미확인]인
  만족도를 개선된 것처럼 암시 + record에 없는 주관적 교훈("무게감 있는 손길") 발명. ⑤ invest-desk-flavor
  회차2 — 미확인 경쟁 요인을 조건문 없이 단정 + 원가 리스크를 강세로 오분류.
- task-b·task-c(콘텐츠·문서 생산)는 haiku도 3/3 전부 치명 0 — 실패는 **판단·집계·미확인 규율이
  걸린 역할**(회의 집계, 사실 발명 위험이 있는 요약/분석)에 집중됐고, 순수 인용형 문서 생산에서는
  약점이 드러나지 않았다.
- scoring.md 3벌에 haiku 판정 기록 추가. **결론: haiku는 현재 판정·생산-내부·기록 어느 역할군에도
  배치하지 않는다** — MODELS.md의 현재 값(생산-내부·기록=sonnet)은 변경 없음. 이번 실측은 sonnet
  하향이 안전선이었음을 확인하는 근거로만 쓴다.

## MODELS.md 첫 분화 — 2026-07-06 · sonnet 캘리브레이션 근거 반영 (킷 공통)
- "현재 값"을 "전 역할군 opus"에서 판정·생산-외부발행 = opus(유지) / 생산-내부·기록·정리 = sonnet(하향)으로
  분화. 근거: 아래 model-gym 실전 캘리브레이션(sonnet 3과제×3회차 치명 0/9 + 함대 role 3종 부가실측
  17/18 PASS). 판정·생산-외부발행은 sonnet도 시험을 통과했지만 "가용한 것 중 항상 최강" 정책이라
  하향하지 않음 — 시험 통과는 바닥선 확인이지 승격 근거가 아니다(mandela 검수 교훈).
- 적용: 함대 4리포(킷·sam·ai-worklog·invest-desk)의 판정·생산-외부발행류 에이전트 12종에
  `model: opus`, 생산-내부·기록류 에이전트 8종(+킷 자체 없음 항목 제외)에 `model: sonnet` frontmatter
  명시 추가 — 이전엔 frontmatter에 model: 없어 세션 기본 모델을 암묵 상속했으므로, 이제부터는 세션
  기본 모델이 바뀌어도(예: 사용자가 /model로 haiku·sonnet 전환) 역할별 배치가 흔들리지 않는다.
- haiku는 여전히 미검증 — 실측 없이 어떤 역할군에도 배치하지 않는다(다음 분화 후보로만 남김).

## model-gym 첫 실전 캘리브레이션 (sonnet) — 2026-07-06 · 격리 정정 이후 첫 실측 (버전 무변 · 측정 기록만)
- 격리 절차(빈 폴더 측정 + 별도 모델 채점, 이번엔 opus)로 sonnet 5를 3과제×3회차 실측. 결과:
  치명 위반 0건/9회 — task-a·b·c 전 회차 판정 역할군/생산 역할군 합격. 공통 권고 2건(A-11 실패
  경로 누락, B-9 어미 단조)은 3개 scoring.md 판정 기록에 기재.
- 부가 실측(model-gym 3과제와 별개, 함대 role 3종 각 3회차 격리 픽스처로 sonnet 실측 — sam
  doc-writer류·ai-worklog archivist+writer류·invest-desk analyst류): 17/18 PASS. 유일한 REVISE는
  ai-worklog 회차3 — 자기 record에도 raw 메모에도 없는 "느낌이 달라졌다"(효과 개선)를 [미확인]
  (만족도)과 모순되게 사실처럼 서술 — writer 단계에서 발명이 스며드는 실측 사례.
- 방법론 교훈: 이전 세션에서 "haiku 테스트"라며 보고된 결과는 전부 허구였다(별도 모델 미호출,
  자기 채점) — model-gym 자체가 금지하는 자기채점 오류를 그대로 범한 것. 이번 회차부터 Agent
  도구의 model 파라미터로 실제 격리 서브에이전트를 호출 + 별도 모델(opus)로 채점하는 방식으로 교정.
  MODELS.md "현재 값" 확정은 설계대로 사람 몫 — 이 커밋은 증거만 남긴다.
- 측정 실행 위치 결함: 전략 문서 §6-3 원판이 "킷 폴더에서 실행"을 지시 — 정답본·채점표가 같은 폴더에
  있고 훅은 쓰기만 막지 읽기는 못 막아, 측정 대상 모델이 정답을 열람할 수 있었다(암기 누수).
  킷이 공개 리포라 정답본이 인터넷에 있는 점도 병기. → README 사용법 1을 격리 실행으로 정정:
  input.md 3개만 빈 폴더(`../model-exam`)에 복사해 거기서 측정 (준비 명령 포함).
- 채점 주체 명확화: "별도 세션(측정 대상이 아닌 모델)" → **측정과 다른 모델** — 같은 모델의 다른
  세션은 별도로 안 친다 (동일 모델이 같은 버릇을 같은 잣대로 봐주는 자기 확인 차단).
- 벽 추가: 측정 세션을 정답본이 있는 폴더에서 열지 마라.
- 잔여 권고(미실행): 채점표 변별력 검증 — 약한 모델(haiku) 1회 시험으로 치명 위반이 실제로 잡히는지
  확인. 아직 이 시험에서 떨어져본 모델이 없다 (시험이 시험인지 미검증). 부수효과: MODELS.md 분화 실측 근거.
- 근거: 2026-07-06 paperthin 함대 검수 (ssotchk·mandela) — 전략 문서 §6-3 동시 정정(somnia-hub).

## model-gym 정정 — 2026-07-06 · 독립 적대 검수 발견 반영 (버전 무변 · 첫 캘리브레이션 실행 전 수리)
- 정답본 결함 3건 정정 — 과제가 처벌하도록 설계된 바로 그 유형의 결함이 정답본에 있었다:
  ① task-a "8월 4개 토요일"(사실 오류 + 픽스처 밖 수치) → "8월 모든 토요일"(연도 무관 표현)
  ② task-c "(5대 한정, 선착순)" — §E에 없는 배정 방식 날조 + 허위 인용 → "(5대 한정)" + 질문 3으로 이관
  ③ task-b 글자수 허위 표기(438자) → 394자 실측 정정 + "0건" 주장에 검토 조건 병기.
- 채점표 모호성 2건 정정: A-3(devil "마지막 발언"의 범위 — moderator 집계는 예외 명시) ·
  A-8(devil 3종 세트 발언 800자 허용) · C-1에 "운영 규칙 발명도 포함" 예시 추가.
- 픽스처 정정 1건: task-a input "4개 발언" → "5개 발언" (목록 5개와 불일치). 캘리브레이션 0회 실행
  시점의 정정이라 비교 가능성 훼손 없음 — 이후 픽스처 수정 금지 벽 그대로.
- 근거: 함대 전수 검수(2026-07-06) 독립 적대 검수 — 자기 산출물 자기 평가 금지(SOUL §5) 이행.
  교훈: 정답본도 산출물이다 — 박제 전 독립 검수를 거쳐야 한다.

## model-gym 신설 — 2026-07-06 · Fable 예약 작업 완료 (버전 무변 — 규칙·훅 무변경, 측정 자산 추가만)
- `model-gym/` 신설: 골든 과제 3종 — task-a(회의 1라운드: 술어화·악마 3종 세트·집계) ·
  task-b(record→threads: 사실 범위·[미확인] 층위·규격) · task-c(vault→학부모 안내문: 1:1 인용·미확인 규율).
  각 과제 = 고정 입력(픽스처, 수정 금지) + 정답본(Fable 5 직접 작성 — 이 작업의 목적) + 치명/권고 채점표.
- 용도: MODELS.md 캘리브레이션 벽("새 모델을 검증 없이 판정 역할군에 앉히지 마라")의 실행 도구 —
  새 모델 첫날 이 3과제로 역할군 합격표를 만든 뒤 MODELS.md 현재 값을 갱신한다. 절차는 model-gym/README.md.
- 근거: somnia-hub `FLEET-STRATEGY-2026-07-06.md` §6-2 · ROADMAP "model-gym (Fable 예약)" 항목 이행.

## v0.23 — 2026-07-06 · ai-worklog cycle 2 (걸음 완결 전 다음 커맨드 금지 · 킷 공통)
- CLAUDE §4(훅 배선): 이전 커맨드의 걸음이 파일로 완결 확인되기 전에 다음 커맨드 시작 금지 —
  새 커맨드 수신 시 이전 걸음부터 닫는다(산출물 Read 재검증 + state 저장). 두 걸음 병렬 진행 금지
  (SOUL §4 "한 걸음 = 한 단계"의 커맨드 경계 확장).
- 배경: ai-worklog에서 /worklog 하위 작업(record 부록 반영) 미완 중 /posts 수신 — 코디네이터 재량으로
  무사고였으나, status 문자열 게이트는 걸음 안의 미결 하위 작업을 표현하지 못한다. 재량이 아니라 벽이 막아야 한다.
- [승격 후보: state.json `pending` 필드 + 각 커맨드 절차 1 게이트가 status·pending 동시 검사]
- 근거: ai-worklog retro/2026-07-06-retro.md 실패 3.

## v0.22 — 2026-07-06 · ai-worklog cycle 2 (기록 근거의 휘발 경로 금지 · 킷 공통)
- AGENTS §2(발언·기록 규칙): 증거 기반 기록(record·rounds·report)의 근거를 리포 밖 휘발 경로
  (scratchpad·%TEMP%·/tmp)로만 남기기 금지 — 인용·재검증으로 흡수해 자립시키거나 커밋 경로로 이동,
  둘 다 못 하면 `[미확인]`.
- 배경: ai-worklog cycle 2 record의 1차 증거원이 다른 세션 scratchpad에만 존재 — temp 청소 한 번이면
  세션에만 존재하는 서술(자기모순 건)이 소급 불가였다. 이번 자립은 archivist 재량이지 벽이 아니었음.
- [승격 후보: 체크 스크립트가 기록 본문의 휘발 경로 패턴 grep → 검출 시 WARN]
- 근거: ai-worklog retro/2026-07-06-retro.md 실패 2.

## v0.21 — 2026-07-06 · ai-worklog cycle 2 (훅 deny 분류 없는 우회 금지 · 킷 공통)
- AGENTS §4(컨텍스트 태만): 훅 deny를 오탐/정탐 분류·원 명령 기록 없이 형태만 바꿔 재시도 금지 —
  분류 없는 우회 성공은 오탐을 침묵시키고 미검증 가설을 기록에 남긴다 (SOUL §4의 훅 deny 확장).
- 배경: ai-worklog에서 record 부록 append가 벽2에 deny되자 "&&체인 때문"이라는 미검증 가설만 남기고
  형태를 바꿔 통과 — 회고 재현 분석 결과 실제 오탐 표적은 인라인 페이로드 속 Markdown 인용문(truncRedirect).
  장부가 `path:""`뿐이라 사후 분류가 구조적으로 불가했다.
- [승격 후보: ledger deny 기록에 command 발췌(앞 200자) 필드 — engine·ledger 킷 1벌 개정]
- 근거: ai-worklog retro/2026-07-06-retro.md 실패 1.

## 문서 정합성 감사 — 2026-07-06 · W2~W7 문서 동기화 (버전 무변 · 코드 v0.20 그대로)
- 배경: HANDOFF W2~W7(코드 v0.16~0.20) 후 설명 문서가 낡아, 사용자 요청으로 전 문서 유형 감사.
- 동기화(실제 낡음): `CLAUDE.md`(§7 배선사실 재작성 · 프리미티브 지도 · §4 engine 드리프트 벽) ·
  `README.md`(파일 구조: engine 3층·ledger·checks/step-diff·TOP-WALLS·MODELS) ·
  `00_사용법.md`(이식법: "상수 3줄" → `harness.config.json`) · `log.md`(v0.16~0.20 걸음 기록).
- 확인·무변(설계상 맞음): `SOUL.md`(불변 헌법)·`AGENTS.md`(도구 무관 규칙)·`settings.json`·`.gitignore`(W2·W4 선반영)·
  `wiki/index.md`(지식 색인 — machinery 아님).
- 근거: 사용자 문서 정합성 감사 요청(2026-07-06). 코드·규칙 변경 없음 — 문서만 코드(v0.20)에 일치시킴.

## v0.20 — 2026-07-05 · HANDOFF W7 (모델 배치표 · 킷 공통)
- `MODELS.md` 신설(단일 원천): 역할군별(판정·생산-외부·생산-내부·기록) 모델 배치 원칙 + 현재 값 표.
  판정·발행 역할군에 최강 모델, 내부 토론에 중간 등급 — "검증 강하면 생성 약해도 품질 유지"(SOUL §5의 모델판).
- 목적(F4): 모델 참조를 한 곳에 모아 교체를 "표 한 줄 수정"으로. 하드코딩 모델 참조 제거 방침.
- 현재 값(⬜)은 다음 주 가용 모델 확정 시 사람이 채운다 → 이후 에이전트 frontmatter `model:`에 반영.
  새 모델 첫 사이클 = 캘리브레이션 사이클(exemplar·rubric 대조 후 판정 역할군 확정). 근거: HANDOFF W7.

## v0.19 — 2026-07-05 · HANDOFF W6 (TOP-WALLS 재주입 · 킷 공통)
- `TOP-WALLS.md` 신설(전 함대 바이트 동일): 상위 벽 10개 요약. session-start 훅이 SOUL 직후 재주입(1,500자 cap).
- 근거(N3): SOUL 전문은 재주입되나 회고가 낳은 운영 벽(git 기강 등)은 재주입 목록에 없었다 — 컴팩트 후
  약한 모델이 다시 안 읽는 사각지대. 짧고 강한 벽 목록은 약한 모델이 훨씬 잘 지킨다.
- 검증: `node .claude/hooks/session-start.mjs` 출력에 TOP-WALLS 섹션 포함(3 리포). 근거: HANDOFF W6.

## v0.18 — 2026-07-05 · HANDOFF W5 (걸음 diff 게이트 · 킷 공통)
- `.claude/checks/step-diff.mjs` 신설(spec-check 스타일): `git status --porcelain --untracked-files=all`로
  "선언한 산출 경로 + state/ + log.md" 밖의 변경을 탐지 → exit 1 + 위반 목록. 인자 없으면 usage + exit 2.
- 에이전트 정체성은 훅 입력에 없어 훅으로 역할 경계를 못 막는다(F3) — 걸음 후 git 대조로 침범을 잡는다.
- `/meeting-round` 배선: 발언 배분 직후 `step-diff rounds/` 게이트(4-1), exit 1이면 REVISE.
- 검증: exit 0/1/2 픽스처 실측(선언 파일 통과 · 미선언 파일 위반 · state 자동허용). 근거: HANDOFF W5.

## v0.17 — 2026-07-05 · HANDOFF W4 (사건 장부 + 자동 회고 배선 · 킷 공통)
- `ledger.mjs` 신설(전 함대 바이트 동일): 훅이 차단·경고·가드포기 시 `state/incidents.jsonl`에 append.
  기록 지점 3곳: pre-tool-use deny(engine) · post-tool-use warn · stop-retro-guard 3회 포기(+`log.md` 기록).
- `/retro` 개정 2건: (1-1) incidents.jsonl 집계를 회고 실패 후보 1순위로 · (승인단계) "이 벽을 코드·테스트로
  승격 가능한가 + 전용이라도 추출할 공통 패턴이 있는가" 판정 추가(F2 재발 방지) · (마무리) 장부 비우기.
- `incidents.jsonl`은 state/ 로컬 전용(gitignore) — state.json과 동일 취급, 회고 재료용 텔레메트리.
- 검증: 3 기록지점 실측(deny·warn·give-up log.md append), 동작-보존 매트릭스 0/23(3 리포). 근거: HANDOFF W4.

## v0.16 — 2026-07-05 · HANDOFF W3 (구조 리팩터 · 킷 공통)
- 벽2 훅을 3층으로 분리: `engine.mjs`(공용 로직 · 전 함대 바이트 동일 · 해시 감사 대상) +
  `harness.config.json`(프로젝트 상수 protected/immutableDirs/appendableDirs/mutableDirs) +
  `project-walls.mjs`(프로젝트 고유 벽 · 선택). `pre-tool-use.mjs`는 엔진 호출 얇은 셸.
- 목적: 공통 로직+상수 혼재로 인한 드리프트 차단(3벌 105·105·136줄 → engine 1벌 바이트 동일).
  공통 벽 개정은 이제 engine.mjs 복사 1회로 전 함대 전파 — F1(PowerShell 미전파) 같은 형제 누락 재발 방지.
- 불변 디렉토리 의미 분리: immutableDirs(Write·Edit 금지) vs appendableDirs(Write 금지·Edit append 허용).
- 검증: 리포별 23케이스 동작-보존 매트릭스 판정 불일치 0/23(킷·sam·ai-worklog), engine 해시 3벌 동일,
  ai-worklog 벽5 전이 가드 deny/통과(PASS·EXHAUSTED·REVISE) 재확인. 근거: HANDOFF-2026-07-05 W3.

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
