#!/usr/bin/env node
// =====================================================================
// 벽 3 — 출력 사후 검증 (품질 표류 차단, SOUL §5)
// (1) AI-slop 군더더기 감지 — Write·Edit·MultiEdit·NotebookEdit 의 모든 새 내용에서.
// (2) 증거 부실 감지 — wiki/evidence 가 verdict:pass 인데 실제 명령 출력(```)이 없으면 경고.
// PostToolUse 는 이미 실행된 뒤라 차단은 못 하므로, 다음 턴 교정용 additionalContext 만 준다.
// 출처: gec-prd post-tool-use.mjs 포팅. 절대 throw 금지.
// =====================================================================

const SLOP = [
  /\bcertainly\b/i, /\babsolutely\b/i, /\bas an ai\b/i, /i'?d be happy to/i,
  /\bdelve\b/i, /\bdive into\b/i, /it'?s worth noting/i, /\bin conclusion\b/i,
  /\bfurthermore\b/i, /\bmoreover\b/i, /\bseamless(ly)?\b/i, /\bunleash\b/i,
  /\belevate\b/i, /\bin today'?s [^.]* world\b/i, /\bnavigate the\b/i,
  // 한국어 군더더기
  /물론입니다/, /기꺼이/, /도움이 되었기를/, /요약하자면/, /결론적으로/,
];

main();

async function main() {
  let data = {};
  try { data = await readInput(); } catch { return done(); }

  const ti = (data && data.tool_input) || {};
  const path = String(ti.file_path || ti.notebook_path || "").replace(/\\/g, "/");
  const content = collectContent(ti);

  const notes = [];

  // (1) AI-slop
  const hits = SLOP.filter((re) => re.test(content)).map((re) => re.source);
  if (hits.length) {
    notes.push(`AI-slop 감지(${hits.slice(0, 5).join(", ")}). 상투적 군더더기·과장을 빼고 사실 위주로 다듬으세요.`);
  }

  // (2) 증거 부실 — 통과 판정인데 실제 명령 출력이 없음
  if (/\/wiki\/evidence\//.test(path) && /verdict:\s*pass/i.test(content) && !/```/.test(content)) {
    notes.push(`증거 부실 의심: verdict:pass 인데 실제 명령 출력(\`\`\` 블록)이 없습니다. (존재 ≠ 작동)`);
  }

  if (notes.length) {
    try {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: "⚠️ " + notes.join("  /  ") + "  (벽3)" },
      }));
    } catch {}
  }
  return done();
}

// ---- helpers (절대 throw 금지) ----
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
