#!/usr/bin/env node
// =====================================================================
// 벽 3 — 출력 사후 검증 (품질 표류 차단, SOUL §5)
// (1) AI-slop 군더더기 감지 — Write·Edit·MultiEdit·NotebookEdit 의 모든 새 내용에서.
// (2) 증거 부실 감지 — wiki/evidence 가 verdict:pass 인데 실제 명령 출력(```)이 없으면 경고.
// PostToolUse 는 이미 실행된 뒤라 차단은 못 하므로, 다음 턴 교정용 additionalContext 만 준다.
// 출처: gec-prd post-tool-use.mjs 포팅. 절대 throw 금지.
// (HANDOFF W4: 경고 발생 시 사건 장부(incidents.jsonl)에도 한 줄 남긴다 — 자동 회고 재료.)
// v0.28: 고유명사·인용 개체명 예외 신설 (CLAUDE §4 v0.27 벽의 기계 이행 — invest-desk cycle 1
//        "Uber Elevate" 오탐). 한국어 슬롭 확장분(ai-worklog 2026-07-03)을 킷으로 상향 — 드리프트 해소.
//        알려진 한계: 인용부호 없는 소문자 맨몸 언급은 여전히 warn — slop 어휘를 문서에서 언급할 땐 백틱으로 감싼다.
// =====================================================================
import { appendIncident } from "./ledger.mjs";
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();

const SLOP = [
  /\bcertainly\b/i, /\babsolutely\b/i, /\bas an ai\b/i, /i'?d be happy to/i,
  /\bdelve\b/i, /\bdive into\b/i, /it'?s worth noting/i, /\bin conclusion\b/i,
  /\bfurthermore\b/i, /\bmoreover\b/i, /\bseamless(ly)?\b/i, /\bunleash\b/i,
  /\belevate\b/i, /\bin today'?s [^.]* world\b/i, /\bnavigate the\b/i,
  // 한국어 군더더기
  /물론입니다/, /기꺼이/, /도움이 되었기를/, /요약하자면/, /결론적으로/,
  // 한국어 슬롭·속어 확장 (콘텐츠 품질 가드, ai-worklog 2026-07-03 → 킷 상향 v0.28)
  /혁신적/, /획기적/, /놀라운 (결과|경험|성과)/, /여정을/, /대박/, /꿀팁/, /갓생/, /레전드/,
];

main();

async function main() {
  let data = {};
  try { data = await readInput(); } catch { return done(); }

  const ti = (data && data.tool_input) || {};
  const tool = data.tool_name || "";
  const path = String(ti.file_path || ti.notebook_path || "").replace(/\\/g, "/");
  const content = collectContent(ti);

  const notes = [];

  // (1) AI-slop — 고유명사·인용 개체명 예외 적용 (v0.27 벽 기계 이행)
  const hits = slopHits(content);
  if (hits.length) {
    notes.push(`AI-slop 감지(${hits.slice(0, 5).join(", ")}). 상투적 군더더기·과장을 빼고 사실 위주로 다듬으세요.`);
  }

  // (2) 증거 부실 — 통과 판정인데 실제 명령 출력이 없음
  if (/\/wiki\/evidence\//.test(path) && /verdict:\s*pass/i.test(content) && !/```/.test(content)) {
    notes.push(`증거 부실 의심: verdict:pass 인데 실제 명령 출력(\`\`\` 블록)이 없습니다. (존재 ≠ 작동)`);
  }

  if (notes.length) {
    try { appendIncident(root, { hook: "post-tool-use", tool, path, action: "warn", reason: notes.join(" / ").slice(0, 200) }); } catch {}
    try {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: "⚠️ " + notes.join("  /  ") + "  (벽3)" },
      }));
    } catch {}
  }
  return done();
}

// ---- helpers (절대 throw 금지) ----
// slop 판정: 패턴별로 실제 매치를 훑되, 고유명사·인용 위치의 매치는 제외하고
// "진짜" 매치가 하나라도 남는 패턴만 hits 로 보고한다 (v0.27 벽).
function slopHits(content) {
  const hits = [];
  for (const re of SLOP) {
    let g;
    try { g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"); } catch { continue; }
    let m;
    while ((m = g.exec(content))) {
      if (!isNounOrQuoted(content, m)) { hits.push(re.source); break; }
      if (m.index === g.lastIndex) g.lastIndex++; // zero-width 안전장치
    }
  }
  return hits;
}
// 고유명사·인용 개체명 예외: (a) 백틱·따옴표·괄호류에 바로 인접한 언급(`elevate`·"Uber Elevate"·《대박》),
// (b) 대문자 시작 + 직전 토큰도 대문자 시작(고유명사 연쇄: Uber Elevate, Project Unleash).
// 소문자 맨몸 언급은 예외가 아니다 — 그건 백틱으로 감싸는 게 규약이다 (알려진 한계, 헤더 주석).
function isNounOrQuoted(content, m) {
  const s = m.index, e = s + m[0].length;
  const before = content.slice(Math.max(0, s - 30), s);
  const after = content.slice(e, e + 1);
  if (/[`'"「『《‘“(\[]$/.test(before) || /^[`'"」』》’”)\]]/.test(after)) return true;
  if (/^[A-Z]/.test(m[0]) && /[A-Z][\w.&-]*\s+$/.test(before)) return true;
  return false;
}
function collectContent(ti) {
  let s = String((ti && (ti.content || ti.new_string || ti.new_source)) || "");
  if (ti && Array.isArray(ti.edits)) {
    for (const e of ti.edits) s += " " + String((e && e.new_string) || "");
  }
  return s;
}
function done() { process.exit(0); }
function readInput() {
  return new Promise((resolve) => {
    let d = "", fin = false;
    const finish = () => { if (fin) return; fin = true; try { resolve(JSON.parse(d || "{}")); } catch { resolve({}); } };
    try { process.stdin.on("data", (c) => (d += c)); process.stdin.on("end", finish); } catch { finish(); }
    setTimeout(finish, 2000);
  });
}
