# CARE ID PCF·LCA 데이터 통합 수집 설문

GitHub Pages로 배포되는 정적 HTML 설문 폼입니다.  
회원가입·로그인은 브라우저 localStorage, 제출 데이터는 Google Sheets로 수집합니다.

---

## 구조

```
index.html          ← 설문 폼 (GitHub Pages 진입점)
.nojekyll           ← Jekyll 처리 비활성화
apps-script/
  Code.gs           ← Google Apps Script 백엔드 코드
```

---

## GAS 웹앱 배포 방법 (1회만 필요)

### 1단계. 새 스프레드시트 만들기

1. [Google Sheets](https://sheets.new) 에서 새 스프레드시트를 만드세요.
2. URL에서 `/d/` 와 `/edit` 사이의 ID를 복사합니다.  
   예: `https://docs.google.com/spreadsheets/d/**<여기가 ID>**/edit`

### 2단계. Apps Script 코드 붙여넣기

1. 스프레드시트에서 **확장 프로그램 → Apps Script** 를 엽니다.
2. 기존 코드를 모두 지우고 `apps-script/Code.gs` 전체를 붙여넣습니다.
3. **3번째 줄**의 `YOUR_SPREADSHEET_ID_HERE` 를 1단계에서 복사한 ID로 교체합니다.
4. 저장(Ctrl+S / Cmd+S).

### 3단계. 웹앱으로 배포

1. 오른쪽 위 **배포 → 새 배포** 클릭.
2. 유형: **웹앱** 선택.
3. 설정:
   - 실행 계정: **나(me)**
   - 액세스 권한: **모든 사람(Anyone)**
4. **배포** 클릭 → Google 계정 권한 승인.
5. 완료 화면에서 **웹앱 URL** (`.../exec` 로 끝나는 URL) 복사.

### 4단계. index.html 에 URL 연결

`index.html` 에서 아래 줄을 찾아:

```js
const SHEET_ENDPOINT = "";
```

복사한 URL로 교체:

```js
const SHEET_ENDPOINT = "https://script.google.com/macros/s/.../exec";
```

저장 후 `main` 브랜치에 푸시하면 자동 반영됩니다.

---

## 시트 구조

GAS가 첫 제출/가입 시 자동으로 탭을 생성합니다.

| 탭 | 내용 | 헤더 |
|----|------|------|
| `제출` | 설문 제출 1건 = 1행 | 제출일시, 기업명, ... RAW_JSON |
| `회원` | 회원가입 1건 = 1행 | 가입일시, 기업명, 사업자번호, 담당자, 이메일 |

---

## 배포 URL

`https://mint-collection.github.io/careid-pcf-lca-survey/`
