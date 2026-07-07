# =====================================================================
# run-exam.ps1 — model-gym 턴키: 새 모델 첫날 캘리브레이션 준비 자동화
# 하는 일: 격리 시험 폴더 생성 + input 3종 복사(README 사용법 1의 준비 명령) +
#          시험-안내.md 생성(격리 규칙 · 사용법 1 원문 · 완료 관찰 술어) + 다음 걸음 안내 출력.
# 안 하는 일: 측정·채점 세션 실행 — 그건 사람이 연다 (스크립트는 준비·안내까지만).
# 근거: MODELS.md 캘리브레이션 절(v0.31 별칭 세대교체 벽 — "별칭이 새 세대로 해석되기 시작한 날
#       = 새 모델 첫날") · model-gym/README.md 사용법 1~4 · provenance 매니페스트 절.
# PowerShell 5.1 호환 · 킷 파일은 읽기만 한다(픽스처 무수정) · 시험 폴더는 어떤 리포에도 커밋 금지.
# =====================================================================
param([string]$ExamDir = '')

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false) } catch {}

# --- 1. 경로 해석: 킷 루트 = 이 스크립트의 조부모 디렉토리, 함대 루트 = 킷 루트의 부모 ---
$scriptPath = $MyInvocation.MyCommand.Path
$gymDir     = Split-Path -Parent $scriptPath          # ...\<킷>\model-gym
$kitRoot    = Split-Path -Parent $gymDir              # ...\<킷>
$fleetRoot  = Split-Path -Parent $kitRoot             # ...\<함대 루트>
if ($ExamDir -eq '') {
    $ExamDir = Join-Path $fleetRoot ('model-exam-' + (Get-Date -Format 'yyyyMMdd'))
}

# --- 2. 기존 시험 폴더 보호 (이전 산출물·힌트 잔재 = 정답 오염) ---
if (Test-Path -LiteralPath $ExamDir) {
    $existing = @(Get-ChildItem -LiteralPath $ExamDir -Force)
    if ($existing.Count -gt 0) {
        Write-Output ('[중단] 기존 시험 폴더 존재: ' + $ExamDir)
        Write-Output '       이전 산출물·힌트 잔재가 측정을 오염시킨다 — 정답 오염 방지 위해 새 경로를 지정하라.'
        Write-Output '       예: powershell -File model-gym\run-exam.ps1 -ExamDir <새 빈 경로>'
        exit 1
    }
}
else {
    New-Item -ItemType Directory -Path $ExamDir | Out-Null
}

# --- 3. 픽스처 실재 확인 후 복사 (README 사용법 1의 준비 명령 자동화) ---
$pairs = @(
    @{ Src = (Join-Path $gymDir 'task-a-meeting\input.md'); Dst = (Join-Path $ExamDir 'input-a.md') },
    @{ Src = (Join-Path $gymDir 'task-b-content\input.md'); Dst = (Join-Path $ExamDir 'input-b.md') },
    @{ Src = (Join-Path $gymDir 'task-c-doc\input.md');     Dst = (Join-Path $ExamDir 'input-c.md') }
)
foreach ($p in $pairs) {
    if (-not (Test-Path -LiteralPath $p.Src)) {
        Write-Output ('[중단] 픽스처 없음: ' + $p.Src)
        Write-Output '       킷 체크아웃이 불완전하다 — git status / git pull 확인 후 재실행하라.'
        exit 1
    }
}
foreach ($p in $pairs) {
    Copy-Item -LiteralPath $p.Src -Destination $p.Dst
}

# --- 4. 시험-안내.md 생성 (격리 규칙 + README 사용법 1 원문 + 완료 관찰 술어) ---
$guide = @'
# 시험-안내 — model-gym 격리 측정 (새 모델 캘리브레이션 시험장)

이 폴더는 킷 `model-gym/run-exam.ps1`이 준비한 **격리 시험 폴더**다.
과제 지시문(프롬프트 전문)은 input-a.md · input-b.md · input-c.md 안에 있다.

## 격리 규칙 (어기는 순간 측정 무효)

- ⛔ **이 폴더 밖·인터넷에서 정답/힌트 찾기 금지.** 킷 폴더의 answer.md(정답본)·scoring.md(채점표)를
  어떤 경로로도 열람하지 마라 — 훅은 쓰기만 막지 읽기는 못 막는다, 열람 즉시 측정 무효.
- ⛔ **자기 채점 금지.** 측정 대상 모델은 산출까지만 한다 — 채점은 측정과 **다른 모델**이
  킷 폴더에서 한다 (SOUL §5).

## 측정 세션 지시 (이 블록을 새 모델 세션에 붙여넣는다)

input-a.md · input-b.md · input-c.md 각 파일의 지시문대로 수행하고, 산출물을 이 폴더에
각각 output-a.md · output-b.md · output-c.md 로 저장하라. 세 입력 파일과 이 안내 밖의
자료(다른 폴더·인터넷)를 찾지 마라.

## 측정 절차 원문 (킷 model-gym/README.md 「사용법」 1 — 원문 그대로)

[인용 시작]
1. **빈 폴더에 input.md 3개만 복사하고, 측정 세션은 반드시 거기서 연다.** 과제 지시문도 input.md 안에 있다.
   이 킷 폴더에서 열면 안 되는 이유: 정답본이 같은 폴더 디스크에 있고 **훅은 쓰기만 막지 읽기는 못 막는다**
   — 측정 대상 모델이 정답을 열람하는 순간 측정 무효다. (킷 폴더에서 실행할 준비 명령:)
   ```powershell
   mkdir ..\model-exam
   Copy-Item model-gym\task-a-meeting\input.md ..\model-exam\input-a.md
   Copy-Item model-gym\task-b-content\input.md ..\model-exam\input-b.md
   Copy-Item model-gym\task-c-doc\input.md ..\model-exam\input-c.md
   ```
   ⛔ answer.md(정답본)·scoring.md(채점표)를 새 모델에게 어떤 경로로도 노출하지 마라 — 암기 오염으로 측정이 무효가 된다.
   (참고: 이 킷은 공개 리포라 정답본이 인터넷에도 있다 — 측정 결과가 정답본과 표현까지 비슷하면 암기를 의심하라.)
[인용 끝]
(참고: 위 원문의 "준비 명령"은 run-exam.ps1이 이미 수행했다 — 이 폴더의 input-a/b/c.md가 그 결과다.)

## 완료 관찰 술어

output-a.md·output-b.md·output-c.md 3파일 생성되면 측정 완료
'@
Set-Content -LiteralPath (Join-Path $ExamDir '시험-안내.md') -Value $guide -Encoding UTF8

# --- 5. 다음 걸음 안내 (관찰 가능한 완료 조건과 함께) ---
$usage2 = @'
2. 산출물을 받아 **scoring.md 항목별로 통과/위반 표**를 만든다. 채점은 사람이 하거나,
   **측정 대상과 다른 모델**에 answer.md·scoring.md를 주고 시킨다 — 같은 모델의 다른 세션은 별도로 안 친다
   (같은 모델이 같은 버릇을 같은 잣대로 봐주는 것을 차단).
   ⛔ 측정 대상 모델이 자기 산출물을 자기 채점하는 것 금지 (SOUL §5).
'@

Write-Output ('[완료] 격리 시험 폴더 준비: ' + $ExamDir)
Write-Output '       생성 파일: input-a.md · input-b.md · input-c.md · 시험-안내.md'
Write-Output ''
Write-Output '다음 걸음 (측정·채점 세션은 사람이 연다 — 이 스크립트는 준비·안내까지):'
Write-Output ('  ① 새 모델 세션을 ' + $ExamDir + ' 에서 열고, 시험-안내.md의 프롬프트를 붙여넣어 측정한다.')
Write-Output '     (관찰: 시험 폴더에 output-a.md·output-b.md·output-c.md 3파일 생성되면 측정 완료)'
Write-Output ('  ② 채점은 킷 폴더(' + $kitRoot + ')에서 **측정과 다른 모델** 세션으로 README 사용법 2 프롬프트를 실행한다.')
Write-Output '     (관찰: task-a/b/c 각 scoring.md에 판정 기록 행 추가)'
Write-Output '     ---- README 사용법 2 원문 ----'
Write-Output $usage2
Write-Output '     ------------------------------'
Write-Output '  ③ 킷에서 오케스트레이션한 경우 state/agent-calls.jsonl 장부로 model-gym/runs/<날짜>-<모델>.md'
Write-Output '     매니페스트를 작성한다 (README "provenance 매니페스트" 절 — scoring.md 판정 행과 같은 커밋).'
Write-Output '  ④ 치명 0 = 역할군 합격 → 사람이 MODELS.md "현재 값"을 확정한다.'
Write-Output ''
Write-Output '⛔ 시험 폴더는 어떤 리포에도 커밋 금지 — 시험 산출물·안내는 전부 리포 밖(함대 루트 아래 임시 경로)에 둔다.'
exit 0
