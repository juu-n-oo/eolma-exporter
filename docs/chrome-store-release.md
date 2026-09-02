# Chrome Web Store 배포 가이드

## 개요

eolma 내보내기를 Chrome Web Store에 배포하기 위한 준비 사항 및 절차.

- **현재 버전**: v0.2.0 (2026-06-10)
- **상태**: 업데이트 심사 제출 준비 (eolma 연동 추가)

---

## 📋 배포 전 필수 체크리스트

### 1. 코드 및 설정 검증

- [x] `manifest.json` 최종 확인
  - 버전: `0.2.0`
  - 이름: `eolma 내보내기`
  - 설명: `네이버페이·쿠팡 주문내역을 Excel/CSV로 내보내고 eolma 가계부로 전송합니다.`
  - Manifest V3 사용
- [x] 권한 검토
  - `activeTab`: 현재 탭 분석 (필요)
  - `downloads`: 파일 다운로드 (필요)
  - `storage`: eolma 로그인 토큰/상태 보관 (필요)
- [x] 호스트 권한 검토
  - `https://pay.naver.com/*`: 네이버페이 결제내역 액세스
  - `https://mc.coupang.com/*`: 쿠팡 주문내역 액세스
  - `https://eolma.de/*`: **(v0.2.0 신규)** eolma 로그인 확인 및 수집 내역 업로드
- [x] Content Scripts 확인
  - 네이버페이: `https://pay.naver.com/pc/history*`
  - 쿠팡: `https://mc.coupang.com/ssr/desktop/order/list*`
  - eolma: `https://eolma.de/*` **(v0.2.0 신규 — 로그인 토큰 동기화)**

### 2. 에셋 준비

⚠️ **다음 파일들을 준비해야 합니다:**

#### 2.1 아이콘/이미지

| 파일 | 크기 | 용도 | 경로 |
|------|------|------|------|
| 확장 프로그램 아이콘 | 128×128 | Web Store 진열 | `src/icons/icon128.png` ✓ 기존 |
| 마케팅 타일 | 440×280 | Web Store 진열·검색 메인 그래픽 | `screenshots/promo-tile-440x280.png` ✓ v0.2.0 |
| 스크린샷 1 (네이버페이 hero) | 1280×800 | "클릭 한 번으로" + 팝업 | `screenshots/store-ko-naverpay.png` ✓ v0.2.0 |
| 스크린샷 2 (쿠팡 hero) | 1280×800 | "한 번에 정리" + 팝업 | `screenshots/store-ko-coupang.png` ✓ v0.2.0 |
| 스크린샷 3 (사용 맥락) | 1280×800 | 결제내역 페이지 + 툴바 아이콘 + 앵커 팝업 | `screenshots/store-ko-browser.png` ✓ v0.2.0 |

> 합성 전 순수 팝업 렌더는 `screenshots/raw/` 에 보관(네이버페이/쿠팡/미지원).
> 이전 버전(v0.1.0) 스크린샷은 `screenshots/changes/v0.1.0/` 에 보관.
> 스크린샷은 v0.1.0 과 동일한 디자인 언어(좌측 카피 + 다크 베젤 프레임 팝업)로 1280×800 에 합성됨.

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
  네이버페이·쿠팡 결제내역을 Excel·CSV로 내보내고, 로그인한 본인 eolma 가계부로 바로 전송하세요.
  ```

- [ ] **상세 설명** (4000자 이내)
  ```
  eolma 내보내기 - 결제내역 내보내기 도구

  eolma 내보내기는 네이버페이와 쿠팡의 결제·주문내역을 한 곳에서
  손쉽게 내보낼 수 있는 Chrome 확장 프로그램입니다.

  ■ 주요 기능

  다중 플랫폼 지원
  • 네이버페이: 전체 결제내역 수집
  • 쿠팡: 주문내역 수집

  유연한 다운로드 옵션
  • 월별 다운로드: 특정 월의 거래내역만 추출
  • 기간별 다운로드: 시작월~종료월 범위 지정
  • 전체 다운로드: 모든 거래내역을 한 번에 수집 (다중 페이지 자동 처리)

  다양한 파일 형식
  • Excel(.xlsx): 스프레드시트에서 바로 열어 분석
  • CSV: 다양한 도구와 호환

  eolma 가계부 연동
  • 로그인한 본인 eolma 계정으로 수집한 내역을 바로 전송
  • 전송된 내역은 eolma 가계부에서 검토 후 등록

  빠르고 효율적인 수집
  • 다중 페이지 자동 처리로 시간 단축
  • 실시간 진행 상황 표시
  • 직관적이고 간단한 UI

  ■ 사용 방법
  1. 네이버페이 또는 쿠팡 결제·주문내역 페이지 방문
  2. eolma 내보내기 아이콘 클릭
  3. 원하는 범위와 형식 선택
  4. Excel·CSV로 다운로드하거나 eolma로 전송

  ■ 개인정보 보호
  • 수집한 내역은 사용자가 직접 Excel·CSV로 내려받거나, 로그인한 본인의 eolma 계정으로 전송할 때만 외부로 나갑니다
  • eolma로 전송하지 않으면 데이터는 브라우저를 벗어나지 않으며, 다운로드 후 별도로 보관하지 않습니다
  • 네이버페이·쿠팡·eolma 외 다른 사이트나 제3자에게는 데이터를 전송하지 않습니다
  • 개인정보처리방침 준수

  지금 설치하고 거래내역 정리를 시작하세요.
  ```

- [ ] **개인정보처리방침 URL**
  ```
  https://github.com/juu-n-oo/eolma-exporter/blob/main/docs/privacy-policy.md
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
zip -r eolma-exporter-v0.2.0.zip src/

# 파일 구조 검증
unzip -l eolma-exporter-v0.2.0.zip | head -20
```

ZIP 파일 구조:
```
eolma-exporter-v0.2.0.zip
├── manifest.json          (최상위 경로)
├── popup.html
├── popup.js
├── background.js
├── content/
│   ├── naverpay.js
│   ├── coupang.js
│   └── eolma.js           (v0.2.0 신규 — eolma 로그인 토큰 동기화)
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
| 이름 | `eolma 내보내기` |
| 짧은 설명 | 위의 "짧은 설명" 참조 |
| 상세 설명 | 위의 "상세 설명" 참조 |

#### 4.2 이미지 (필수)
- 📷 **아이콘** (128×128): `src/icons/icon128.png` ✓
- 🎨 **마케팅 타일** (440×280): `screenshots/promo-tile-440x280.png` ✓
- 📸 **스크린샷** (1280×800 × 3): `screenshots/store-ko-{naverpay,coupang,browser}.png` ✓

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
| 개인정보처리방침 | `https://github.com/juu-n-oo/eolma-exporter/blob/main/docs/privacy-policy.md` |
| 홈페이지 | `https://github.com/juu-n-oo/eolma-exporter` |
| 지원 이메일 | `junurakai@gmail.com` |

### Step 5: 권한 및 호스트 검토

자동으로 표시되는 권한들:
- ✓ `activeTab` - 현재 탭 분석
- ✓ `downloads` - 파일 다운로드
- ✓ `storage` - eolma 로그인 토큰/상태 보관

호스트 권한:
- ✓ `https://pay.naver.com/*` - 네이버페이 액세스
- ✓ `https://mc.coupang.com/*` - 쿠팡 액세스
- ✓ `https://eolma.de/*` - **(v0.2.0 신규)** eolma 로그인 확인·내역 업로드

#### ⚠️ v0.2.0 업데이트 심사 시 반드시 처리할 것

v0.2.0은 **수집한 내역을 외부 서버(eolma.de)로 전송**하는 기능이 새로 생겼다.
manifest 권한 자체는 이미 추가돼 있으므로 코드 수정은 없지만, **개발자 콘솔의 "개인정보 보호 관행(Privacy practices)" 탭을 갱신**해야 한다. 누락/오신고 시 거절·게시 중단 위험.

1. **권한 정당성(Justification) 작성** — 각 권한·호스트마다 사용 이유 1~2문장:
   - `activeTab` / 네이버페이·쿠팡 호스트: 현재 보고 있는 결제·주문내역 페이지에서 거래 데이터를 추출.
   - `downloads`: 추출 결과를 Excel/CSV로 사용자 기기에 저장.
   - `storage`: eolma 로그인 토큰·상태를 로컬에 보관해 재요청 시 사용.
   - `https://eolma.de/*` (신규): 사용자의 eolma 로그인 여부 확인 및 **사용자가 명시적으로 "eolma로 전송"을 누를 때만** 수집 내역 업로드.
2. **데이터 사용(Data usage) 신고 변경** — v0.1.0의 "데이터 수집 안 함"을 그대로 두면 안 됨:
   - 수집·전송 항목 체크: **금융 및 결제 정보**(결제금액/일시/상점·상품명), **인증 정보**(eolma 토큰).
   - 인증서: ❶ 제3자에게 판매·양도하지 않음, ❷ 확장의 단일 목적과 무관한 용도로 사용하지 않음, ❸ 신용도 평가/대출 목적 사용 안 함.
   - 전송 대상은 **사용자 본인의 eolma 계정 서버**임을 정당성에 명시.
3. **원격 코드 없음**: `lib/xlsx.min.js`는 패키지에 포함된 로컬 파일 → "원격 코드 사용 안 함" 유지.
4. **개인정보처리방침 갱신 반영**: `docs/privacy-policy.md`가 eolma 전송을 반영하도록 수정됨(서버 전송 없음 문구 삭제). 설명·정책·신고 내용이 **서로 일치**해야 함.

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
- 텍스트: "eolma 내보내기" 또는 "거래내역 내보내기"
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
| 언어 혼용 | UI 전반을 한국어로 통일 |

---

## 📌 배포 이후

### v0.2.0 (현재) — 적용 완료
- eolma 로그인 상태 확인 + 수집 내역 eolma 업로드(검토 대기) 연동
- 서버 가용 여부(Online/Offline)·로그인 상태 LED 표시
- 미지원 페이지 안내 화면(네이버페이/쿠팡 이동 버튼) 추가
- 년월 범위 선택 통합 UI

> ⚠️ 데이터 전송 기능이 추가됐으므로 위 **Step 5의 개인정보 신고 갱신**이 이번 심사의 핵심이다.

**업데이트 방법:**
1. 코드 수정 후 `manifest.json` 버전 증가 (`0.1.0` → `0.2.0`)
2. 새 ZIP 파일 생성 및 Web Store에 업로드
3. 개발자 콘솔에서 권한 정당성·데이터 사용 신고 갱신
4. 심사 제출 → 배포 (기존 사용자에게 자동 업데이트)

---

## 🇰🇷 언어 정책

eolma 내보내기는 대한민국 사용자를 위한 한국어 전용 확장 프로그램입니다.
브라우저 언어와 관계없이 모든 사용자 메뉴와 안내 문구를 한국어로 표시합니다.
`Online` / `Offline`처럼 상태를 빠르게 구분하기 위한 짧은 영문 표기는 유지할 수 있습니다.

---

## ✅ 최종 체크리스트

배포 전 반드시 확인하세요:

- [ ] ZIP 파일 생성 완료
- [x] 128×128 아이콘 준비 ✓ (기존)
- [x] 440×280 마케팅 타일 준비 ✓ (`screenshots/promo-tile-440x280.png`)
- [x] 1280×800 스크린샷 3개 준비 ✓ (`screenshots/store-ko-*.png`)
- [x] 짧은 설명 작성 ✓
- [x] 상세 설명 작성 ✓
- [ ] **개인정보 데이터 사용 신고 갱신** (Step 5 ⚠️ — eolma 전송 반영)
- [x] 개인정보처리방침 URL 준비 ✓ (`docs/privacy-policy.md`)
- [x] 홈페이지/지원 URL 준비 ✓
- [x] 지원 이메일 설정 ✓ (`junurakai@gmail.com`)
- [ ] manifest.json 최종 검토
- [ ] 테스트 (로컬에서 압축해제 후 로드)

---

## 🔗 참고 자료

- [Chrome Web Store 개발자 가이드](https://developer.chrome.com/docs/webstore/)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Web Store 정책](https://developer.chrome.com/docs/webstore/program-policies/)
