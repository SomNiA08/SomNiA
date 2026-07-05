#!/usr/bin/env node
// =====================================================================
// step-diff — 걸음 산출 경계의 기계 검증 (역할 침범 차단, HANDOFF W5 / F3)
// 목적: 한 걸음(에이전트 배분)이 "선언한 산출 경로" 밖을 건드렸는지 git 으로 실측한다.
//       에이전트 정체성은 훅 입력에 없어 훅으로 못 막지만, git status 대조로는 잡힌다.
// 사용: node .claude/checks/step-diff.mjs <허용경로1> [허용경로2 ...]
//       예) node .claude/checks/step-diff.mjs rounds/round-3-panelist-pm.md
// 규약: 항상 허용되는 곳 = state/ (상태·장부) · log.md (한 줄 기록). 그 밖은 인자로 선언해야 한다.
// 판정: 선언·기본 허용 밖의 변경이 있으면 exit 1 + 위반 목록. 깨끗하면 exit 0. 인자 없으면 usage + exit 2.
// 전제: 걸음의 원자 단위 = 산출+커밋 (CLAUDE §2-1). 직전 걸음이 커밋됐으면 미커밋 변경 = 이번 걸음 것뿐이다.
// 한계: git 이 따옴표로 감싼 특수문자 경로는 근사 처리(알려진 한계, spec-check 와 동일 방침).
// =====================================================================
import { execSync } from "node:child_process";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const ALWAYS = ["state/", "log.md"]; // 항상 허용 (상태·장부·한 줄 기록)

const args = process.argv.slice(2);
if (!args.length) {
  console.log("사용법: node .claude/checks/step-diff.mjs <허용 산출경로...>  (state/·log.md 는 자동 허용)");
  process.exit(2);
}

const allowed = args.map(norm).concat(ALWAYS);

let raw = "";
try {
  // --untracked-files=all: 통째 미추적 디렉토리를 접지 않고 파일 단위로 표시 (파일 granularity 검사).
  raw = execSync("git status --porcelain --untracked-files=all", { cwd: root, encoding: "utf8" });
} catch (e) {
  console.log("git status 실패 — git 저장소가 맞는지 확인하세요: " + String(e && e.message).slice(0, 120));
  process.exit(2);
}

const changed = raw.split("\n").map(parsePath).filter(Boolean);
const violations = changed.filter((p) => !allowed.some((a) => p === a || p.startsWith(a)));

if (violations.length) {
  console.log(`걸음 산출 경계 위반 — 선언 밖 변경 ${violations.length}건 (REVISE):`);
  for (const v of violations) console.log("  ⛔ " + v);
  console.log(`허용된 경로: ${allowed.join(" · ")}`);
  console.log("→ 선언한 산출물만 남기고, 의도한 경로면 인자에 추가해 다시 검사하세요.");
  process.exit(1);
}
console.log(`OK — 선언 산출 경계 안의 변경만 있음 (${changed.length}건 검사, 허용: ${allowed.join(" · ")}).`);
process.exit(0);

function norm(p) { return String(p || "").trim().replace(/\\/g, "/"); }
function parsePath(line) {
  if (!line || line.length < 4) return null;
  let p = line.slice(3); // "XY " 프리픽스 제거
  if (p.includes(" -> ")) p = p.split(" -> ")[1]; // 리네임: 새 경로
  p = p.replace(/^"(.*)"$/, "$1"); // 따옴표 근사 제거
  return norm(p);
}
