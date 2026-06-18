/**
 * CARE ID PCF·LCA 설문 — Google Apps Script 백엔드
 *
 * 배포 방법:
 *  script.google.com → 새 프로젝트 → 코드 붙여넣기 → 저장
 *  배포 → 새 배포 → 웹앱 → 실행 계정: 나 / 액세스: 모든 사용자 → 배포
 */

const SPREADSHEET_ID = "1X6Ol2UOHwJyiPF3nzXjh_ksracasftMQd-bS0CxeFaM";

const SHEET_SUBMIT = "제출";
const SHEET_MEMBER = "회원";

function toKST(isoString) {
  const d = isoString ? new Date(isoString) : new Date();
  return Utilities.formatDate(d, "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, status: "CARE ID GAS online" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === "signup")  handleSignup(body);
    else if (body.action === "submit") handleSubmit(body);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── 회원가입 ────────────────────────────────────────────────
function handleSignup(body) {
  const HEADERS = ["가입일시", "기업명", "사업자등록번호", "담당자", "이메일"];
  const sheet = getOrCreateSheet(SHEET_MEMBER, HEADERS, [
    { start: 1, end: 5, bg: "#1B4DE4", fg: "#FFFFFF", label: "회원" }
  ]);
  sheet.appendRow([
    toKST(body.createdAt),
    body.company  || "",
    body.bizno    || "",
    body.manager  || "",
    body.email    || ""
  ]);
}

// ── 설문 제출 ───────────────────────────────────────────────
function handleSubmit(body) {
  // 컬럼 1~44 (RAW_JSON 제외)
  const HEADERS = [
    // 계정 (1–5)
    "제출일시", "기업명", "사업자번호", "담당자", "이메일",
    // 섹션 01 작성자 (6–19)
    "작성일자", "작성자 소속", "작성자 성명", "작성자 부서", "작성자 직책",
    "작성자 전화", "작성자 휴대폰", "작성자 팩스", "작성자 이메일",
    "담당자 소속", "담당자 성명", "담당자 전화", "담당자 휴대폰", "담당자 이메일",
    // 섹션 02 제품 (20–23)
    "데이터 기준연도", "공정 구분(칩)", "제품명(스펙)", "모델명",
    // 섹션 03 저감 (24–25)
    "저감 방법(칩)", "저감 상세",
    // 섹션 04 공정 (26–27)
    "대표 공정명", "소재지(공장)",
    // 섹션 05–08 반복 그룹 (28–31)
    "투입물(Input)", "에너지 상세", "유지 및 보수", "산출물(Output)",
    // 섹션 06 에너지·용수 총괄 (32–39)
    "용수(만톤)", "외부스팀(만톤)", "전력(kWh)", "등유(L)", "경유(L)",
    "기타석유류(L)", "LNG(Nm3)", "LPG(Nm3)",
    // 섹션 09 측정계 (40)
    "측정계 설치 현황",
    // 섹션 10 산정 계획 (41–43)
    "PLC·MES 연계", "데이터 수집·관리", "기타 계획",
    // 공정 단계 (44)
    "공정 단계",
    // 백업 (45)
    "RAW_JSON"
  ];

  // 섹션별 헤더 컬러 (start/end: 1-based 컬럼 번호)
  const SECTIONS = [
    { start:  1, end:  5, bg: "#1B4DE4", fg: "#FFFFFF", label: "제출 계정" },
    { start:  6, end: 19, bg: "#0077B6", fg: "#FFFFFF", label: "섹션 01 작성자" },
    { start: 20, end: 23, bg: "#2D6A4F", fg: "#FFFFFF", label: "섹션 02 제품" },
    { start: 24, end: 25, bg: "#E76F51", fg: "#FFFFFF", label: "섹션 03 저감" },
    { start: 26, end: 27, bg: "#7209B7", fg: "#FFFFFF", label: "섹션 04 공정" },
    { start: 28, end: 31, bg: "#D62828", fg: "#FFFFFF", label: "섹션 05–08 투입·산출" },
    { start: 32, end: 39, bg: "#023E8A", fg: "#FFFFFF", label: "섹션 06 에너지·용수" },
    { start: 40, end: 40, bg: "#6D6875", fg: "#FFFFFF", label: "섹션 09 측정계" },
    { start: 41, end: 43, bg: "#386641", fg: "#FFFFFF", label: "섹션 10 산정 계획" },
    { start: 44, end: 44, bg: "#4A4E69", fg: "#FFFFFF", label: "공정 단계" },
    { start: 45, end: 45, bg: "#3D3D3D", fg: "#FFFFFF", label: "RAW_JSON" }
  ];

  const sheet = getOrCreateSheet(SHEET_SUBMIT, HEADERS, SECTIONS);

  const acc = body.account || {};
  const F   = (body.raw && body.raw.fields) || {};
  const C   = (body.raw && body.raw.chips)  || {};
  const G   = (body.raw && body.raw.groups) || {};

  function sg(rows, cols) {
    if (!rows || !rows.length) return "";
    return rows.map(r => cols.map(c => r[c] || "").join(" | ")).join("\n");
  }
  function ss(steps) {
    if (!steps || !steps.length) return "";
    return steps.map((s, i) =>
      [(i+1) + ". " + (s.name || ""), s.desc || "", s.note || ""]
        .filter(Boolean).join(" / ")
    ).join("\n");
  }

  sheet.appendRow([
    toKST(body.submittedAt),
    acc.company || "", acc.bizno || "", acc.manager || "", acc.email || "",
    F.write_date || "", F.w_org || "", F.w_name || "", F.w_dept || "", F.w_title || "",
    F.w_tel || "", F.w_mobile || "", F.w_fax || "", F.w_email || "",
    F.m_org || "", F.m_name || "", F.m_phone || "", F.m_mobile || "", F.m_email || "",
    F.data_year || "", (C.proc_type || []).join(", "), F.prod_name || "", F.prod_model || "",
    (C.cut_type || []).join(", "), F.cut_detail || "",
    F.proc_main || "", F.proc_addr || "",
    sg(G.input,  ["kind","material","qty","unit","use","origin","transport","route","note"]),
    sg(G.energy, ["kind","material","qty","unit","use","note"]),
    sg(G.maint,  ["kind","material","qty","unit","use","note"]),
    sg(G.output, ["kind","material","qty","unit","treat","note"]),
    F.en_water || "", F.en_steam || "", F.en_elec || "", F.en_kerosene || "",
    F.en_diesel || "", F.en_petro || "", F.en_lng || "", F.en_lpg || "",
    sg(G.meter, ["proc","equip","count","need","existing","plan","rel"]),
    F.plan_mes || "", F.plan_manage || "", F.plan_etc || "",
    ss(G.step || []),
    JSON.stringify(body.raw || {})
  ]);
}

// ── 유틸: 시트 없으면 생성 + 섹션별 헤더 컬러 ─────────────
function getOrCreateSheet(name, headers, sections) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);

    const totalCols = headers.length;

    // 섹션별 배경색 + 텍스트색 적용
    sections.forEach(function(sec) {
      const range = sheet.getRange(1, sec.start, 1, sec.end - sec.start + 1);
      range.setBackground(sec.bg);
      range.setFontColor(sec.fg);
      range.setFontWeight("bold");
    });

    // 섹션 경계에 두꺼운 왼쪽 보더 추가
    sections.forEach(function(sec) {
      if (sec.start > 1) {
        sheet.getRange(1, sec.start, sheet.getMaxRows(), 1)
          .setBorder(null, true, null, null, null, null, "#555555", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
      }
    });

    // 헤더 행 높이
    sheet.setRowHeight(1, 28);

    // 열 너비 자동 조정
    sheet.autoResizeColumns(1, totalCols);
  }
  return sheet;
}
