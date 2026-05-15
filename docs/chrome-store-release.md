# Chrome Web Store 배포 가이드

## 개요

Eolma Exporter를 Chrome Web Store에 배포하기 위한 준비 사항 및 절차.

- **현재 버전**: v0.1.0 (2026-05-15)
- **상태**: 배포 준비 단계

---

## 📋 배포 전 필수 체크리스트

### 1. 코드 및 설정 검증

- [x] `manifest.json` 최종 확인
  - 버전: `0.1.0`
  - 이름: `Eolma Exporter`
  - 설명: `네이버페이/쿠팡 결제내역을 Excel/CSV로 내보내기`
  - Manifest V3 사용
- [x] 권한 검토
  - `activeTab`: 현재 탭 분석 (필요)
  - `downloads`: 파일 다운로드 (필요)
  - `storage`: 사용자 설정 저장 (필요)
- [x] Content Scripts 확인
  - 네이버페이: `https://pay.naver.com/pc/history*`
  - 쿠팡: `https://mc.coupang.com/ssr/desktop/order/list*`

### 2. 에셋 준비

⚠️ **다음 파일들을 준비해야 합니다:**

#### 2.1 아이콘/이미지

| 파일 | 크기 | 용도 | 경로 |
|------|------|------|------|
| 확장 프로그램 아이콘 | 128×128 | Web Store 진열 | `src/icons/icon128.png` ✓ 기존 |
| 마케팅 타일 | 440×280 | Web Store 배너 | 필요 |
| 스크린샷 1 | 1280×800 | 메인 UI | **필요** |
| 스크린샷 2 | 1280×800 | 다운로드 기능 | **필요** |
| 스크린샷 3 | 1280×800 | 플랫폼 지원 | **필요** |

**준비 방법:**
```bash
# 팝업 UI를 브라우저에서 캡처
# 1. Chrome에서 popup.html을 열기
# 2. DevTools로 팝업 창 크기 조정 (1280x800)
# 3. 스크린샷 저장
```

#### 2.2 텍스트 콘텐츠

- [ ] **짧은 설명** (132자 이내)
  ```
  네이버페이와 쿠팡 결제/주문내역을 한번에 다운로드하세요.
  ```

- [ ] **상세 설명** (4000자 이내)
  ```
  eolma Exporter는 네이버페이와 쿠팡의 결제/주문내역을 
  Excel 또는 CSV 파일로 내보낼 수 있는 Chrome 확장 프로그램입니다.
  
  ✨ 주요 기능
  • 월별, 기간별, 전체 기간 다운로드 지원
  • Excel(.xlsx)과 CSV 형식 동시 지원
  • 빠른 다중 페이지 수집
  • 직관적인 UI
  
  🔗 eolma 가계부 서비스와 함께 사용하면
  수집한 거래내역을 바로 가계부에 등록할 수 있습니다.
  ```

- [ ] **개인정보처리방침 URL**
  ```
  GitHub README 또는 별도 페이지
  ```

- [ ] **홈페이지/지원 URL**
  ```
  https://github.com/juu-n-oo/eolma-exporter
  ```

---

## 🛠️ 배포 단계별 절차

### Step 1: 파일 준비

```bash
# 프로젝트 루트에서 실행
cd /Users/joonwoo/workspace/eolma-exporter

# src/ 디렉토리를 ZIP으로 압축
zip -r eolma-exporter-v0.1.0.zip src/

# 파일 구조 검증
unzip -l eolma-exporter-v0.1.0.zip | head -20
```

ZIP 파일 구조:
```
eolma-exporter-v0.1.0.zip
├── manifest.json          (최상위 경로)
├── popup.html
├── popup.js
├── background.js
├── content/
│   ├── naverpay.js
│   └── coupang.js
├── eolma/
│   └── api.js
├── lib/
│   └── xlsx.min.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Step 2: Chrome Web Store 계정 접속

1. https://chrome.google.com/webstore/devconsole/ 방문
2. Google 계정 로그인 (개발자 계정)

### Step 3: 새 항목 추가

1. **"새 항목"** 또는 **"앱 게시"** 버튼 클릭
2. **ZIP 파일 업로드**
   - Step 1에서 생성한 `eolma-exporter-v0.1.0.zip` 선택
   - Google에서 자동 분석 수행

### Step 4: 스토어 정보 입력

#### 4.1 기본 정보
| 필드 | 값 |
|------|-----|
| 이름 | `Eolma Exporter` |
| 짧은 설명 | 위의 "짧은 설명" 참조 |
| 상세 설명 | 위의 "상세 설명" 참조 |

#### 4.2 이미지 (필수)
- 📷 **아이콘** (128×128): `src/icons/icon128.png`
- 🎨 **마케팅 타일** (440×280): 별도 준비 필요
- 📸 **스크린샷** (1280×800 × 3): 별도 준비 필요

#### 4.3 카테고리 및 설정
| 항목 | 선택값 |
|------|--------|
| 카테고리 | `Productivity (생산성)` |
| 언어 | `한국어` (현재) |
| 지원 국가/지역 | `대한민국` |
| 콘텐츠 등급 | `4+` (일반 대중용) |

#### 4.4 개인정보 및 지원
| 항목 | 값 |
|------|-----|
| 개인정보처리방침 | GitHub URL 또는 자체 정책 |
| 홈페이지 | `https://github.com/juu-n-oo/eolma-exporter` |
| 지원 이메일 | 연락처 이메일 |

### Step 5: 권한 및 호스트 검토

자동으로 표시되는 권한들:
- ✓ `activeTab` - 현재 탭 분석
- ✓ `downloads` - 파일 다운로드
- ✓ `storage` - 설정 저장

호스트 권한:
- ✓ `https://pay.naver.com/*` - 네이버페이 액세스
- ✓ `https://mc.coupang.com/*` - 쿠팡 액세스

### Step 6: 제출

1. **모든 필드 입력 완료** 확인
2. **"제출"** 또는 **"심사에 제출"** 버튼 클릭
3. Google 자동 검수 시작

### Step 7: 심사 및 공개

- **검수 시간**: 보통 몇 시간 ~ 1일
- **결과 통지**: 이메일로 수신
- **공개 방식**:
  - `공개`: 모든 사용자에게 표시 (권장)
  - `비공개`: 링크로만 공유 가능
  - `제한 공개`: 특정 사용자만 설치 가능

---

## 📝 에셋 준비 상세 가이드

### 스크린샷 촬영 방법

```bash
# 1. 개발자 도구에서 popup.html 열기
# 2. popup 크기를 정확히 설정
# 3. 스크린샷 저장

# 권장 장면:
# - Screenshot 1: 초기 상태 (페이지 정보 로드됨, 다운로드 옵션 보임)
# - Screenshot 2: 다운로드 진행 중 (진행 바 표시)
# - Screenshot 3: 완료 상태 (다운로드 완료 메시지)
```

### 마케팅 타일 (440×280)

**디자인 가이드:**
- 배경: 파란색 (`#007AFF` 또는 `#5856D6`)
- 텍스트: "Eolma Exporter" 또는 "거래내역 내보내기"
- 포맷: PNG 또는 JPEG
- 파일 크기: 1MB 이하

---

## 🔍 심사 거절 시 흔한 이유 및 대응

| 이유 | 대응 |
|------|------|
| 에셋 누락 (아이콘, 스크린샷) | 모든 이미지 파일 업로드 |
| 개인정보처리방침 없음 | GitHub README에 명시 또는 privacy.html 추가 |
| 권한 정당성 미기재 | 팝업에 권한 사용 이유 표시 |
| 콘텐츠 정책 위반 | manifest.json 검토, 악의적 코드 확인 |
| 언어 혼용 | 한국어로 통일 (또는 다국어 i18n 구현) |

---

## 📌 배포 이후

### v0.2.0 업데이트 예정
- eolma 로그인/연동 기능 추가
- 쿠팡 데이터 필드 개선

**업데이트 방법:**
1. 코드 수정 후 `manifest.json` 버전 증가 (`0.1.0` → `0.2.0`)
2. 새 ZIP 파일 생성 및 Web Store에 업로드
3. 자동 심수 후 배포 (기존 사용자에게 자동 업데이트)

---

## 🌐 다국어 지원 (i18n) - 추후 계획

현재 **한국어만 지원**하고 있습니다.

**다국어 확장 계획:**
```
v0.3.0 목표:
- 영어 완전 지원
- 일본어 지원 추가

v1.0.0 목표:
- 중국어, 베트남어 등 아시아 언어 확대
```

구현 시 `_locales/` 디렉토리 사용:
```
_locales/
├── ko/
│   └── messages.json
├── en/
│   └── messages.json
└── ja/
    └── messages.json
```

---

## ✅ 최종 체크리스트

배포 전 반드시 확인하세요:

- [ ] ZIP 파일 생성 완료
- [ ] 128×128 아이콘 준비
- [ ] 440×280 마케팅 타일 준비
- [ ] 1280×800 스크린샷 3개 준비
- [ ] 짧은 설명 작성
- [ ] 상세 설명 작성
- [ ] 개인정보처리방침 URL 준비
- [ ] 홈페이지/지원 URL 준비
- [ ] manifest.json 최종 검토
- [ ] 테스트 (로컬에서 압축해제 후 로드)

---

## 🔗 참고 자료

- [Chrome Web Store 개발자 가이드](https://developer.chrome.com/docs/webstore/)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Web Store 정책](https://developer.chrome.com/docs/webstore/program-policies/)
