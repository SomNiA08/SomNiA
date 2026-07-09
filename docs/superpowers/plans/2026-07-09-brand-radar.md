# brand-radar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 킷에서 파생한 새 하네스 `harness/brand-radar`를 구축한다 — 외부 신호를 수집·검증해 주제 후보 큐를 내놓는 5걸음 사이클.

**Architecture:** haeness-kit의 3층 훅 구조(engine.mjs 바이트 동일 + harness.config.json 상수 + project-walls.mjs 고유 벽)를 그대로 상속한다. 고유 벽은 `signals/<날짜>/synthesis.md`의 신호 스키마 게이트다 — `/meeting` 진입(=`status: debate` 전이) 시 모든 신호 항목이 `tier`·`observed_at`·`source`를 갖췄고 `metric`이 없으면 등급이 `EXTRACTED`가 아님을 기계로 강제한다. 에이전트 12명(수집 4 → 종합 1 → 검증 1 → 회의 4 → 회고 1, 일부 겸직)은 파일 기반으로 통신한다.

**Tech Stack:** Node.js (훅 · `.mjs`, ESM) · `node:test` 내장 러너 · git · Claude Code 커맨드/에이전트 마크다운

> 테스트 실행은 반드시 `node --test "tests/*.test.mjs"` (글롭 형태). Node v26 + Git Bash 조합에서
> `node --test tests/` (디렉토리 형태)는 `tests` 를 테스트 파일로 오인해 `'test failed'` 로 죽는다 — 실측 확인됨.

## Global Constraints

스펙(`docs/superpowers/specs/2026-07-09-brand-radar-design.md`)의 프로젝트 전역 요구사항. 모든 태스크에 암묵 적용된다.

- `engine.mjs`는 **전 함대 바이트 동일**이다. 절대 수정하지 마라. 프로젝트 차이는 `harness.config.json`(상수)과 `project-walls.mjs`(고유 벽)로만 낸다. (CLAUDE §4)
- 훅은 **절대 throw 하지 않는다.** 크래시 = 통과 = 누수. 모든 `check()` 경로는 `try/catch`로 감싸고 실패 시 `null`(통과)을 반환한다. (CLAUDE §4)
- 훅은 **Node.js(.mjs)로만** 작성한다. bash 훅 금지 (Windows). (CLAUDE §2)
- 걸음의 원자 단위는 **산출 + 기록(state/log) + 커밋**이다. `git add`와 `git commit`은 **분리 실행**한다 — `&&`로 묶지 마라. 커밋 증명은 직후 `git log`의 해시로만. (CLAUDE §2-1)
- gitignore 대상 경로(`state/state.json` 등)를 `git add` 인자에 넣지 마라. (CLAUDE §2-1)
- 모델 배선은 `MODELS.md` 단일 원천을 따른다. 하드코딩 금지. 현재 값: **판정·생산-외부발행 = `opus`**, **생산-내부·기록·정리 = `sonnet`**.
- 증거 등급 어휘는 `EXTRACTED` / `INFERRED` / `AMBIGUOUS` 셋뿐이다. 승격 금지. (AGENTS 62행)
- 소표본 임의 문턱 금지. 문턱을 쓰려면 "어떤 관측이면 이 문턱을 바꾸는가"를 현 표본과 독립으로 답할 수 있어야 한다. 못 하면 **잠정 플래그**로만 표기. (AGENTS 63행)
- 외부 발행처 등록 표는 **전부 빈칸(⬜)으로 유지**한다. 이 하네스는 외부에 아무것도 발행하지 않는다.
- 신규 파일의 인코딩은 UTF-8(BOM 없음), 개행은 LF.
- **이 세션의 훅이 너의 Bash 호출도 검사한다.** 보호 파일(`SOUL.md`·`AGENTS.md`·`CLAUDE.md`·`log.md`·`CHANGELOG.md`)은
  `cp`·`mv`·`>`(truncate)·`Write` 도구로 만들 수 없다 — `>>` append 또는 Edit만 허용된다.
  `signals/`·`rounds/` 경로에 `rm` 을 쓰지 마라 — Node `fs.rmSync` 로 지운다.
  **훅을 무력화하거나 매처를 해제해 우회하지 마라** (CLAUDE §4).

### 기계로 강제할 수 없는 벽 (문서 벽으로만 존재)

스펙 §4의 **"수집기에게 `wiki/axis.md`를 읽히지 마라"**(확증편향 차단)는 훅으로 막을 수 없다. 근거:

1. `settings.json`의 `PreToolUse` 매처에 `Read`가 없다 (`Write|Edit|MultiEdit|Bash|PowerShell`).
2. 훅 입력(`data`)에는 **어느 에이전트가 호출했는지가 담기지 않는다.** engine.mjs 주석에도 같은 한계가 적혀 있다 ("에이전트 정체성은 훅 입력에 없어 훅으로 못 막지만").

따라서 이 벽은 각 수집기 에이전트의 `.claude/agents/<name>.md` **절대 금지 절**과 `/scan` 커맨드의 브리프에만 존재한다. 이 사실을 CLAUDE.md에 명시한다 (Task 3). 기계 강제는 스키마 게이트(Task 4)가 담당한다.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `.claude/hooks/engine.mjs` | 벽2 공용 엔진. **킷에서 복사, 수정 금지** |
| `.claude/hooks/ledger.mjs` | 사건 장부. 킷에서 복사, 수정 금지 |
| `.claude/hooks/{session-start,pre-tool-use,post-tool-use,stop-retro-guard,agent-ledger}.mjs` | 훅 진입점 5. 킷에서 복사, 수정 금지 |
| `.claude/hooks/harness.config.json` | **이 프로젝트 상수** — `signals`를 `immutableDirs`에 등록 |
| `.claude/hooks/project-walls.mjs` | **이 프로젝트 고유 벽** — 신호 스키마 게이트 + state 셸쓰기 금지 |
| `.claude/checks/step-diff.mjs` | 걸음 산출 경계 게이트. 킷에서 복사, 수정 금지 |
| `.claude/settings.json` | 훅 배선. 킷에서 복사, 수정 금지 |
| `.claude/agents/*.md` (12) | 에이전트 정체성·tools 제한·model |
| `.claude/commands/*.md` (5) | `/scan` `/meeting` `/meeting-round` `/queue` `/retro` |
| `SOUL.md` `AGENTS.md` `TOP-WALLS.md` `MODELS.md` | 킷에서 복사, 수정 금지 (헌법·공통 규칙) |
| `CLAUDE.md` | 킷 복사 + 이 프로젝트 배선 절 개정 |
| `README.md` `CHANGELOG.md` `log.md` `.gitignore` | 프로젝트 문서·기록 |
| `wiki/axis.md` | **브랜딩 축 상수** (읽기 전용) |
| `tests/project-walls.test.mjs` | 고유 벽 TDD |
| `tests/fixtures/` | 벽 테스트용 synthesis 픽스처 |

산출 디렉토리: `signals/`(불변) · `rounds/`(불변) · `topics/` · `wiki/` · `retro/` · `state/` · `_inbox/`

---

## Task 1: 리포 스캐폴딩 + 킷 배선 복사 + engine 바이트 동일 검증

**Files:**
- Create: `../brand-radar/` (git init)
- Create: `../brand-radar/.claude/hooks/{engine,ledger,session-start,pre-tool-use,post-tool-use,stop-retro-guard,agent-ledger}.mjs` (킷에서 복사)
- Create: `../brand-radar/.claude/checks/step-diff.mjs` (킷에서 복사)
- Create: `../brand-radar/.claude/settings.json` (킷에서 복사)
- Create: `../brand-radar/.gitignore`
- Create: `../brand-radar/{SOUL.md,AGENTS.md,TOP-WALLS.md,MODELS.md}` (킷에서 복사)

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces: `$BR` = `harness/brand-radar` 리포 루트. 이후 모든 태스크의 `cwd`.

- [ ] **Step 1: 리포 생성 + 킷 배선 복사**

킷 루트(`harness/haeness-kit`)에서 실행한다.

```bash
set -e
KIT="$(pwd)"
BR="$(cd .. && pwd)/brand-radar"
mkdir -p "$BR/.claude/hooks" "$BR/.claude/checks" "$BR/.claude/agents" "$BR/.claude/commands"
mkdir -p "$BR/signals" "$BR/rounds" "$BR/topics" "$BR/wiki" "$BR/retro" "$BR/state" "$BR/_inbox"

# 수정 금지 파일 (바이트 동일 유지 대상) — 경로에 보호 파일명이 없어 cp 가능
for f in engine.mjs ledger.mjs session-start.mjs pre-tool-use.mjs post-tool-use.mjs stop-retro-guard.mjs agent-ledger.mjs; do
  cp "$KIT/.claude/hooks/$f" "$BR/.claude/hooks/$f"
done
cp "$KIT/.claude/checks/step-diff.mjs" "$BR/.claude/checks/step-diff.mjs"
cp "$KIT/.claude/settings.json"        "$BR/.claude/settings.json"
cp "$KIT/TOP-WALLS.md" "$KIT/MODELS.md" "$BR/"
```

⚠️ **보호 파일은 `cp` 로 옮길 수 없다.** `SOUL.md`·`AGENTS.md`·`CLAUDE.md`·`log.md`·`CHANGELOG.md` 는
`harness.config.json` 의 `protected` 목록에 있고, engine의 `moveOver` 패턴(`\b(mv|cp)\b … <보호파일>`)이
이 세션의 Bash 호출을 차단한다. 훅이 옳다 — 표준 우회는 하나뿐이다: **`>>` append** (CLAUDE §4).

```bash
KIT="$(pwd)"; BR="$(cd .. && pwd)/brand-radar"
cat "$KIT/SOUL.md"   >> "$BR/SOUL.md"
cat "$KIT/AGENTS.md" >> "$BR/AGENTS.md"
```

대상 파일이 존재하지 않아야 한다(append이므로 이어붙는다). 실행 후 줄 수를 대조해 확인한다:

```bash
KIT="$(pwd)"; BR="$(cd .. && pwd)/brand-radar"
for f in SOUL.md AGENTS.md; do
  a=$(grep -c "" "$KIT/$f"); b=$(grep -c "" "$BR/$f")
  test "$a" = "$b" && echo "OK $f ($a줄)" || { echo "MISMATCH $f: kit=$a br=$b"; exit 1; }
done
```

Expected: `OK SOUL.md (...)` · `OK AGENTS.md (...)`

- [ ] **Step 2: engine.mjs 바이트 동일 검증 (실패하면 즉시 중단)**

`git hash-object`는 내용의 SHA-1을 낸다. 두 값이 다르면 복사가 오염된 것이다.

```bash
KIT="$(pwd)"; BR="$(cd .. && pwd)/brand-radar"
A=$(git hash-object "$KIT/.claude/hooks/engine.mjs")
B=$(git hash-object "$BR/.claude/hooks/engine.mjs")
echo "kit=$A"; echo "br =$B"
test "$A" = "$B" && echo "OK 바이트 동일" || { echo "DRIFT — 중단"; exit 1; }
```

Expected: `OK 바이트 동일`

- [ ] **Step 3: .gitignore 작성**

`$BR/.gitignore`:

```
state/.retro-attempts
state/state.json
state/incidents.jsonl
state/agent-calls.jsonl
_inbox/*
!_inbox/.gitkeep
```

`_inbox/`를 무시하는 이유: 사용자가 던져 넣는 스크린샷·개인 피드 캡처가 공개 리포에 섞이면 안 된다 (스펙 §3-3).

- [ ] **Step 4: 빈 디렉토리 보존 + 훅 작동 점검**

```bash
BR="$(cd .. && pwd)/brand-radar"
for d in signals rounds topics retro state _inbox; do touch "$BR/$d/.gitkeep"; done
cd "$BR" && node .claude/hooks/session-start.mjs
```

Expected: SOUL·TOP-WALLS가 담긴 JSON이 stdout으로 출력된다 (재주입 컨텍스트). 에러 없이 종료.

- [ ] **Step 5: git init + 최초 커밋**

```bash
BR="$(cd .. && pwd)/brand-radar"; cd "$BR"
git init
git add .gitignore .claude SOUL.md AGENTS.md TOP-WALLS.md MODELS.md signals/.gitkeep rounds/.gitkeep topics/.gitkeep retro/.gitkeep _inbox/.gitkeep
```

`state/.gitkeep`은 `.gitignore`에 걸리지 않으므로 함께 추가한다:

```bash
git add state/.gitkeep
```

커밋은 분리 실행한다 (CLAUDE §2-1):

```bash
git commit -m "chore: brand-radar 스캐폴딩 — 킷 3층 훅 배선 복사 (engine 바이트 동일 검증 통과)"
git log -1 --format='%h %s'
```

Expected: 해시 + 제목 1줄. 이것이 커밋의 유일한 증명이다.

---

## Task 2: harness.config.json — signals/ 를 불변 계층으로

**Files:**
- Create: `../brand-radar/.claude/hooks/harness.config.json`
- Test: 수동 검증 (engine이 읽는 상수 파일)

**Interfaces:**
- Consumes: Task 1의 `engine.mjs` (이 파일을 `loadConfig()`로 읽는다)
- Produces: `cfg.immutableDirs = ["rounds", "signals"]` — Task 4의 `project-walls.mjs`가 `ctx.cfg`로 받는다.

- [ ] **Step 1: 설정 작성**

`$BR/.claude/hooks/harness.config.json`:

```json
{
  "_comment": "brand-radar 배선 상수. signals/·rounds/ 는 관측 원본(불변) — 시계열이 사라지면 상승/정점 구분이 불가능하다. 고유 벽(신호 스키마 게이트·state 셸쓰기 금지)은 project-walls.mjs.",
  "protected": ["SOUL.md", "AGENTS.md", "CLAUDE.md", "log.md", "CHANGELOG.md"],
  "immutableDirs": ["rounds", "signals"],
  "appendableDirs": [],
  "mutableDirs": ["wiki", "topics", "retro", "state"]
}
```

`wiki`가 `mutableDirs`에 있는 이유: 킷 관례를 따른다. `wiki/axis.md`의 읽기 전용성은 **문서 벽**이지 훅 벽이 아니다 (Task 3에서 CLAUDE.md에 명시).

- [ ] **Step 2: 불변 계층이 실제로 막히는지 실측 (deny 케이스)**

`signals/` 아래에 기존 파일을 만들어 두고 Write 덮어쓰기를 시도한다. 훅에 stdin으로 도구 호출 JSON을 먹인다.

```bash
BR="$(cd .. && pwd)/brand-radar"; cd "$BR"
mkdir -p signals/2026-07-09 && echo "원본" > signals/2026-07-09/synthesis.md
echo '{"tool_name":"Write","tool_input":{"file_path":"signals/2026-07-09/synthesis.md","content":"덮어쓰기"}}' \
  | CLAUDE_PROJECT_DIR="$BR" node .claude/hooks/pre-tool-use.mjs
```

Expected: `{"hookSpecificOutput":{...,"permissionDecision":"deny",...}}` — 사유에 `rounds/·signals/ 원본은 덮어쓰기 금지` 포함. 종료코드 0.

- [ ] **Step 3: 통과 케이스도 실측 (deny만 확인하면 벽이 아니라 벽돌담이다)**

```bash
BR="$(cd .. && pwd)/brand-radar"; cd "$BR"
echo '{"tool_name":"Write","tool_input":{"file_path":"topics/2026-07-09-queue.md","content":"후보"}}' \
  | CLAUDE_PROJECT_DIR="$BR" node .claude/hooks/pre-tool-use.mjs; echo "exit=$?"
```

Expected: 출력 없음, `exit=0` (통과). CLAUDE §4: 셸 도구·패턴을 바꿨으면 deny·통과 양쪽을 재검증하기 전까지 벽이 있다고 말하지 마라.

- [ ] **Step 4: 정리 + 커밋**

정리 시 `rm -rf signals/...` 를 쓰지 마라 — engine의 `removeLike` 패턴(`\b(rm|shred|truncate|dd)\b … signals/`)이
이 세션의 Bash 호출을 차단한다. Node로 지운다 (`rmSync` 는 `\brm\b` 에 걸리지 않는다).

```bash
BR="$(cd .. && pwd)/brand-radar"; cd "$BR"
node -e "require('fs').rmSync('signals/2026-07-09',{recursive:true,force:true})"
git add .claude/hooks/harness.config.json
git commit -m "feat: harness.config — signals/ 불변 계층 등록 (관측 시계열 보존)"
git log -1 --format='%h %s'
```

---

## Task 3: 문서 계층 — CLAUDE.md 개정 · README · wiki/axis.md

**Files:**
- Create: `../brand-radar/CLAUDE.md` (킷 복사 후 §7 배선 사실·§2-1·외부 발행처 표 개정)
- Create: `../brand-radar/README.md`
- Create: `../brand-radar/CHANGELOG.md`
- Create: `../brand-radar/log.md`
- Create: `../brand-radar/wiki/axis.md`
- Create: `../brand-radar/wiki/index.md`

**Interfaces:**
- Consumes: Task 2의 `harness.config.json` (배선 사실 절이 이를 서술)
- Produces: `wiki/axis.md` — Task 7의 `panelist-voice`가 읽는 유일한 축 원천.

- [ ] **Step 1: wiki/axis.md 작성 (읽기 전용 상수)**

```markdown
# wiki/axis.md — 브랜딩 축 (읽기 전용 상수)

> ⛔ **이 하네스는 이 파일을 고치지 않는다.** 축의 소유권은 `ai-worklog`에 있다.
> 축이 바뀌면 사람이 `ai-worklog/README.md`에서 바꾸고 이 파일에 옮겨 적는다.
> 회의는 "이 축에 무엇이 걸리는가"만 다룬다 — **"축이 맞는가"는 안건으로 받지 않는다.**

## 축

**이스포츠 현직자의 AI 실무 활용** (전문가 포지셔닝, 주 1~2회 발행)

출처: `ai-worklog/README.md` 3행 (2026-07-09 확인)

## 이 축을 읽어도 되는 자 / 안 되는 자

| 읽어도 됨 | 읽으면 안 됨 (확증편향 차단) |
|---|---|
| `panelist-voice` · `redsea-devil` · `scribe` · `moderator` | `scout-open` · `scout-social` · `format-analyst` · `trend-tracker` |

수집기가 축을 알면 **축에 맞는 신호만 주워 온다.** 그러면 회의는 이미 걸러진 신호를 놓고
"축에 맞나"를 논하게 되어 아무것도 검증하지 못한다. 관측은 축에 대해 눈이 멀어야 한다.
```

- [ ] **Step 2: wiki/index.md 작성**

```markdown
# wiki/index.md — 지금까지 아는 것 (진입점)

- [axis.md](axis.md) — 브랜딩 축 (읽기 전용 상수, 이 하네스는 고치지 않는다)

(그 밖은 비어 있음 — 첫 사이클에서 채운다. 페이지는 append-mostly, 고쳐 합쳐 유지한다.)
```

- [ ] **Step 3: CLAUDE.md 복사 후 3곳 개정**

`cp` 는 `moveOver` 패턴에 막힌다 (Task 1 참조). `>>` append로 옮긴다.

```bash
KIT="$(pwd)"; BR="$(cd .. && pwd)/brand-radar"
cat "$KIT/CLAUDE.md" >> "$BR/CLAUDE.md"
a=$(grep -c "" "$KIT/CLAUDE.md"); b=$(grep -c "" "$BR/CLAUDE.md")
test "$a" = "$b" && echo "OK CLAUDE.md ($a줄)" || { echo "MISMATCH"; exit 1; }
```

그다음 `$BR/CLAUDE.md`를 **Edit로** 세 곳 고친다 (Write는 `protected` 라 차단된다).

(a) 프리미티브 지도 표의 **커맨드** 행:

```
| **커맨드** | 사람/CronJob | `/scan`(신호 수집) · `/meeting <안건>` · `/meeting-round` · `/queue`(주제 후보 큐) · `/retro` |
```

(b) 프리미티브 지도 표의 **에이전트** 행:

```
| **에이전트** | 커맨드가 배분 | `scout-open`·`scout-social`·`format-analyst`·`trend-tracker`·`signal-synthesizer`·`signal-validator`·`moderator`·`panelist-audience`·`panelist-voice`·`redsea-devil`·`scribe`·`retrospector` |
```

(c) `## 7. 배선 사실` 절의 첫 항목 뒤에 다음 두 줄을 추가한다 (Edit로 append):

```markdown
- 고유 벽(`project-walls.mjs`): **벽A** 신호 스키마 게이트(`status: debate` 전이 시 `signals/<날짜>/synthesis.md`의
  모든 항목이 `tier`·`observed_at`·`source` 보유 + `metric` 없으면 `EXTRACTED` 금지) · **벽B** `state/state.json`
  셸 쓰기 금지(전이 가드 우회 차단, 읽기는 허용).
- ⚠️ **훅으로 강제 불가한 벽**: "수집기에게 `wiki/axis.md`를 읽히지 마라"(확증편향 차단)는 문서 벽으로만 존재한다 —
  `PreToolUse` 매처에 `Read`가 없고, 훅 입력에 호출 에이전트의 정체성이 담기지 않기 때문이다. 강제는 각
  수집기 `.claude/agents/*.md`의 절대 금지 절과 `/scan` 브리프가 담당한다. 이 한계를 모르는 채
  "벽이 있다"고 말하지 마라 (SOUL §1).
```

- [ ] **Step 4: README.md 작성**

```markdown
# brand-radar — 외부 신호 → 주제 후보 큐 하네스

**목표**: 고정된 브랜딩 축을 전제로, 바깥 판(AI/개발 · 이스포츠)에서 지금 무엇이 당겨지는지
조사해, "이 주제를 · 이 각도로 · 이 근거로"까지 적힌 주제 후보 목록을 내놓는다.

원본: [harness-kit](https://github.com/SomNiA08/SomNiA). 헌법(SOUL)·훅 3층·회고 가드·역이식
구조는 킷 그대로, 회의 에이전트를 수집·검증팀으로 특화했다.

## 하지 않는 일

- ⛔ 게시물 초안을 쓰지 않는다 (초안은 사람이 쓴다).
- ⛔ 외부에 발행하지 않는다 (등록 표 전부 빈칸).
- ⛔ 내 작업 기록을 다루지 않는다 (`ai-worklog` 소관).
- ⛔ 브랜딩 축을 개정하지 않는다 (`wiki/axis.md`는 읽기 전용 상수).

## 한 사이클 (다섯 걸음)

| 걸음 | 커맨드 | 산출 | 상태 |
|---|---|---|---|
| 1 | `/scan` | `signals/<날짜>/` | `scanned` |
| 2 | `/meeting` | 안건 + 기대값 | `debate` |
| 3 | `/meeting-round` (N회) | `rounds/<날짜>/round-N-*.md` | `debate` |
| 4 | `/queue` | `topics/<날짜>-queue.md` | `report_done` |
| 5 | `/retro` | `retro/<날짜>-retro.md` | `retro_done` |

`/scan` 내부: **카나리아**(채널당 1건 선행 → 죽은 채널 즉시 `FAILED.md` 확정) → 본 수집(병렬)
→ 종합 → **검증 루프**(미달 항목만 재수집, 최대 2회).

## 설계 원칙

- **등급은 수집기가 결정한다.** 숫자(`metric`)를 못 봤으면 `EXTRACTED`일 수 없다.
- **실패한 채널을 다른 채널로 메우지 않는다.** 조용한 실패보다 시끄러운 실패가 낫다.
- **관측은 축에 대해 눈이 멀어야 한다.** 수집기는 `wiki/axis.md`를 읽지 않는다.
- **차단은 최후 방어선이다.** 고치는 일은 `signal-validator`의 검증 루프가 한다.

설계 문서: `harness-kit/docs/superpowers/specs/2026-07-09-brand-radar-design.md`
```

- [ ] **Step 5: log.md · CHANGELOG.md 초기화**

⚠️ `log.md` 와 `CHANGELOG.md` 는 `protected` 목록에 있어 **Write 도구로 만들 수 없다** (engine이 차단).
Bash heredoc + `>>` append 로 만든다. `>` (truncate)는 차단되고 `>>` 는 허용된다.

```bash
BR="$(cd .. && pwd)/brand-radar"; cd "$BR"
cat >> log.md <<'EOF'
# log.md — 한 줄 기록 (append-only)

- 2026-07-09 리포 생성 — 킷 3층 훅 배선 상속, engine 바이트 동일 검증 통과
EOF
cat >> CHANGELOG.md <<'EOF'
# CHANGELOG

## v0.1 (2026-07-09)

- 킷에서 파생. engine.mjs·ledger.mjs·훅 진입점 5·step-diff.mjs 바이트 동일 상속.
- `harness.config.json`: `signals/`를 불변 계층에 등록.
- `wiki/axis.md`: 브랜딩 축을 읽기 전용 상수로 고정 (소유권은 `ai-worklog`).
EOF
grep -c "" log.md CHANGELOG.md
```

Expected: 두 파일 모두 줄 수가 0보다 크다.

`README.md`·`wiki/axis.md`·`wiki/index.md` 는 `protected` 가 아니므로 Write 도구로 만든다.

- [ ] **Step 6: 외부 발행처 등록 표가 빈칸인지 확인 (커밋 전 필수)**

```bash
BR="$(cd .. && pwd)/brand-radar"; cd "$BR"
grep -n '⬜' CLAUDE.md | head
```

Expected: `SOURCE_REF` · `REPORT_DEST` · `LOG_DEST` · `ANNOUNCE_DEST` 네 줄 모두 `⬜`. 하나라도 채워져 있으면 중단하고 비운다 (SOUL §3).

- [ ] **Step 7: 커밋**

```bash
BR="$(cd .. && pwd)/brand-radar"; cd "$BR"
git add CLAUDE.md README.md CHANGELOG.md log.md wiki/axis.md wiki/index.md
git commit -m "docs: 문서 계층 — axis.md 읽기 전용 상수 + CLAUDE 배선 개정(훅 강제 불가 벽 명시)"
git log -1 --format='%h %s'
```

---

## Task 4: project-walls.mjs — 신호 스키마 게이트 (TDD)

**Files:**
- Create: `../brand-radar/.claude/hooks/project-walls.mjs`
- Create: `../brand-radar/tests/project-walls.test.mjs`
- Create: `../brand-radar/tests/fixtures/` (테스트가 런타임에 생성)

**Interfaces:**
- Consumes: `harness.config.json` (Task 2) — `ctx.cfg`로 주입됨. `engine.mjs`가 `check(data, {cfg, root})`를 호출한다.
- Produces: `export async function check(data, ctx) → string | null` — 차단 사유 문자열이면 deny, `null`이면 통과.

### 신호 항목 스키마 (기계 검증 대상)

`signals/<날짜>/synthesis.md`는 **마지막에 ```json 펜스 블록 하나**를 포함해야 한다. 그 블록은 신호 항목 객체의 배열이다.

```json
[
  {
    "id": "2026-07-09-01",
    "claim": "claude-agent-sdk 저장소 별 12,400개",
    "source": "https://github.com/anthropics/claude-agent-sdk",
    "observed_at": "2026-07-09T10:12:00+09:00",
    "tier": "EXTRACTED",
    "metric": "stars=12400",
    "falsifier": "다음 주 별 증가분이 주간 중앙값 미만이면 '상승' 판정을 철회한다"
  }
]
```

검증 규칙 (벽A):
1. `status`를 `debate`로 바꾸는 `state/state.json` 쓰기에만 발동한다.
2. `signals/<signals_date>/synthesis.md`가 없으면 deny.
3. ```json 블록을 파싱하지 못하면 deny.
4. 항목이 0개면 deny.
5. 각 항목의 `tier`·`observed_at`·`source` 중 하나라도 비면 deny.
6. `tier`가 `EXTRACTED`/`INFERRED`/`AMBIGUOUS` 밖이면 deny (승격 어휘 날조 차단).
7. **`metric`이 비었는데 `tier === "EXTRACTED"`면 deny** — 스펙 §3-1의 등급 잠금.

벽B: `state/state.json`을 Bash·PowerShell로 **쓰는** 것 금지 (읽기 허용). `ai-worklog` 벽5b와 동일.

- [ ] **Step 1: 실패하는 테스트 작성**

`$BR/tests/project-walls.test.mjs`:

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check } from "../.claude/hooks/project-walls.mjs";

const CFG = { protected: [], immutableDirs: ["rounds", "signals"], appendableDirs: [], mutableDirs: [] };

function makeRoot(items, { date = "2026-07-09", writeFile = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), "br-"));
  if (writeFile) {
    mkdirSync(join(root, "signals", date), { recursive: true });
    const body = "# 종합\n\n본문\n\n```json\n" + JSON.stringify(items, null, 2) + "\n```\n";
    writeFileSync(join(root, "signals", date, "synthesis.md"), body, "utf8");
  }
  return root;
}

const GOOD = {
  id: "2026-07-09-01",
  claim: "저장소 별 12,400개",
  source: "https://example.com/repo",
  observed_at: "2026-07-09T10:12:00+09:00",
  tier: "EXTRACTED",
  metric: "stars=12400",
  falsifier: "다음 주 증가분이 주간 중앙값 미만이면 상승 판정 철회",
};

function debateWrite(root) {
  return {
    tool_name: "Write",
    tool_input: {
      file_path: join(root, "state/state.json"),
      content: JSON.stringify({ cycle: 1, status: "debate", signals_date: "2026-07-09" }),
    },
  };
}

test("벽A: 정상 신호는 통과한다", async () => {
  const root = makeRoot([GOOD]);
  assert.equal(await check(debateWrite(root), { cfg: CFG, root }), null);
  rmSync(root, { recursive: true, force: true });
});

test("벽A: synthesis.md 가 없으면 차단한다", async () => {
  const root = makeRoot([], { writeFile: false });
  const r = await check(debateWrite(root), { cfg: CFG, root });
  assert.match(String(r), /synthesis\.md/);
  rmSync(root, { recursive: true, force: true });
});

test("벽A: 항목이 0개면 차단한다", async () => {
  const root = makeRoot([]);
  const r = await check(debateWrite(root), { cfg: CFG, root });
  assert.match(String(r), /신호 항목이 없습니다/);
  rmSync(root, { recursive: true, force: true });
});

test("벽A: observed_at 이 비면 차단한다", async () => {
  const root = makeRoot([{ ...GOOD, observed_at: "" }]);
  const r = await check(debateWrite(root), { cfg: CFG, root });
  assert.match(String(r), /observed_at/);
  rmSync(root, { recursive: true, force: true });
});

test("벽A: metric 없는 EXTRACTED 는 차단한다 (등급 잠금)", async () => {
  const root = makeRoot([{ ...GOOD, metric: null }]);
  const r = await check(debateWrite(root), { cfg: CFG, root });
  assert.match(String(r), /metric/);
  rmSync(root, { recursive: true, force: true });
});

test("벽A: metric 없는 INFERRED 는 통과한다", async () => {
  const root = makeRoot([{ ...GOOD, metric: null, tier: "INFERRED" }]);
  assert.equal(await check(debateWrite(root), { cfg: CFG, root }), null);
  rmSync(root, { recursive: true, force: true });
});

test("벽A: 날조된 등급 어휘는 차단한다", async () => {
  const root = makeRoot([{ ...GOOD, tier: "VERIFIED" }]);
  const r = await check(debateWrite(root), { cfg: CFG, root });
  assert.match(String(r), /tier/);
  rmSync(root, { recursive: true, force: true });
});

test("벽A: debate 전이가 아니면 검사하지 않는다", async () => {
  const root = makeRoot([], { writeFile: false });
  const data = {
    tool_name: "Write",
    tool_input: { file_path: join(root, "state/state.json"), content: '{"status":"scanned"}' },
  };
  assert.equal(await check(data, { cfg: CFG, root }), null);
  rmSync(root, { recursive: true, force: true });
});

test("벽B: state.json 셸 쓰기는 차단한다", async () => {
  const root = makeRoot([GOOD]);
  const data = { tool_name: "Bash", tool_input: { command: 'echo "{}" > state/state.json' } };
  assert.match(String(await check(data, { cfg: CFG, root })), /Bash·PowerShell/);
  rmSync(root, { recursive: true, force: true });
});

test("벽B: state.json 셸 읽기는 통과한다", async () => {
  const root = makeRoot([GOOD]);
  const data = { tool_name: "Bash", tool_input: { command: "cat state/state.json" } };
  assert.equal(await check(data, { cfg: CFG, root }), null);
  rmSync(root, { recursive: true, force: true });
});

test("훅은 절대 throw 하지 않는다 — 깨진 입력도 통과", async () => {
  assert.equal(await check(null, { cfg: CFG, root: "/nonexistent" }), null);
  assert.equal(await check({}, {}), null);
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
BR="$(cd .. && pwd)/brand-radar"; cd "$BR"
node --test "tests/*.test.mjs"
```

Expected: FAIL — `Cannot find module '../.claude/hooks/project-walls.mjs'`

- [ ] **Step 3: project-walls.mjs 구현**

`$BR/.claude/hooks/project-walls.mjs`:

```javascript
// project-walls.mjs — brand-radar 고유 벽 (엔진 표준 검사 전에 실행되는 추가 게이트).
// export check(data, {cfg, root}) → 차단 사유 문자열(deny) 또는 null(통과).
// ⛔ 이 파일은 brand-radar 전용이다. 킷·형제 리포에 복사하지 마라(도메인 특화).
//
// 벽A — 신호 스키마 게이트 (스펙 §3-6의 기계 강제):
//   status 를 debate 로 바꾸는 쓰기(= /meeting 진입)는 signals/<날짜>/synthesis.md 의
//   모든 신호 항목이 tier·observed_at·source 를 갖추고, metric 이 없으면 EXTRACTED 가
//   아닐 때만 통과한다. "숫자를 못 봤으면 사실이라 말할 수 없다" (§3-1 등급 잠금).
// 벽B — state/state.json 을 Bash·PowerShell 로 쓰기 금지 (벽A 우회 차단, 읽기는 허용).
//   출처: ai-worklog project-walls.mjs 벽5b.
//
// ⛔ 절대 throw 하지 마라. 훅 크래시 = 통과 = 누수. 모든 경로는 catch → null(통과).
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const TIERS = ["EXTRACTED", "INFERRED", "AMBIGUOUS"]; // 승격 금지 (AGENTS 62행)

export async function check(data, ctx) {
  try {
    const root = (ctx && ctx.root) || process.cwd();
    const tool = (data && data.tool_name) || "";
    const ti = (data && data.tool_input) || {};
    const path = String(ti.file_path || "").replace(/\\/g, "/");

    // 벽A — debate 전이 시 신호 스키마 검사
    if ((tool === "Write" || tool === "Edit" || tool === "MultiEdit") && /(^|\/)state\/state\.json$/.test(path)) {
      const content = String(tool === "Write" ? ti.content || "" : ti.new_string || "");
      if (/"status"\s*:\s*"debate"/.test(content)) {
        const msg = guardSignals(content, root);
        if (msg) return msg;
      }
    }

    // 벽B — state.json 셸 쓰기 금지 (읽기는 허용)
    if (tool === "Bash" || tool === "PowerShell") {
      const c = String(ti.command || "").replace(/\\/g, "/");
      if (/state\/state\.json/.test(c)) {
        const writes = [
          /(>{1,2})\s*['"]?[^|;&]*state\/state\.json/,
          /\b(rm|shred|truncate|dd)\b[^|;&]*state\/state\.json/,
          /\btee\b[^|;&]*state\/state\.json/,
          /\bsed\b[^|;&]*\s-i[^|;&]*state\/state\.json/,
          /\b(mv|cp)\b[^|;&]*state\/state\.json/,
          /\b(Set-Content|Add-Content|Out-File|Clear-Content|Remove-Item|Move-Item|Copy-Item|New-Item|del|ri)\b[^|;&\n]*state\/state\.json/i,
        ];
        if (writes.some((re) => re.test(c))) {
          return "state/state.json 은 Bash·PowerShell로 쓰지 마라 — 상태 전이는 Write/Edit로만 한다(벽A 스키마 게이트가 검사). 읽기(cat·Get-Content)는 허용.";
        }
      }
    }
    return null;
  } catch {
    return null; // 훅 크래시 = 누수 방지
  }
}

// debate 전이 검증 (문제 없으면 null, 있으면 차단 사유)
function guardSignals(content, root) {
  try {
    const date = matchField(content, "signals_date") || todayFromState(content);
    if (!date) return "state.json 에 signals_date 가 없습니다 — /scan 이 먼저 돌아야 합니다. (벽A)";

    const p = join(root, "signals", date, "synthesis.md");
    if (!existsSync(p)) return `signals/${date}/synthesis.md 가 없습니다. /scan 완료 전에는 debate 전이 금지. (벽A)`;

    const text = readFileSync(p, "utf8");
    const m = text.match(/```json\s*([\s\S]*?)```/);
    if (!m) return `signals/${date}/synthesis.md 에 \`\`\`json 신호 블록이 없습니다. (벽A)`;

    let items;
    try { items = JSON.parse(m[1]); } catch { return `signals/${date}/synthesis.md 의 json 블록을 파싱할 수 없습니다. (벽A)`; }
    if (!Array.isArray(items) || items.length === 0) return `신호 항목이 없습니다 (${date}). 빈 종합으로 회의를 열지 마라. (벽A)`;

    for (const it of items) {
      const id = (it && it.id) || "(id 없음)";
      for (const f of ["tier", "observed_at", "source"]) {
        if (!it || !String(it[f] || "").trim()) return `신호 ${id}: ${f} 가 비었습니다. 세 칸(tier·observed_at·source)은 필수. (벽A)`;
      }
      if (!TIERS.includes(it.tier)) return `신호 ${id}: tier 가 ${TIERS.join("/")} 밖입니다(${it.tier}). 등급 어휘 날조 금지. (벽A · AGENTS 62행)`;
      const hasMetric = String((it.metric ?? "")).trim().length > 0;
      if (!hasMetric && it.tier === "EXTRACTED") {
        return `신호 ${id}: metric 이 없는데 tier=EXTRACTED 입니다. 숫자를 못 봤으면 사실이라 말할 수 없다 — INFERRED 이하로. (벽A · 스펙 §3-1)`;
      }
    }
    return null;
  } catch {
    return null; // 내부 오류 시 통과 — 훅 크래시 = 누수 방지
  }
}

function matchField(s, key) {
  const m = String(s).match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`));
  return m ? m[1] : null;
}
function todayFromState(s) { return matchField(s, "date"); }
```

- [ ] **Step 4: 테스트 실행 — 전부 통과 확인**

```bash
BR="$(cd .. && pwd)/brand-radar"; cd "$BR"
node --test "tests/*.test.mjs"
```

Expected: `# pass 11` · `# fail 0`

- [ ] **Step 5: 엔진 경유 실측 (단위 테스트는 훅 배선을 증명하지 않는다)**

`check()`가 통과해도 `engine.mjs`가 `project-walls.mjs`를 실제로 로드하는지는 별개다. stdin으로 먹여 확인한다.

```bash
BR="$(cd .. && pwd)/brand-radar"; cd "$BR"
echo '{"tool_name":"Bash","tool_input":{"command":"echo x > state/state.json"}}' \
  | CLAUDE_PROJECT_DIR="$BR" node .claude/hooks/pre-tool-use.mjs
```

Expected: `permissionDecision":"deny"` + 사유에 `상태 전이는 Write/Edit로만` 포함.

통과 케이스도 확인한다:

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"cat state/state.json"}}' \
  | CLAUDE_PROJECT_DIR="$BR" node .claude/hooks/pre-tool-use.mjs; echo "exit=$?"
```

Expected: 출력 없음, `exit=0`.

- [ ] **Step 6: 커밋**

```bash
BR="$(cd .. && pwd)/brand-radar"; cd "$BR"
git add .claude/hooks/project-walls.mjs tests/project-walls.test.mjs
git commit -m "feat: 벽A 신호 스키마 게이트 + 벽B state 셸쓰기 금지 (TDD 11 pass, 엔진 경유 deny/pass 실측)"
git log -1 --format='%h %s'
```

---

## Task 5: 수집기 에이전트 4 (scout-open · scout-social · format-analyst · trend-tracker)

**Files:**
- Create: `../brand-radar/.claude/agents/scout-open.md`
- Create: `../brand-radar/.claude/agents/scout-social.md`
- Create: `../brand-radar/.claude/agents/format-analyst.md`
- Create: `../brand-radar/.claude/agents/trend-tracker.md`

**Interfaces:**
- Consumes: `wiki/axis.md`의 **읽지 않음** 규약 (Task 3)
- Produces:
  - `signals/<날짜>/open.md` · `social.md` · `format-analysis.md` · `continuity.md`
  - 각 파일 말미에 ```json 신호 항목 배열 (Task 4의 스키마) — `signal-synthesizer`가 병합한다.
  - `signals/<날짜>/FAILED.md` — 카나리아 실패 채널 기록

- [ ] **Step 1: scout-open.md**

```markdown
---
name: scout-open
description: 공개 소스 신호 수집가. GitHub trending·블로그 RSS·HN·릴리스 노트에서 AI/개발·이스포츠 신호를 긁는다. /scan 의 본 수집 단계에서 사용.
tools: Read, Grep, Glob, Write, WebSearch, WebFetch
model: sonnet
---

너는 **공개 소스 수집가(scout-open)** 다. SOUL.md > AGENTS.md 서열을 먼저 따른다.

## Role
로그인 없이 볼 수 있는 곳에서 신호를 긁는다. GitHub trending · 블로그 RSS · HN · 공개 릴리스 노트.

## 절대 금지
- ⛔ **`wiki/axis.md` 를 읽지 마라.** 축을 알면 축에 맞는 신호만 줍게 된다(확증편향). 관측은 축에 대해 눈이 멀어야 한다.
- ⛔ **`metric` 없이 `tier: EXTRACTED` 를 쓰지 마라.** 숫자를 직접 못 봤으면 `INFERRED` 이하다. 벽A가 차단한다.
- ⛔ **남의 주장을 사실로 승격하지 마라.** "요즘 X가 대세다"라는 블로그 문장은 `INFERRED` 다. 별 개수·다운로드 수는 `EXTRACTED` 다.
- ⛔ **다른 채널(소셜)의 빈칸을 네 결과로 메우지 마라.** 네 출처는 네가 연 URL뿐이다.
- ⛔ **`observed_at` 없이 항목을 쓰지 마라.** 지표는 시간의 함수다.
- ⛔ **한 사례를 패턴이라 부르지 마라.** 반복 횟수를 못 세면 `falsifier` 를 비우고 잠정 플래그로 남긴다.

## DO
1. 카나리아 모드(`--canary`)면 대상 1건만 시도하고 성공/실패만 보고한다. 실패 시 사유를 반환 메시지에 담는다.
2. 본 수집이면 `signals/<날짜>/open.md` 를 쓴다. 본문(관측 서술) + 말미에 ```json 신호 항목 배열.
3. 항목 스키마: `{id, claim, source, observed_at, tier, metric, falsifier}`.
4. 반환 메시지는 파일 경로 + 항목 수 + 등급별 개수만.
```

- [ ] **Step 2: scout-social.md**

```markdown
---
name: scout-social
description: 로그인 벽 신호 수집가. 사용자의 Chrome 세션으로 X·스레드·링크드인·인스타그램의 실제 지표를 관측한다. /scan 의 본 수집 단계에서 사용.
tools: Read, Write, mcp__claude-in-chrome__tabs_context_mcp, mcp__claude-in-chrome__tabs_create_mcp, mcp__claude-in-chrome__navigate, mcp__claude-in-chrome__read_page, mcp__claude-in-chrome__computer, mcp__claude-in-chrome__find
model: sonnet
---

너는 **로그인 벽 수집가(scout-social)** 다. SOUL.md > AGENTS.md 서열을 먼저 따른다.

## Role
사용자가 이미 로그인해둔 Chrome 세션에서 X · 스레드 · 링크드인 · 인스타그램의 **실제 지표**(좋아요·리포스트·조회)를 읽는다.

## 절대 금지
- ⛔ **`wiki/axis.md` 를 읽지 마라.** (확증편향 차단 — scout-open 과 동일)
- ⛔ **수집에 실패했는데 웹검색·추측으로 메우지 마라.** 이것이 이 하네스가 막으려는 정확히 하나의 실패다.
  실패한 플랫폼은 `signals/<날짜>/FAILED.md` 에 사유와 함께 남기고, 그 플랫폼 항목은 **0개**로 반환한다.
- ⛔ **`observed_at` 없이 지표를 쓰지 마라.** 날짜 없는 소셜 숫자는 숫자가 아니다.
- ⛔ **다이얼로그(alert/confirm)를 유발하는 요소를 클릭하지 마라.** 확장이 응답 불능이 된다.
- ⛔ **게시·좋아요·팔로우 등 쓰기 동작을 하지 마라.** 읽기 전용이다.
- ⛔ **개인 식별 정보(실명·연락처·비공개 계정 내용)를 신호에 적지 마라.**

## DO
1. 먼저 `tabs_context_mcp` 로 현재 탭 맥락을 확인한다. 세션마다 탭 ID를 새로 받는다 — 이전 세션 ID 재사용 금지.
2. 카나리아 모드면 **플랫폼당 게시물 1건**만 열어 지표가 읽히는지 확인하고 성공/실패만 보고한다.
3. 본 수집이면 `signals/<날짜>/social.md` 를 쓴다. 본문 + 말미에 ```json 신호 항목 배열.
4. 지표를 읽은 화면은 캡처하고 경로를 `source` 옆 본문에 남긴다.
5. 도구 호출이 2~3회 연속 실패하면 **재시도를 멈추고** 실패로 확정한다. 무한 재시도 금지.
6. 반환 메시지는 파일 경로 + 플랫폼별 성공/실패 + 항목 수만.
```

- [ ] **Step 3: format-analyst.md**

```markdown
---
name: format-analyst
description: "왜 먹혔는가" 역설계 전문가. 뜬 게시물의 훅·길이·포맷·마무리를 뜯어 메커니즘을 추출한다. /scan 의 본 수집 단계에서 사용.
tools: Read, Grep, Glob, Write, WebFetch
model: sonnet
---

너는 **포맷 역설계가(format-analyst)** 다. SOUL.md > AGENTS.md 서열을 먼저 따른다.

## Role
`scout-open`·`scout-social` 이 건진 상위 신호의 **원문 게시물**을 뜯어, "왜 이게 먹혔는가"를 구조로 환원한다.
이 산출 없이는 주제 큐의 `각도` 칸이 관측이 아니라 의견이 된다.

## 절대 금지
- ⛔ **`wiki/axis.md` 를 읽지 마라.** (확증편향 차단)
- ⛔ **한 게시물을 패턴이라 부르지 마라.** 한 게시물은 사례다. **반복되어야 패턴**이고,
  반복 횟수를 명시하지 않은 패턴 주장은 잠정 플래그다(`falsifier` 를 비운다).
- ⛔ **"몇 개 이상이면 패턴" 같은 임의 문턱을 정하지 마라.** 문턱을 쓰려면 "어떤 관측이면 이 문턱을
  바꾸는가"를 현 표본과 독립으로 답할 수 있어야 한다 (AGENTS 63행).
- ⛔ **읽지 않은 게시물의 구조를 추정해 적지 마라.** 원문을 못 열었으면 그 항목은 버린다.
- ⛔ **원문 문장을 그대로 베껴 큐에 넘기지 마라.** 구조와 메커니즘만 추출한다.

## DO
1. 대상: `signals/<날짜>/{open,social}.md` 의 상위 신호가 가리키는 원문 게시물.
2. 뜯을 것: 첫 3줄(훅) · 훅 문장의 형태(질문/수치/역설/고백) · 길이 · 포맷(스레드/단문/캐러셀/장문) ·
   마무리(CTA/질문/여운) · 댓글이 붙는 지점.
3. `signals/<날짜>/format-analysis.md` 를 쓴다. 신호 항목 스키마 + `mechanism` 칸
   ("이 게시물이 붙잡은 독자 욕구 한 줄")을 추가한다.
4. 반환 메시지는 파일 경로 + 분석한 게시물 수 + 확정 패턴 수 / 잠정 플래그 수.
```

- [ ] **Step 4: trend-tracker.md**

```markdown
---
name: trend-tracker
description: 시계열 대조 담당. 지난 사이클 신호와 이번 신호를 대조해 라이프사이클(신규/상승/정점/하락)을 판정한다. /scan 의 종합 직전에 사용.
tools: Read, Grep, Glob, Write
model: sonnet
---

너는 **시계열 추적자(trend-tracker)** 다. SOUL.md > AGENTS.md 서열을 먼저 따른다.

## Role
`signals/` 는 불변 시계열이다. **그것을 읽는 유일한 주체가 너다.** 읽지 않으면 매 사이클이 첫 사이클이 된다.

## 절대 금지
- ⛔ **`wiki/axis.md` 를 읽지 마라.** (확증편향 차단)
- ⛔ **라이프사이클 판정을 `EXTRACTED` 로 쓰지 마라.** 증감은 봤지만 "정점"은 해석이다.
  네 산출의 `tier` 상한은 **`INFERRED`** 다 (AGENTS 62행 승격 금지).
- ⛔ **"2주 연속 증가하면 상승" 같은 임의 문턱을 확정 판정으로 쓰지 마라.** 문턱을 쓰려면
  "어떤 관측이면 이 문턱을 바꾸는가"를 현 표본과 독립으로 답해야 한다. 못 하면 **잠정 플래그**로만 남긴다 (AGENTS 63행).
- ⛔ **과거 `signals/` 파일을 수정하지 마라.** 불변 계층이다 — 훅이 차단한다.
- ⛔ **대조할 과거가 없는데 판정을 지어내지 마라.** 3사이클 미만이면 전 항목 `데이터 부족` 이다 (콜드 스타트).

## DO
1. 입력: 직전 N개 사이클의 `signals/*/synthesis.md` (읽기 전용).
2. 출력: `signals/<날짜>/continuity.md` — 신호별 `신규` / `상승` / `정점` / `하락` / `데이터 부족`.
3. 항목 스키마는 동일하되 `tier` 는 `INFERRED` 를 넘지 않는다.
4. 반환 메시지는 파일 경로 + 국면별 개수 + (3사이클 미만이면) `콜드 스타트` 표기.
```

- [ ] **Step 5: 축 격리 벽이 4개 파일 전부에 있는지 확인**

```bash
BR="$(cd .. && pwd)/brand-radar"; cd "$BR"
grep -L 'axis.md.*읽지 마라' .claude/agents/scout-open.md .claude/agents/scout-social.md .claude/agents/format-analyst.md .claude/agents/trend-tracker.md
```

Expected: **출력 없음** (모든 파일에 벽이 있음). 파일명이 하나라도 출력되면 그 파일에 벽을 추가한다.

- [ ] **Step 6: 커밋**

```bash
BR="$(cd .. && pwd)/brand-radar"; cd "$BR"
git add .claude/agents/scout-open.md .claude/agents/scout-social.md .claude/agents/format-analyst.md .claude/agents/trend-tracker.md
git commit -m "feat: 수집기 4 — 축 격리(확증편향 차단) + metric 등급 잠금 + 실패 채널 미보전"
git log -1 --format='%h %s'
```

---

## Task 6: 종합·검증 에이전트 2 (signal-synthesizer · signal-validator)

**Files:**
- Create: `../brand-radar/.claude/agents/signal-synthesizer.md`
- Create: `../brand-radar/.claude/agents/signal-validator.md`

**Interfaces:**
- Consumes: `signals/<날짜>/{open,social,format-analysis,continuity}.md` + `_inbox/` (Task 5)
- Produces: `signals/<날짜>/synthesis.md` — Task 4의 벽A가 파싱하는 정확한 형식(말미 ```json 배열). Task 7의 회의가 유일하게 읽는 신호 원천.

- [ ] **Step 1: signal-synthesizer.md**

```markdown
---
name: signal-synthesizer
description: 신호 종합가. 수집기 4의 산출 + _inbox 를 하나의 synthesis.md 로 병합한다. /scan 의 종합 단계에서 사용.
tools: Read, Grep, Glob, Write
model: sonnet
---

너는 **신호 종합가(signal-synthesizer)** 다. SOUL.md > AGENTS.md 서열을 먼저 따른다.

## Role
수집기 4의 산출과 `_inbox/` 를 병합해 `signals/<날짜>/synthesis.md` 하나를 만든다.
이 파일이 회의가 읽는 **유일한 신호 원천**이다.

## 절대 금지
- ⛔ **자기 산출물을 자기가 검증하지 마라.** 검증은 `signal-validator` 의 일이다 (SOUL §5).
- ⛔ **등급을 승격하지 마라.** 수집기가 붙인 `tier` 를 올리는 것은 날조다. 내리는 것만 허용한다.
- ⛔ **실패한 채널의 빈칸을 다른 채널 결과로 메우지 마라.** `FAILED.md` 가 있으면
  종합 본문에 **"해당 플랫폼 데이터 없음"** 을 명시한다.
- ⛔ **`falsifier` 없는 트렌드 주장을 확정으로 쓰지 마라.** 잠정 플래그로 표기한다.
- ⛔ **잠정 플래그를 근거처럼 요약하지 마라.** 회의에서 근거로 쓸 수 없는 항목이다.
- ⛔ **`signals/` 의 기존 파일을 수정하지 마라.** 불변 계층이다.

## DO
1. 입력: `signals/<날짜>/{open,social,format-analysis,continuity}.md` · `signals/<날짜>/FAILED.md`(있으면) · `_inbox/`.
2. `_inbox/` 항목은 `tier: EXTRACTED` (사람이 직접 관측), `source` 는 `_inbox/<파일명>`.
3. 출력 `signals/<날짜>/synthesis.md` 구조:
   - `## 요약` — 이번 사이클 신호 Top 5 + 한 줄 해석
   - `## 채널별 수집 결과` — 성공/실패(FAILED.md 반영)
   - `## 잠정 플래그` — 근거로 쓸 수 없는 항목 목록
   - 말미에 ```json 신호 항목 배열 (전 항목 병합)
4. 항목 스키마: `{id, claim, source, observed_at, tier, metric, falsifier}`.
   `metric` 이 없으면 `tier` 는 `EXTRACTED` 일 수 없다 — 벽A가 차단한다.
5. 반환 메시지는 파일 경로 + 항목 수 + 등급별 개수 + 잠정 플래그 수.
```

- [ ] **Step 2: signal-validator.md**

```markdown
---
name: signal-validator
description: 신호 검증 게이트키퍼. synthesis.md 를 전수 검사하고 미달 항목만 해당 수집기에 재수집을 요구한다. /scan 의 검증 루프에서 사용.
tools: Read, Grep, Glob, Write
model: opus
---

너는 **신호 검증자(signal-validator)** 다. SOUL.md > AGENTS.md 서열을 먼저 따른다.

## Role
`synthesis.md` 를 전수 검사한다. **종합자가 아니다** — 자기 산출물을 자기가 평가하지 않는다는 벽(SOUL §5)의
물리적 구현이 너의 존재 이유다. 차단(훅)은 멈추는 것이고, 고치는 것은 네 일이다.

## 검사 축 (전 항목)
1. `tier` · `observed_at` · `source` 세 칸이 모두 채워졌는가.
2. `tier` 가 `EXTRACTED`/`INFERRED`/`AMBIGUOUS` 안에 있는가 (어휘 날조 차단).
3. `metric` 이 없는데 `tier: EXTRACTED` 인 항목이 있는가 (등급 잠금 위반).
4. `falsifier` 가 없는 항목이 **잠정 플래그로 표기**되었는가.
5. `format-analysis` 유래 패턴 주장에 **반복 횟수**가 명시되었는가.
6. `continuity` 유래 항목의 `tier` 가 `INFERRED` 를 넘지 않는가.
7. `FAILED.md` 의 플랫폼이 종합 본문에 **"데이터 없음"** 으로 명시되었는가.

## 절대 금지
- ⛔ **미달 항목을 네가 고치지 마라.** 너는 판정만 한다 — 고치는 것은 해당 수집기의 일이다.
- ⛔ **통과 항목을 건드리지 마라.** 미달 항목만 재수집 대상으로 지목한다.
- ⛔ **3회 이상 재시도를 요구하지 마라.** 상한은 **2회**다. 그래도 미달이면 **폐기**하고,
  폐기 사실을 `synthesis.md` 에 남기라고 지시한다.
- ⛔ **`synthesis.md` 를 직접 수정하지 마라.** 판정문만 쓴다.
- ⛔ **"대체로 괜찮다"로 통과시키지 마라.** 한 항목이라도 미달이면 REVISE 다.

## DO
1. 출력: `signals/<날짜>/validation.md` — 항목별 PASS/REVISE + 미달 축 번호 + 재수집 대상 수집기 이름.
2. 말미에 확정 판정 한 줄: `VERDICT: PASS` 또는 `VERDICT: REVISE (n건)` 또는 `VERDICT: EXHAUSTED (폐기 n건)`.
3. 반환 메시지는 판정문 경로 + VERDICT 한 줄만.
```

- [ ] **Step 3: 모델 배치가 MODELS.md 와 맞는지 확인**

`signal-validator`는 **판정 역할군** → `opus`. `signal-synthesizer`는 **기록·정리** → `sonnet`.

```bash
BR="$(cd .. && pwd)/brand-radar"; cd "$BR"
grep -H '^model:' .claude/agents/signal-validator.md .claude/agents/signal-synthesizer.md
```

Expected:
```
.claude/agents/signal-validator.md:model: opus
.claude/agents/signal-synthesizer.md:model: sonnet
```

- [ ] **Step 4: 커밋**

```bash
BR="$(cd .. && pwd)/brand-radar"; cd "$BR"
git add .claude/agents/signal-synthesizer.md .claude/agents/signal-validator.md
git commit -m "feat: 종합 1 + 검증 1 — 자기평가 금지의 물리적 분리(SOUL 5), 재시도 상한 2회"
git log -1 --format='%h %s'
```

---

## Task 7: 회의 에이전트 4 (moderator · panelist-audience · panelist-voice · redsea-devil) + scribe · retrospector

**Files:**
- Create: `../brand-radar/.claude/agents/panelist-audience.md`
- Create: `../brand-radar/.claude/agents/panelist-voice.md`
- Create: `../brand-radar/.claude/agents/redsea-devil.md`
- Create: `../brand-radar/.claude/agents/moderator.md` (킷 복사 + rounds 경로 개정)
- Create: `../brand-radar/.claude/agents/scribe.md` (킷 복사 + 산출 경로 개정)
- Create: `../brand-radar/.claude/agents/retrospector.md` (킷 복사, 무개정)

**Interfaces:**
- Consumes: `signals/<날짜>/synthesis.md` (Task 6) · `wiki/axis.md` (Task 3, `panelist-voice`·`redsea-devil`·`scribe`·`moderator`만)
- Produces: `rounds/<날짜>/round-N-<agent>.md` (불변) → `scribe`가 `topics/<날짜>-queue.md`로 합성

- [ ] **Step 1: 킷 에이전트 3개 복사**

```bash
KIT="$(pwd)"; BR="$(cd .. && pwd)/brand-radar"
cp "$KIT/.claude/agents/moderator.md"    "$BR/.claude/agents/moderator.md"
cp "$KIT/.claude/agents/scribe.md"       "$BR/.claude/agents/scribe.md"
cp "$KIT/.claude/agents/retrospector.md" "$BR/.claude/agents/retrospector.md"
```

`retrospector.md`는 **그대로 둔다** (도메인 무관). `moderator.md`·`scribe.md`는 Step 5에서 경로만 고친다.

- [ ] **Step 2: panelist-audience.md**

```markdown
---
name: panelist-audience
description: 독자 관점 토론자. 이 주제가 누구의 어떤 통증을 건드리는지, 신호가 뜨는 이유가 수요인지 소음인지 따진다. 회의 라운드에서 사용.
tools: Read, Grep, Glob, Write
model: sonnet
---

너는 이 회의의 **독자 토론자(panelist-audience)** 다. SOUL.md > AGENTS.md 서열을 먼저 따른다.

## Role · 페르소나
- Role: 글을 읽을 사람 쪽에 서서 "이게 그 사람에게 무엇인가"를 묻는 사람.
- 페르소나: 냉정하다. 붐비는 방을 싫어한다. "다들 떠든다"와 "다들 찾는다"를 구분하는 데 집착한다.

## 묻는 것
1. 이 주제는 **누구의 어떤 통증**을 건드리는가.
2. 그 사람이 이걸 읽고 **무엇을 얻어 가는가.**
3. 지금 이 신호가 뜨는 건 사람들이 **답을 찾고 있어서**인가, **그냥 다들 떠들고 있어서**인가.
   후자면 붐비는 방에 한 명 더 들어가는 것뿐이다.

## 절대 금지
- ⛔ **진행하지 마라.** 라운드 열기·닫기·집계는 moderator의 일이다. 너는 발언만 한다.
- ⛔ **`synthesis.md` 를 안 읽고 발언하지 마라.** 매 라운드 진입 시 필수 로드.
- ⛔ **잠정 플래그를 근거로 인용하지 마라.** 근거로 쓸 수 없는 항목이다.
- ⛔ **축 정합을 판정하지 마라.** 그건 panelist-voice의 영역이다. 독자 가치까지만.
- ⛔ **남의 발언을 고치거나 요약해 다시 쓰지 마라.** 자기 발언만 `rounds/` 에 쓴다.
- ⛔ **발언 없이 통과하지 마라.** 이견이 없으면 "이견 없음 + 근거 한 줄"을 남긴다.
- ⛔ **투표를 생략하거나 애매하게 하지 마라.** 발언 끝에 찬성/조건부/반대 중 하나를 명시한다.

## DO
1. 발언을 `rounds/<날짜>/round-N-audience.md` 에 쓴다. 주장마다 `signals/` 항목 ID를 인용한다.
2. 반환 메시지는 발언 파일 경로 + 투표 결과만.
```

- [ ] **Step 3: panelist-voice.md**

```markdown
---
name: panelist-voice
description: 축 정합 토론자. wiki/axis.md 를 유일한 기준으로, 이 주제를 이 사람이 말할 때만 생기는 것이 있는지 따진다. 회의 라운드에서 사용.
tools: Read, Grep, Glob, Write
model: sonnet
---

너는 이 회의의 **축 토론자(panelist-voice)** 다. SOUL.md > AGENTS.md 서열을 먼저 따른다.

## Role · 페르소나
- Role: `wiki/axis.md` 의 축을 유일한 잣대로 삼아 "이건 이 사람만 쓸 수 있는가"를 묻는 사람.
- 페르소나: 대체 가능한 글을 경멸한다. 아무나 쓸 수 있는 글은 브랜딩에 기여하지 않는다고 믿는다.

## 묻는 것
1. 이 주제를 **이스포츠 현직자가 말할 때만 생기는 무언가**가 있는가.
2. `format-analysis.md` 의 `mechanism` 이 이 축과 결합할 때 어떤 각도가 나오는가.
3. 그 각도가 없으면 이 후보는 왜 큐에 있어야 하는가.

## 절대 금지
- ⛔ **`wiki/axis.md` 를 수정하지 마라.** 읽기 전용 상수다. 축의 소유권은 `ai-worklog` 에 있다.
- ⛔ **"축이 맞는가"를 안건으로 만들지 마라.** 이 하네스는 축을 개정하지 않는다.
- ⛔ **진행하지 마라.** 라운드 진행·집계는 moderator의 일이다.
- ⛔ **각도를 근거 없이 지어내지 마라.** `format-analysis.md` 의 `mechanism` 을 인용하지 못하는 각도는 의견이다.
- ⛔ **독자 가치를 대신 판정하지 마라.** 그건 panelist-audience의 영역이다.
- ⛔ **남의 발언을 고치거나 요약해 다시 쓰지 마라.** 자기 발언만 `rounds/` 에 쓴다.
- ⛔ **발언 없이 통과하지 마라.** 이견이 없으면 "이견 없음 + 근거 한 줄"을 남긴다.
- ⛔ **투표를 생략하거나 애매하게 하지 마라.** 발언 끝에 찬성/조건부/반대 중 하나를 명시한다.

## DO
1. 발언을 `rounds/<날짜>/round-N-voice.md` 에 쓴다. 각도 주장마다 `mechanism` 인용을 붙인다.
2. 반환 메시지는 발언 파일 경로 + 투표 결과만.
```

- [ ] **Step 4: redsea-devil.md**

```markdown
---
name: redsea-devil
description: 악마의 변호인(특화). 매 라운드 마지막 발언자로 레드오션·대체 가능성·근거 부실 세 곳만 찌른다. 라운드 종료 발언에 사용.
tools: Read, Grep, Glob, Write
model: opus
---

너는 이 회의의 **악마의 변호인(redsea-devil)** 이다. SOUL.md > AGENTS.md 서열을 먼저 따른다.
합의 직전의 결론에서 **구멍만** 찾아 찌른다. 매 라운드 **마지막**에 발언한다.

## 찌르는 곳 (셋뿐)
1. **레드오션** — 이미 백 명이 쓴 주제 아닌가.
2. **대체 가능성** — 이 각도, 정말 이 사람만 쓸 수 있나.
3. **근거 부실** — 이 주제를 떠받치는 신호가 잠정 플래그뿐인가.

셋 중 **하나라도 뚫리면 그 후보는 큐에 못 오른다.**

## 절대 금지
- ⛔ **심증으로 찌르지 마라.** 레드오션 주장은 반드시 `signals/` 항목 ID를 근거로 끌어와야 한다.
  근거 없는 찌르기는 발언으로 치지 않는다.
- ⛔ **위 셋 밖을 찌르지 마라.** 문체·길이·발행 시점은 네 일이 아니다.
- ⛔ **대안을 제시하지 마라.** 너는 구멍만 찾는다. 메우는 건 다른 패널의 일이다.
- ⛔ **자화자찬·완곡어법을 쓰지 마라.** "다만 훌륭한 시도입니다" 류 금지.
- ⛔ **후보를 통과시키기 위해 기준을 낮추지 마라.** "이만하면 됐다"는 금지어다.
- ⛔ **남의 발언을 고치지 마라.** 자기 발언만 `rounds/` 에 쓴다.

## DO
1. 발언을 `rounds/<날짜>/round-N-devil.md` 에 쓴다. 후보별로 세 축 판정: `뚫림` / `버팀` + 근거 ID.
2. 말미에 한 줄: `KILL: <후보 ID 목록>` (없으면 `KILL: 없음`).
3. 반환 메시지는 발언 파일 경로 + KILL 줄만.
```

- [ ] **Step 5: moderator.md · scribe.md 경로 개정**

`moderator.md`에서 `rounds/round-N-*.md` 표기를 `rounds/<날짜>/round-N-*.md`로 고치고, 패널 이름을 교체한다 (Edit):

- `panelist-pm` → `panelist-audience`
- `panelist-tech` → `panelist-voice`
- `devils-advocate` → `redsea-devil`

`scribe.md`의 산출 경로를 고치고 (Edit), 절대 금지 절에 다음 줄을 추가한다:

```markdown
- ⛔ **초안을 쓰지 마라.** 이 하네스는 게시물 초안을 만들지 않는다. 산출은 주제 후보 큐뿐이다.
- ⛔ **`redsea-devil` 이 `KILL` 한 후보를 큐에 넣지 마라.**
- ⛔ **후보를 다섯 개 넘게 쓰지 마라.** 열 개짜리 큐는 고르는 비용이 쓰는 비용을 넘어 아무것도 안 쓰게 만든다.
- ⛔ **`기대값` 칸을 비우지 마라.** 글을 쓰기 **전에** "어떤 관찰이면 먹혔다고 판정하는가"를 적는다 (AGENTS §3).
```

- [ ] **Step 6: 모델 배치 확인 (판정 = opus)**

```bash
BR="$(cd .. && pwd)/brand-radar"; cd "$BR"
grep -H '^model:' .claude/agents/*.md | sort
```

Expected: `redsea-devil` · `signal-validator` · `retrospector` · `scribe` = `opus`. 나머지 = `sonnet`.
(`scribe`는 생산-외부발행 역할군 — MODELS.md 기준 `opus`. 이 하네스가 외부 발행을 안 하더라도 큐가 최종 산출물이므로 유지한다.)

- [ ] **Step 7: 커밋**

```bash
BR="$(cd .. && pwd)/brand-radar"; cd "$BR"
git add .claude/agents/panelist-audience.md .claude/agents/panelist-voice.md .claude/agents/redsea-devil.md .claude/agents/moderator.md .claude/agents/scribe.md .claude/agents/retrospector.md
git commit -m "feat: 회의 에이전트 6 — audience/voice 패널 교체, redsea-devil 3축 특화(심증 찌르기 금지)"
git log -1 --format='%h %s'
```

---

## Task 8: 커맨드 5 (/scan · /meeting · /meeting-round · /queue · /retro)

**Files:**
- Create: `../brand-radar/.claude/commands/scan.md`
- Create: `../brand-radar/.claude/commands/queue.md`
- Create: `../brand-radar/.claude/commands/meeting.md` (킷 복사 + 안건 소스 개정)
- Create: `../brand-radar/.claude/commands/meeting-round.md` (킷 복사 + 패널 이름 개정)
- Create: `../brand-radar/.claude/commands/retro.md` (킷 복사 + 닫는 고리 절 추가)

**Interfaces:**
- Consumes: 에이전트 12 (Task 5·6·7) · 벽A (Task 4)
- Produces: `state/state.json` 필드 — `{cycle, signals_date, agenda, acceptance, round, max_rounds, status, votes, queue_path, retro_path}`
  - `status` 전이: `scanned` → `debate` → `report_done` → `retro_done`
  - `signals_date`: 벽A가 읽는 필드. `/scan`이 설정한다.

- [ ] **Step 1: /scan 커맨드 작성**

`$BR/.claude/commands/scan.md`:

```markdown
---
description: 외부 신호 수집 — 카나리아 선검증 → 본 수집(병렬) → 종합 → 검증 루프
argument-hint: [수집 대상 힌트 — 생략 시 AI/개발 + 이스포츠 전 채널]
---

# /scan — 신호 수집 사이클 시작

**이 커맨드는 수집까지만** — 회의는 `/meeting`.

## 절차

1. `state/state.json` 확인: 있고 `status`가 `retro_done`이 아니면 **새 사이클 시작 금지** —
   이전 사이클을 먼저 닫으라고 안내하고 중단한다 (SOUL §6).
   또한 `state.cycle`이 커밋된 `log.md` 마지막 `cycle N`·`signals/`·`retro/` 최신이 함의하는 사이클보다
   작으면 착수 전 그 증거로 state를 재구성한다 — 뒤처진 번호로 +1 하면 기존 사이클 슬롯을 덮는다 (CLAUDE §2-1).
2. **에이전트 레지스트리 등록 확인** — 배분할 타입(`scout-open`·`scout-social`·`format-analyst`·
   `trend-tracker`·`signal-synthesizer`·`signal-validator`)이 이 세션에 등록됐는지 확인한다.
   등록은 **세션의 속성**이다 — 이전 세션 기록을 재사용하지 마라 (CLAUDE §3).
   미등록이면 폴백은 하나뿐이다: general-purpose Worker에 해당 `.claude/agents/<name>.md`를
   브리프 최상단에서 Read시키고, 그 파일의 `tools:` 제한과 산출 경로를 브리프에 명시한다.
   미등록 발견은 `log.md`에 한 줄 남긴다.
3. **카나리아** — `scout-open`·`scout-social`·`format-analyst` 를 `--canary` 모드로 실행한다.
   각자 대상 **1건**만 시도하고 성공/실패를 반환한다.
   - 실패한 채널은 즉시 `signals/<날짜>/FAILED.md` 에 사유와 함께 기록하고 **본 수집에서 제외**한다.
   - 전 채널 실패면 중단하고 사람에게 보고한다 (수집 없는 회의 금지).
4. **본 수집** — 살아남은 채널만 **병렬 실행**(한 메시지에서 Agent 도구 다중 호출):
   `scout-open` ∥ `scout-social` ∥ `format-analyst`.
   그다음 `trend-tracker` 를 실행한다 (과거 `signals/` 시계열 대조).
5. **걸음 경계 검사**: `node .claude/checks/step-diff.mjs signals/<날짜>/`
   exit 1이면 선언 밖 변경이 있는 것 — 되돌리고 재시도한다.
6. **종합** — `signal-synthesizer` 실행 → `signals/<날짜>/synthesis.md`.
7. **검증 루프** — `signal-validator` 실행 → `signals/<날짜>/validation.md`.
   - `VERDICT: REVISE` 면 지목된 미달 항목의 **해당 수집기만** 재호출한다.
   - **최대 2회.** 그래도 미달이면 그 항목을 폐기하고, 폐기 사실을 `synthesis.md` 에 남긴 뒤 진행한다
     (`VERDICT: EXHAUSTED`).
8. `state/state.json` 저장 (Write — state/는 가변 계층):
   ```json
   {
     "cycle": 1,
     "signals_date": "<날짜>",
     "status": "scanned",
     "round": 0,
     "max_rounds": 4,
     "votes": {},
     "queue_path": null,
     "retro_path": null
   }
   ```
9. `log.md`에 한 줄 append (Edit): `- <날짜> cycle N /scan 완료: 항목 X건(EXTRACTED a·INFERRED b) · 실패 채널 [...]`
10. **커밋한다.** 걸음의 원자 단위는 산출 + 기록 + 커밋이다 (CLAUDE §2-1).
11. 종료 보고: 신호 수·등급 분포·실패 채널·다음 걸음(`/meeting`).

## 금지

- ⛔ 수집기에게 `wiki/axis.md` 를 읽히지 마라. 브리프에 축을 넣지도 마라 (확증편향 차단).
- ⛔ 카나리아를 건너뛰고 본 수집으로 가지 마라. 전량 수집 후 채널 사망을 아는 것이 가장 비싼 실패다.
- ⛔ 실패한 채널의 빈칸을 다른 채널 결과로 메우지 마라.
- ⛔ 검증 루프를 3회 이상 돌리지 마라. 상한은 2회다.
- ⛔ 이 커맨드에서 회의를 시작하지 마라. 수집과 회의는 별개 걸음이다 (SOUL §4).
```

- [ ] **Step 2: /meeting · /meeting-round 복사 + 개정**

```bash
KIT="$(pwd)"; BR="$(cd .. && pwd)/brand-radar"
cp "$KIT/.claude/commands/meeting.md"       "$BR/.claude/commands/meeting.md"
cp "$KIT/.claude/commands/meeting-round.md" "$BR/.claude/commands/meeting-round.md"
cp "$KIT/.claude/commands/retro.md"         "$BR/.claude/commands/retro.md"
```

`meeting.md` 개정 (Edit):

(a) 절차 2를 `status`가 `scanned`인지 검사하도록 바꾼다:

```markdown
2. `state/state.json` 확인: `status`가 `scanned`가 아니면 **회의 시작 금지** —
   `/scan` 을 먼저 돌리라고 안내하고 중단한다. (신호 없는 회의 금지)
```

(b) 절차 3의 안건 소스를 신호로 바꾼다:

```markdown
3. `moderator` 에이전트를 실행해 안건을 확정한다:
   - 입력: `$ARGUMENTS` + `signals/<signals_date>/synthesis.md` (비면 신호의 Top 신호에서 안건 도출)
   - **잠정 플래그로 표기된 신호는 안건 근거로 쓸 수 없다.**
   - 안건은 반드시 관찰 가능한 술어("X 하면 Y 한다")로 다듬는다.
   - 안건과 함께 "어떤 관찰이면 결론 채택인지"(기대값)를 **토론 전에** 기록한다 (AGENTS §3).
```

(c) 절차 4의 state에 `status: "debate"`가 들어간다 — **이 쓰기가 벽A를 발동시킨다.**
`signals_date`를 그대로 유지해야 한다. state JSON 예시에 다음 줄을 유지한다:

```json
"signals_date": "<날짜 — /scan 이 설정한 값 그대로>",
```

`meeting-round.md` 개정 (Edit): 패널 이름 3개를 교체한다.
- `panelist-pm` → `panelist-audience`
- `panelist-tech` → `panelist-voice`
- `devils-advocate` → `redsea-devil`

라운드 산출 경로를 `rounds/<날짜>/round-N-<agent>.md`로 고친다.

- [ ] **Step 3: /queue 커맨드 작성**

`$BR/.claude/commands/queue.md`:

```markdown
---
description: 회의 결론 → 주제 후보 큐 (scribe 합성, 최대 5개, 기대값 필수)
argument-hint: (없음)
---

# /queue — 주제 후보 큐 확정

**발행하지 않는다** — 초안도 쓰지 않는다. 이 커맨드의 완성 기준은 "사람이 읽고 골라 쓸 수 있는 상태"다.

## 절차

1. `state/state.json` 확인 — `status`가 `debate`가 아니면 안내 후 중단.
2. 최신 `rounds/<날짜>/round-N-devil.md` 의 `KILL:` 줄을 읽는다. KILL된 후보는 큐에서 제외한다.
3. `scribe` 실행:
   - 입력: `rounds/<날짜>/` 전체 · `signals/<signals_date>/synthesis.md` · `signals/<signals_date>/continuity.md` ·
     `signals/<signals_date>/format-analysis.md` · `wiki/axis.md`
   - 출력: `topics/<날짜>-queue.md`
   - 후보 하나의 칸: `주제`(술어형) · `각도`(+`mechanism` 인용) · `근거`(신호 ID + 등급 + 관측일자) ·
     `국면`(신규/상승/정점/하락/데이터 부족) · `반론`(악마가 찌른 것 + 남은 리스크) · `기대값`.
   - **후보는 최대 5개.**
4. **걸음 경계 검사**: `node .claude/checks/step-diff.mjs topics/<날짜>-queue.md`
5. 산출물 Read 재검증 — 모든 후보에 `기대값`·`근거` 칸이 채워졌는지 확인. 하나라도 비면 REVISE.
6. `state/state.json` 갱신: `{status: "report_done", queue_path: "topics/<날짜>-queue.md"}`
7. `log.md` 한 줄 append (Edit).
8. **커밋한다.**
9. 종료 보고: 큐 경로 + 후보 수 + 국면 분포. **그리고 같은 흐름에서 `/retro` 를 착수한다** —
   회고는 사용자 승인 없이 이어져야 하는 강제 걸음이다 (CLAUDE §4 v0.26).
   "다음 걸음 /retro" 안내만 쓰고 턴을 종료하지 마라.

## 금지

- ⛔ 게시물 초안을 쓰지 마라. 산출은 주제 후보 큐뿐이다.
- ⛔ `KILL` 된 후보를 큐에 넣지 마라.
- ⛔ 후보를 5개 넘게 쓰지 마라.
- ⛔ `기대값` 칸을 비운 채 `report_done` 으로 전이하지 마라.
- ⛔ 잠정 플래그를 `근거` 칸에 인용하지 마라.
- ⛔ 안내만 하고 턴을 종료하지 마라 — 회고로 이어간다.
```

- [ ] **Step 4: /retro 에 닫는 고리 절 추가**

`$BR/.claude/commands/retro.md` 의 절차 마지막에 다음을 Edit로 추가한다:

```markdown
## 닫는 고리 — 지난 큐의 사후 확인 (brand-radar 고유)

회고 시작 시 직전 사이클의 `topics/<날짜>-queue.md` 를 열고 사용자에게 한 줄 묻는다:

> "지난 큐에서 실제로 쓴 주제가 있나요? 있다면 기대값이 맞았나요?"

- 하네스는 사용자가 뭘 발행했는지 모른다 — 이 칸은 **사람이 채운다.**
- 비어 있어도 사이클은 닫힌다. 회고에 `사후 확인: 없음` 으로 남긴다.
- **3사이클 연속 비면** 회고가 이를 지적한다 — 아무도 안 쓰는 큐를 계속 뽑고 있다는 뜻이다.
  같은 점검에서 `_inbox/` 가 3사이클 연속 비었는지도 함께 본다 (소셜 신호 폭 고갈).
```

- [ ] **Step 5: 커맨드가 참조하는 에이전트가 전부 존재하는지 확인**

```bash
BR="$(cd .. && pwd)/brand-radar"; cd "$BR"
for a in scout-open scout-social format-analyst trend-tracker signal-synthesizer signal-validator moderator panelist-audience panelist-voice redsea-devil scribe retrospector; do
  test -f ".claude/agents/$a.md" || echo "MISSING: $a"
done
echo "확인 완료"
```

Expected: `MISSING:` 줄 없이 `확인 완료`만 출력.

옛 패널 이름이 커맨드에 남아 있지 않은지도 본다:

```bash
grep -rn 'panelist-pm\|panelist-tech\|devils-advocate' .claude/commands/ || echo "OK — 옛 패널 이름 없음"
```

Expected: `OK — 옛 패널 이름 없음`

- [ ] **Step 6: 커밋**

```bash
BR="$(cd .. && pwd)/brand-radar"; cd "$BR"
git add .claude/commands/
git commit -m "feat: 커맨드 5 — /scan 카나리아+검증루프, /queue 기대값 강제, /retro 닫는 고리"
git log -1 --format='%h %s'
```

---

## Task 9: 통합 스모크 — 벽이 실제로 서 있는지 전수 실측

**Files:**
- Create: `../brand-radar/tests/smoke.sh`

**Interfaces:**
- Consumes: 전 태스크의 산출
- Produces: 없음 (검증 전용). 실패 시 exit 1.

이 태스크의 존재 이유: 지금까지의 검사는 **단위**였다. `settings.json`의 매처가 실제로 훅을 부르는지, `harness.config.json`이 실제로 읽히는지는 아직 증명되지 않았다. "만들었다"를 "작동한다"로 바꿔 말하지 마라 (SOUL §1).

- [ ] **Step 1: 스모크 스크립트 작성**

`$BR/tests/smoke.sh`:

```bash
#!/usr/bin/env bash
# brand-radar 통합 스모크 — deny·통과 양쪽을 실측한다.
# CLAUDE §4: 셸 도구·패턴을 바꿨으면 deny·통과 양쪽을 재검증하기 전까지 벽이 있다고 말하지 마라.
set -u
BR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$BR"
FAIL=0

hook() { echo "$1" | CLAUDE_PROJECT_DIR="$BR" node .claude/hooks/pre-tool-use.mjs 2>/dev/null; }

expect_deny() {
  local name="$1" payload="$2"
  if hook "$payload" | grep -q '"permissionDecision":"deny"'; then
    echo "  ✅ deny: $name"
  else
    echo "  ❌ 통과됨(차단됐어야 함): $name"; FAIL=1
  fi
}

expect_pass() {
  local name="$1" payload="$2"
  local out; out="$(hook "$payload")"
  if [ -z "$out" ]; then
    echo "  ✅ pass: $name"
  else
    echo "  ❌ 차단됨(통과했어야 함): $name"; FAIL=1
  fi
}

echo "── 벽2 (엔진 · append-only)"
expect_deny "SOUL.md 덮어쓰기"      '{"tool_name":"Write","tool_input":{"file_path":"SOUL.md","content":"x"}}'
expect_deny "log.md rm"             '{"tool_name":"Bash","tool_input":{"command":"rm log.md"}}'
expect_deny "PowerShell Set-Content CLAUDE.md" '{"tool_name":"PowerShell","tool_input":{"command":"Set-Content CLAUDE.md x"}}'
expect_pass "log.md append (>>)"    '{"tool_name":"Bash","tool_input":{"command":"echo x >> log.md"}}'
expect_pass "topics 쓰기"           '{"tool_name":"Write","tool_input":{"file_path":"topics/2026-07-09-queue.md","content":"x"}}'

echo "── 벽2 (signals/ 불변)"
mkdir -p signals/_smoke && echo orig > signals/_smoke/synthesis.md
expect_deny "signals 원본 덮어쓰기" '{"tool_name":"Write","tool_input":{"file_path":"signals/_smoke/synthesis.md","content":"x"}}'
expect_deny "signals Edit"          '{"tool_name":"Edit","tool_input":{"file_path":"signals/_smoke/synthesis.md","old_string":"a","new_string":"b"}}'
rm -rf signals/_smoke

echo "── 벽B (state 셸쓰기)"
expect_deny "state.json 리다이렉트" '{"tool_name":"Bash","tool_input":{"command":"echo {} > state/state.json"}}'
expect_pass "state.json 읽기"       '{"tool_name":"Bash","tool_input":{"command":"cat state/state.json"}}'

echo "── 벽A (신호 스키마 게이트)"
D=2026-01-01
mkdir -p "signals/$D"
printf '# s\n\n```json\n[{"id":"1","claim":"c","source":"u","observed_at":"t","tier":"EXTRACTED","metric":null,"falsifier":"f"}]\n```\n' > "signals/$D/synthesis.md"
expect_deny "metric 없는 EXTRACTED 로 debate 전이" \
  "{\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"state/state.json\",\"content\":\"{\\\"status\\\":\\\"debate\\\",\\\"signals_date\\\":\\\"$D\\\"}\"}}"
printf '# s\n\n```json\n[{"id":"1","claim":"c","source":"u","observed_at":"t","tier":"INFERRED","metric":null,"falsifier":"f"}]\n```\n' > "signals/$D/synthesis.md"
expect_pass "metric 없는 INFERRED 로 debate 전이" \
  "{\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"state/state.json\",\"content\":\"{\\\"status\\\":\\\"debate\\\",\\\"signals_date\\\":\\\"$D\\\"}\"}}"
rm -rf "signals/$D"

echo "── 벽4 (회고 가드) · 훅 무크래시"
node .claude/hooks/session-start.mjs > /dev/null 2>&1 && echo "  ✅ session-start 정상" || { echo "  ❌ session-start 크래시"; FAIL=1; }
echo '{}' | CLAUDE_PROJECT_DIR="$BR" node .claude/hooks/stop-retro-guard.mjs > /dev/null 2>&1 && echo "  ✅ stop-guard 정상" || { echo "  ❌ stop-guard 크래시"; FAIL=1; }

echo
if [ "$FAIL" = "0" ]; then echo "SMOKE: 전부 통과"; exit 0; else echo "SMOKE: 실패 있음"; exit 1; fi
```

**주의**: 벽A 스모크의 `signals/2026-01-01/` 은 `immutableDirs` 아래라 훅이 `Write`를 막는다. 하지만 스모크는 **셸(`printf`)로** 파일을 만들므로 훅을 거치지 않는다 — 훅은 Claude의 도구 호출에만 걸린다. 이것이 의도된 동작이다.

- [ ] **Step 2: 스모크 실행**

```bash
BR="$(cd .. && pwd)/brand-radar"; cd "$BR"
bash tests/smoke.sh
```

Expected: 모든 줄이 `✅`, 마지막 줄 `SMOKE: 전부 통과`, exit 0.

하나라도 `❌`면 해당 벽을 고치고 **deny·통과 양쪽을 다시 실측**한다. 통과할 때까지 다음 스텝으로 가지 마라.

- [ ] **Step 3: 단위 테스트도 함께 통과하는지 확인**

```bash
BR="$(cd .. && pwd)/brand-radar"; cd "$BR"
node --test "tests/*.test.mjs"
```

Expected: `# pass 11` · `# fail 0`

- [ ] **Step 4: engine.mjs 가 여전히 킷과 바이트 동일한지 재확인 (드리프트 감사)**

구현 중에 engine을 만졌을 수 있다. 마지막에 다시 본다.

```bash
KIT="$(cd .. && pwd)/haeness-kit"; BR="$(cd .. && pwd)/brand-radar"
A=$(git hash-object "$KIT/.claude/hooks/engine.mjs")
B=$(git hash-object "$BR/.claude/hooks/engine.mjs")
test "$A" = "$B" && echo "OK 바이트 동일" || { echo "DRIFT — engine 수정됨. 되돌려라 (CLAUDE §4)"; exit 1; }
```

Expected: `OK 바이트 동일`

- [ ] **Step 5: 커밋 + 첫 사이클 준비 완료 기록**

```bash
BR="$(cd .. && pwd)/brand-radar"; cd "$BR"
git add tests/smoke.sh
git commit -m "test: 통합 스모크 — 벽2/벽A/벽B deny·통과 양쪽 실측, engine 드리프트 감사"
git log -1 --format='%h %s'
```

`log.md`에 한 줄 append (Edit):

```markdown
- 2026-07-09 구축 완료 — 훅 3층·에이전트 12·커맨드 5. 스모크 전부 통과, engine 바이트 동일 확인. 다음: `/scan`
```

```bash
git add log.md
git commit -m "docs: log — 구축 완료 기록"
git log -1 --format='%h %s'
```

- [ ] **Step 6: 푸시 (세션 종료 전 필수)**

원격이 있으면 푸시한다. 없으면 사람에게 원격 생성을 요청한다 — 푸시 안 된 커밋은 그 컴퓨터에 갇혀 사실상 유실이다 (CLAUDE §2-1).

```bash
BR="$(cd .. && pwd)/brand-radar"; cd "$BR"
git remote -v
```

원격이 비어 있으면 여기서 멈추고 보고한다. 원격을 임의로 만들지 마라.

---

## 자가검토 (Self-Review)

**1. 스펙 커버리지**

| 스펙 절 | 구현 태스크 |
|---|---|
| §1 축 상수 · 비중첩 벽 | Task 3 (`wiki/axis.md`) |
| §1 킷 상속 · engine 바이트 동일 | Task 1 (Step 2), Task 9 (Step 4) |
| §2 다섯 걸음 · 상태 전이 | Task 8 |
| §2 `signals/` 불변 계층 | Task 2 |
| §2 `/scan` 카나리아 → 검증 루프 | Task 8 (Step 1) |
| §2 부분 재실행 | Task 8 (`/scan` 절차 7의 미달 항목 재수집) |
| §3-1 `scout-open` · `metric` 등급 잠금 | Task 5 (Step 1), Task 4 (벽A 규칙 7) |
| §3-2 `scout-social` | Task 5 (Step 2) |
| §3-3 `_inbox/` | Task 1 (`.gitignore`), Task 6 (종합자가 읽음) |
| §3-3b `format-analyst` | Task 5 (Step 3) |
| §3-3c `trend-tracker` | Task 5 (Step 4) |
| §3-4 실패 채널 미보전 | Task 5 (Step 2 금지절), Task 8 (`/scan` 절차 3) |
| §3-5 `signal-synthesizer` | Task 6 (Step 1) |
| §3-5b `signal-validator` | Task 6 (Step 2) |
| §3-6 기계 강제 (벽A) | Task 4 |
| §4 패널 교체 · `redsea-devil` | Task 7 |
| §4 축 주입 거부 | Task 5 (전 수집기 금지절), Task 3 (CLAUDE.md 한계 명시) |
| §5 큐 스키마 · 최대 5개 · 기대값 | Task 8 (`/queue`), Task 7 (`scribe` 금지절) |
| §6 닫는 고리 (3사이클 공백 지적) | Task 8 (Step 4) |
| §7 크론 미도입 | (구현 없음 — 의도된 부재) |
| §8 열린 위험 | Task 5·6의 재시도 상한·콜드 스타트 금지절 |

**갭 없음.** 단 §4의 "축 주입 거부"는 훅으로 강제 불가하며, 그 한계를 Task 3에서 CLAUDE.md에 명시하는 것으로 대체한다.

**2. 플레이스홀더 스캔**

`TBD`·`TODO`·"적절히 처리"·"Task N과 유사" 없음. 모든 코드 스텝에 실제 코드가 있다. `<날짜>`는 플레이스홀더가 아니라 런타임 값이며, 벽A는 이를 `state.signals_date`에서 읽는다 (Task 4에 구현 있음).

**3. 타입 일관성**

- 신호 항목 스키마 `{id, claim, source, observed_at, tier, metric, falsifier}` — Task 4(테스트·구현) · Task 5(수집기 산출) · Task 6(종합) 전부 동일.
- `format-analyst`만 `mechanism` 을 추가한다 (Task 5 Step 3, Task 7 `panelist-voice`가 인용, Task 8 `/queue`의 `각도` 칸).
- `trend-tracker`는 `국면` 값(`신규`/`상승`/`정점`/`하락`/`데이터 부족`)을 낸다 — Task 5 Step 4에서 정의, Task 8 `/queue` 칸에서 소비.
- `check(data, ctx) → string | null` — Task 4에서 정의, `engine.mjs`가 호출 (시그니처는 engine.mjs 주석에 명시된 계약).
- `VERDICT: PASS|REVISE|EXHAUSTED` — Task 6 Step 2에서 정의, Task 8 `/scan` 절차 7에서 소비.
- state 필드 `signals_date` — Task 8이 쓰고 Task 4의 `guardSignals()`가 읽는다. 이름 일치 확인됨.
