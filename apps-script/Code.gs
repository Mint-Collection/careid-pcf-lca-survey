/**
 * CARE ID PCF·LCA 설문 — Google Apps Script 백엔드
 *
 * 사용법:
 *  1. 새 스프레드시트를 만들고 URL의 /d/<ID>/ 부분을 복사해
 *     아래 SPREADSHEET_ID 에 붙여넣으세요.
 *  2. Apps Script 편집기(확장 프로그램 → Apps Script)에 이 코드를 붙여넣으세요.
 *  3. 배포 → 새 배포 → 유형: 웹앱
 *     - 실행 계정: 나(me)
 *     - 액세스 권한: 모든 사람(Anyone)
 *  4. 배포 후 받은 /exec URL을 index.html 의 SHEET_ENDPOINT 에 붙여넣으세요.
 */

const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE";

// ── 시트 이름 ──────────────────────────────────────────────
const SHEET_SUBMIT = "제출";
const SHEET_MEMBER = "회원";

// ── CORS 대응: OPTIONS preflight ───────────────────────────
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, status: "CARE ID GAS online" }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── 메인 핸들러 ───────────────────────────────────────────
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === "signup") {
      handleSignup(body);
    } else if (action === "submit") {
      handleSubmit(body);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── 회원가입 처리 ─────────────────────────────────────────
function handleSignup(body) {
  const sheet = getOrCreateSheet(SHEET_MEMBER, [
    "가입일시", "기업명", "사업자등록번호", "담당자", "이메일"
  ]);
  sheet.appendRow([
    body.createdAt || new Date().toISOString(),
    body.company  || "",
    body.bizno    || "",
    body.manager  || "",
    body.email    || ""
  ]);
}

// ── 설문 제출 처리 ────────────────────────────────────────
function handleSubmit(body) {
  const HEADERS = [
    // 계정
    "제출일시", "기업명", "사업자번호", "담당자", "이메일",
    // 섹션 01: 작성자
    "작성일자", "작성자 소속", "작성자 성명", "작성자 부서", "작성자 직책",
    "작성자 전화", "작성자 휴대폰", "작성자 팩스", "작성자 이메일",
    "담당자 소속", "담당자 성명", "담당자 전화", "담당자 휴대폰", "담당자 이메일",
    // 섹션 02: 제품
    "데이터 기준연도", "공정 구분(칩)", "제품명(스펙)", "모델명",
    // 섹션 03: 저감
    "저감 방법(칩)", "저감 상세",
    // 섹션 04: 공정
    "대표 공정명", "소재지(공장)",
    // 섹션 05–08: 반복 그룹 (직렬화)
    "투입물(Input)", "에너지 상세", "유지 및 보수", "산출물(Output)",
    // 섹션 06: 에너지·용수 연간 총괄
    "용수(만톤)", "외부스팀(만톤)", "전력(kWh)", "등유(L)", "경유(L)",
    "기타석유류(L)", "LNG(Nm3)", "LPG(Nm3)",
    // 섹션 09: 측정계
    "측정계 설치 현황",
    // 섹션 10: 산정 계획
    "PLC·MES 연계", "데이터 수집·관리", "기타 계획",
    // 공정 단계
    "공정 단계",
    // 무손실 백업
    "RAW_JSON"
  ];

  const sheet = getOrCreateSheet(SHEET_SUBMIT, HEADERS);

  const acc = body.account || {};
  const F   = (body.raw && body.raw.fields) || {};
  const C   = (body.raw && body.raw.chips)  || {};
  const G   = (body.raw && body.raw.groups) || {};

  // 반복 그룹 직렬화 헬퍼
  function serializeGroup(rows, cols) {
    if (!rows || !rows.length) return "";
    return rows.map(r => cols.map(c => r[c] || "").join(" | ")).join("\n");
  }
  function serializeSteps(steps) {
    if (!steps || !steps.length) return "";
    return steps.map((s, i) =>
      [(i+1) + ". " + (s.name||""), s.desc||"", s.note||""]
        .filter(Boolean).join(" / ")
    ).join("\n");
  }

  const row = [
    body.submittedAt || new Date().toISOString(),
    acc.company  || "",
    acc.bizno    || "",
    acc.manager  || "",
    acc.email    || "",
    // 작성자
    F.write_date || "", F.w_org || "",  F.w_name  || "", F.w_dept || "", F.w_title || "",
    F.w_tel  || "",     F.w_mobile || "", F.w_fax || "", F.w_email || "",
    F.m_org  || "",     F.m_name   || "", F.m_phone|| "", F.m_mobile || "", F.m_email || "",
    // 제품
    F.data_year || "",
    (C.proc_type || []).join(", "),
    F.prod_name  || "",
    F.prod_model || "",
    // 저감
    (C.cut_type || []).join(", "),
    F.cut_detail || "",
    // 공정
    F.proc_main || "",
    F.proc_addr || "",
    // 반복 그룹
    serializeGroup(G.input,  ["kind","material","qty","unit","use","origin","transport","route","note"]),
    serializeGroup(G.energy, ["kind","material","qty","unit","use","note"]),
    serializeGroup(G.maint,  ["kind","material","qty","unit","use","note"]),
    serializeGroup(G.output, ["kind","material","qty","unit","treat","note"]),
    // 에너지·용수 연간 총괄
    F.en_water || "", F.en_steam || "", F.en_elec || "", F.en_kerosene || "",
    F.en_diesel || "", F.en_petro || "", F.en_lng || "", F.en_lpg || "",
    // 측정계
    serializeGroup(G.meter, ["proc","equip","count","need","existing","plan","rel"]),
    // 산정 계획
    F.plan_mes    || "",
    F.plan_manage || "",
    F.plan_etc    || "",
    // 공정 단계
    serializeSteps(G.step || []),
    // RAW JSON
    JSON.stringify(body.raw || {})
  ];

  sheet.appendRow(row);
}

// ── 유틸: 시트가 없으면 생성 + 헤더 기록 ─────────────────
function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    // 헤더 행 서식
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#1B4DE4");
    headerRange.setFontColor("#FFFFFF");
  }
  return sheet;
}
