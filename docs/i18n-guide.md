# 다국어 지원 (i18n) 구현 가이드

## 현재 상태

**i18n 미지원** - 모든 UI 텍스트가 **한국어로 하드코딩**되어 있습니다.

```javascript
// 현재 (비권장)
statusEl.textContent = 'eolma 미로그인';
showError('네이버페이 또는 쿠팡 주문내역 페이지에서 실행해주세요.');
```

---

## 📋 i18n 구현 계획

### Phase 1: 기본 i18n 구조 (v0.2.0 예정)

**목표:** 한국어 + 영어 지원

#### Step 1: `_locales/` 디렉토리 생성

```
src/
├── _locales/
│   ├── ko/
│   │   └── messages.json
│   ├── en/
│   │   └── messages.json
│   └── ja/
│       └── messages.json
├── manifest.json
└── ...
```

#### Step 2: `manifest.json` 업데이트

```json
{
  "default_locale": "ko",
  "name": "__MSG_appName__",
  "description": "__MSG_appDesc__",
  ...
}
```

#### Step 3: `messages.json` 작성

**`src/_locales/ko/messages.json`**
```json
{
  "appName": {
    "message": "Eolma Exporter",
    "description": "확장 프로그램 이름"
  },
  "appDesc": {
    "message": "네이버페이/쿠팡 결제내역을 Excel/CSV로 내보내기",
    "description": "확장 프로그램 설명"
  },
  "headerTitle": {
    "message": "eolma exporter",
    "description": "팝업 헤더 제목"
  },
  "loadingPage": {
    "message": "페이지 정보를 확인하는 중...",
    "description": "페이지 로딩 중"
  },
  "unsupportedPage": {
    "message": "네이버페이 또는 쿠팡 주문내역 페이지에서 실행해주세요.",
    "description": "지원하지 않는 페이지 메시지"
  },
  "downloadRange": {
    "message": "다운로드 범위",
    "description": "다운로드 범위 레이블"
  },
  "selectMonth": {
    "message": "월 선택",
    "description": "월 선택 옵션"
  },
  "selectRange": {
    "message": "기간 선택",
    "description": "기간 선택 옵션"
  },
  "selectAll": {
    "message": "전체",
    "description": "전체 선택 옵션"
  },
  "downloadExcel": {
    "message": "Excel 다운로드",
    "description": "Excel 다운로드 버튼"
  },
  "downloadCsv": {
    "message": "CSV 다운로드",
    "description": "CSV 다운로드 버튼"
  },
  "eolmaLoggedOut": {
    "message": "eolma 미로그인",
    "description": "eolma 미로그인 상태"
  },
  "eolmaLogin": {
    "message": "eolma 로그인",
    "description": "eolma 로그인 버튼"
  },
  "eolmaUpload": {
    "message": "eolma로 전송",
    "description": "eolma로 전송 버튼"
  },
  "visitEolma": {
    "message": "eolma 가계부 방문 →",
    "description": "eolma 가계부 방문 링크"
  }
}
```

**`src/_locales/en/messages.json`**
```json
{
  "appName": {
    "message": "Eolma Exporter",
    "description": "Application name"
  },
  "appDesc": {
    "message": "Export payment history from Naver Pay and Coupang to Excel/CSV",
    "description": "Application description"
  },
  "headerTitle": {
    "message": "eolma exporter",
    "description": "Popup header title"
  },
  "loadingPage": {
    "message": "Checking page information...",
    "description": "Loading page info"
  },
  "unsupportedPage": {
    "message": "Please use this extension on a Naver Pay or Coupang order history page.",
    "description": "Unsupported page message"
  },
  "downloadRange": {
    "message": "Download Range",
    "description": "Download range label"
  },
  "selectMonth": {
    "message": "Select Month",
    "description": "Select month option"
  },
  "selectRange": {
    "message": "Select Range",
    "description": "Select range option"
  },
  "selectAll": {
    "message": "All",
    "description": "Select all option"
  },
  "downloadExcel": {
    "message": "Download Excel",
    "description": "Download Excel button"
  },
  "downloadCsv": {
    "message": "Download CSV",
    "description": "Download CSV button"
  },
  "eolmaLoggedOut": {
    "message": "Eolma Not Logged In",
    "description": "Eolma logged out state"
  },
  "eolmaLogin": {
    "message": "Login to Eolma",
    "description": "Login button"
  },
  "eolmaUpload": {
    "message": "Send to Eolma",
    "description": "Send to Eolma button"
  },
  "visitEolma": {
    "message": "Visit Eolma Ledger →",
    "description": "Visit Eolma link"
  }
}
```

#### Step 4: HTML/JS에서 사용

**`popup.html` (변경 전)**
```html
<div class="header-title">eolma exporter</div>
```

**`popup.html` (변경 후)**
```html
<div class="header-title" data-i18n="headerTitle">eolma exporter</div>
```

**`popup.js` 추가 (i18n 헬퍼)**
```javascript
// i18n 간단히 구현
const i18n = {
  get(key) {
    return chrome.i18n.getMessage(key) || key;
  },
  
  setTextContent(element, key) {
    if (element) {
      element.textContent = this.get(key);
    }
  }
};

// 또는 자동 적용
document.querySelectorAll('[data-i18n]').forEach(el => {
  const key = el.getAttribute('data-i18n');
  el.textContent = chrome.i18n.getMessage(key);
});

// 사용 예
statusEl.textContent = i18n.get('loadingPage');
showError(i18n.get('unsupportedPage'));
```

---

## 🔧 단계별 구현 (실제 작업)

### Phase 1 체크리스트

1. **디렉토리 생성**
   ```bash
   mkdir -p src/_locales/ko
   mkdir -p src/_locales/en
   mkdir -p src/_locales/ja
   ```

2. **messages.json 파일 생성** (위의 내용 참조)

3. **manifest.json 수정**
   ```json
   {
     "default_locale": "ko",
     "name": "__MSG_appName__",
     "description": "__MSG_appDesc__"
   }
   ```

4. **popup.html 수정**
   - 하드코딩된 텍스트를 `data-i18n` 속성으로 변경
   - 또는 `chrome.i18n.getMessage()` 직접 호출

5. **popup.js 수정**
   - 모든 `textContent = '한글'` 을 `i18n.get('key')` 로 변경

6. **테스트**
   ```bash
   # 로컬에서 압축해제된 확장 로드
   # Chrome 설정 → 확장 프로그램 관리 → 개발자 모드 → "압축해제된 확장 프로그램 로드"
   # src/ 디렉토리 선택
   ```

### Phase 2: 추가 언어 지원 (v0.3.0 예정)

- 일본어 (`ja/messages.json`)
- 중국어 간체 (`zh_CN/messages.json`)
- 베트남어 (`vi/messages.json`)

---

## 💡 i18n 팁

### `chrome.i18n.getMessage()` 사용법

```javascript
// 기본 사용
const msg = chrome.i18n.getMessage('key');

// 변수 포함 (예: $1, $2)
const msg = chrome.i18n.getMessage('greeting', ['John']);

// messages.json 예:
// "greeting": {
//   "message": "Hello $1!",
//   "description": "Greeting message"
// }
```

### HTML에서 i18n 자동 적용

```html
<!-- 방법 1: data-i18n 속성 -->
<div data-i18n="headerTitle"></div>

<!-- 방법 2: script로 자동 변환 -->
<script>
document.querySelectorAll('[data-i18n]').forEach(el => {
  el.textContent = chrome.i18n.getMessage(el.getAttribute('data-i18n'));
});
</script>
```

---

## 📊 i18n 완성도

| 언어 | 상태 | 예정 |
|------|------|------|
| 한국어 (ko) | ✓ 구현됨 | v0.2.0 i18n화 |
| 영어 (en) | - | v0.2.0 추가 |
| 일본어 (ja) | - | v0.3.0 추가 |
| 중국어 간체 (zh_CN) | - | v1.0.0 추가 |
| 베트남어 (vi) | - | v1.0.0 추가 |

---

## 🚀 현재 상황 정리

**현재 (v0.1.0):**
- ✓ 기능 완성
- ✓ 한국어만 완벽 지원
- ✗ i18n 미구현

**다음 버전 (v0.2.0):**
- i18n 기본 구조 구현
- 영어 완전 지원 추가
- 한국어 유지

**장기 계획:**
- 아시아 주요 언어 지원
- 지역별 Web Store 배포 확대

**현재 v0.1.0으로 배포하시고, v0.2.0에서 i18n을 구현하는 것을 권장합니다!**
