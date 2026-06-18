/**
 * CARE ID 공정별 데이터 점검 설문 — Google Apps Script 백엔드
 *
 * 배포 방법:
 *  script.google.com → 새 프로젝트 → 코드 붙여넣기 → 저장
 *  배포 → 새 배포 → 웹앱 → 실행 계정: 나 / 액세스: 모든 사용자 → 배포
 *
 * ⚠️  이 파일은 기관별 비밀번호·매핑을 포함합니다.
 *     절대 공개 저장소에 업로드하지 마세요.
 */

const SPREADSHEET_ID = "1X6Ol2UOHwJyiPF3nzXjh_ksracasftMQd-bS0CxeFaM";

// ── 기관별 비밀번호 (클라이언트에 노출 금지) ───────────────────
const ORG_PASSWORDS = {
  "fiber-7421":    "㈜이새에프앤씨",
  "polymer-3185":  "㈜휴비스",
  "weave-6092":    "㈜건백",
  "spindle-4736":  "일신방직㈜",
  "fabric-8254":   "㈜유니아텍스",
  "sensor-1903":   "㈜시제",
  "summit-5471":   "㈜비와이엔블랙야크",
  "mint-2680":     "한국조폐공사",
  "verify-3914":   "KOTITI시험연구원",
  "textile-7052":  "한국섬유개발연구원",
  "export-4628":   "(사)한국섬유수출입협회"
};

// ── 기관 → 트랙 코드 매핑 (클라이언트에 노출 금지) ────────────
const ORG_TRACKS = {
  "㈜이새에프앤씨":        ["D","E2"],
  "㈜휴비스":              ["A"],
  "㈜건백":                ["A"],
  "일신방직㈜":            ["B","K"],
  "㈜유니아텍스":          ["C","D","E2"],
  "㈜시제":                ["J"],
  "㈜비와이엔블랙야크":    ["E2"],
  "한국조폐공사":          ["F"],
  "KOTITI시험연구원":      ["G"],
  "한국섬유개발연구원":    ["A"],
  "(사)한국섬유수출입협회": ["I"]
};

// ── PCF 현황표 + LCI 양식 대상 기관 ───────────────────────────
const ORG_HYEONHWANG_LIST = [
  "㈜이새에프앤씨",
  "㈜휴비스",
  "㈜건백",
  "일신방직㈜",
  "㈜유니아텍스",
  "한국섬유개발연구원"
];

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
    let result;
    if (body.action === "auth") {
      result = handleAuth(body);
    } else if (body.action === "submit") {
      handleSubmit(body);
      result = { ok: true };
    } else {
      result = { ok: false, error: "unknown action" };
    }
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── 비밀번호 인증 ───────────────────────────────────────────────
function handleAuth(body) {
  const org = ORG_PASSWORDS[body.password || ""];
  if (!org) return { ok: false };
  return {
    ok: true,
    org: org,
    tracks: ORG_TRACKS[org] || [],
    hyeonhwang: ORG_HYEONHWANG_LIST.indexOf(org) >= 0
  };
}

// ── 설문 제출 ───────────────────────────────────────────────────
function handleSubmit(body) {
  const org = body.org || "미상";
  const contact = body.contact || {};
  const items = body.items || [];

  // 헤더: 고정 앞 6칸 + 응답 항목 레이블 + RAW_JSON
  const fixedHeaders = ["제출일시", "담당자 성명", "부서", "직위", "연락처", "이메일"];
  const itemHeaders = items.map(function(it) {
    return it.section ? "[" + it.section + "] " + it.label : it.label;
  });
  const headers = fixedHeaders.concat(itemHeaders).concat(["RAW_JSON"]);

  const sheet = getOrCreateOrgSheet(org, headers);

  const fixedRow = [
    toKST(body.submittedAt),
    contact.name     || "",
    contact.dept     || "",
    contact.position || "",
    contact.phone    || "",
    contact.email    || ""
  ];
  const itemRow = items.map(function(it) { return it.value || ""; });
  const row = fixedRow.concat(itemRow).concat([JSON.stringify(body)]);

  sheet.appendRow(row);
}

// ── 유틸: 기관별 탭 없으면 생성 ────────────────────────────────
function getOrCreateOrgSheet(name, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);

    const totalCols = headers.length;

    // 헤더 행 색상 (고정 열: 파랑 / 응답 열: 하늘 / RAW_JSON: 회색)
    if (totalCols >= 6) {
      sheet.getRange(1, 1, 1, 6).setBackground("#1B4DE4").setFontColor("#FFFFFF").setFontWeight("bold");
    }
    if (totalCols > 6) {
      const answerCols = totalCols - 6 - 1;  // RAW_JSON 제외
      if (answerCols > 0) {
        sheet.getRange(1, 7, 1, answerCols).setBackground("#0077B6").setFontColor("#FFFFFF").setFontWeight("bold");
      }
      sheet.getRange(1, totalCols, 1, 1).setBackground("#3D3D3D").setFontColor("#FFFFFF").setFontWeight("bold");

      // 고정 열 / 응답 열 경계 보더
      sheet.getRange(1, 7, sheet.getMaxRows(), 1)
        .setBorder(null, true, null, null, null, null,
          "#555555", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    }

    sheet.setRowHeight(1, 28);
    sheet.autoResizeColumns(1, totalCols);
  }
  return sheet;
}
