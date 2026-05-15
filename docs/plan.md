# eolma-exporter 개발 계획서

## 1. 목표

기존 npay-exporter(네이버페이 전용)를 확장하여, 네이버페이 + 쿠팡 결제/주문내역을 Excel/CSV로 내보내고, eolma 가계부 서비스로 전송하는 통합 Chrome Extension을 개발한다.

## 2. 현재 상태 (완료)

- 네이버페이 `__NEXT_DATA__` 파싱 구현 완료
- 월별/기간별/전체 데이터 수집 구현 완료
- CSV/Excel 다운로드 구현 완료
- 팝업 UI 구현 완료
- 쿠팡 기본 지원 추가 완료

## 2.1 버전 계획

### v1.0.0-alpha (현재)
Chrome Web Store 초기 배포 버전 (2026-05-15)

**포함 기능:**
- 네이버페이 결제내역 수집/다운로드 (Excel, CSV)
- 쿠팡 주문내역 기본 지원
- 월별/기간별/전체 다운로드 옵션
- 플랫폼별 UI 표시 및 진행 상태 표시
- **eolma.de 링크** (가계부 서비스 방문용)

**제외 기능:**
- eolma 서비스 로그인/연동 (다음 버전에서 구현)
- 쿠팡 고급 필터링 (다음 버전에서 개선)

### v1.1.0 (계획)
eolma 서비스 로그인 및 직접 전송 기능 추가

**추가 기능:**
- eolma 로그인/인증 구현
- "eolma로 전송" 버튼 활성화
- 사용자 계정 상태 표시
- 한 번의 클릭으로 수집 및 전송

**개선 사항:**
- 쿠팡 데이터 필드 매핑 개선
- 에러 처리 및 사용자 안내 강화

### v2.0.0 (계획)
추가 플랫폼 지원 및 고급 기능

**예정 기능:**
- 토스, 카카오페이 등 추가 결제 서비스 지원
- 태그/카테고리 기능
- 중복 거래 필터링

## 3. 확장 계획

### Phase 1: 코드 리팩토링 및 구조 개선

기존 네이버페이 전용 코드를 플랫폼 확장이 가능한 구조로 리팩토링한다.

- [x] Content Script를 플랫폼별로 분리 (`content/naverpay.js`, `content/coupang.js`)
- [x] `manifest.json` 업데이트: 쿠팡 URL 패턴 추가 (`host_permissions`, `content_scripts`)
- [x] Background Service Worker에 플랫폼 분기 로직 추가
- [x] 팝업 UI에 현재 활성 플랫폼 표시

### Phase 2: 쿠팡 주문내역 수집 구현

쿠팡 주문내역 페이지를 분석하고 데이터 수집 기능을 구현한다.

- [ ] 쿠팡 주문내역 페이지 구조 분석 (`mc.coupang.com/user/orders`)
  - `__NEXT_DATA__` 또는 유사 SSR 데이터 존재 여부 확인
  - 별도 XHR/Fetch API 호출 패턴 분석
  - 페이지네이션 방식 확인 (URL 파라미터, infinite scroll 등)
  - 인증 방식 확인 (쿠키 기반 예상)
- [ ] 쿠팡 데이터 파싱 로직 구현 (`content/coupang.js`)
- [ ] 쿠팡 다중 페이지 fetch 구현 (Background Worker)
- [ ] 쿠팡 데이터 필드 매핑 정의 및 구현
  - 주문번호, 주문일시, 상품명, 가격, 상태 등
- [ ] 쿠팡 월별/기간별 필터링 구현

### Phase 3: 팝업 UI 통합

두 플랫폼을 하나의 팝업에서 제어할 수 있도록 UI를 개선한다.

- [ ] 팝업 UI에 플랫폼 선택/표시 기능 추가
  - 현재 탭이 네이버페이/쿠팡 페이지인 경우 해당 플랫폼 자동 선택
  - 지원하지 않는 페이지일 때 안내 메시지 표시
- [ ] 플랫폼별 아이콘/색상 구분 (네이버페이: 초록, 쿠팡: 빨강/파랑)
- [ ] 다운로드 파일명에 플랫폼명 포함 (예: `naverpay_2026-05.xlsx`, `coupang_2026-05.xlsx`)

### Phase 4: eolma 서비스 연동 (Mock)

eolma 서비스 API 연동을 mock으로 구현한다.

- [ ] eolma API 클라이언트 모듈 작성 (`eolma/api.js`)
  - `POST /api/transactions` mock 구현
  - 요청 데이터 포맷 정의 (플랫폼, 거래내역 배열, 메타데이터)
  - 성공/실패 응답 시뮬레이션
- [ ] 팝업 UI에 "eolma로 전송" 버튼 추가
  - 전송 전 미리보기 (수집 건수, 기간)
  - 전송 결과 표시 (성공/실패)
- [ ] eolma 서비스 URL 설정 (익스텐션 옵션 페이지 또는 popup 내 설정)
- [ ] 인증 토큰 저장 구조 (`chrome.storage.local`)

### Phase 5: 마무리

- [ ] 에러 핸들링 강화 (네트워크 실패, 로그인 만료 등)
- [ ] 로딩/진행 상태 UI 개선
- [ ] 아이콘 업데이트 (통합 익스텐션 반영)
- [ ] 테스트 (다양한 주문 유형, 대량 데이터, 양 플랫폼 교차 테스트)

## 4. 기술 결정 사항

### 4.1 Content Script 분리 전략

플랫폼마다 페이지 구조가 다르므로 Content Script를 분리한다.

```
content/naverpay.js  → pay.naver.com/pc/history* 에서 동작
content/coupang.js   → mc.coupang.com/user/orders* 에서 동작
```

각 Content Script는 동일한 메시지 인터페이스를 구현한다:
- `GET_CURRENT_PAGE` → 현재 페이지 데이터 반환
- 반환 형식: `{ success, items, totalPage, curPage, itemCount, platform }`

### 4.2 통합 데이터 포맷

플랫폼별 필드가 다르므로 공통 필드와 플랫폼 고유 필드를 분리한다.

**공통 필드:**
| 필드 | 설명 |
|------|------|
| 플랫폼 | `naverpay` / `coupang` |
| 거래일시 | YYYY-MM-DD HH:mm:ss |
| 상품명 | 상품/서비스명 |
| 금액 | 결제/주문 금액 |
| 상태 | 결제완료, 취소 등 |
| 거래ID | 플랫폼별 고유 ID |

**플랫폼 고유 필드:**
- 네이버페이: 가맹점명, 서비스타입, 결제수단코드, 잔여금액
- 쿠팡: 배송상태, 판매자, 옵션 등 (분석 후 확정)

### 4.3 eolma 서비스 API Mock 스펙

```
POST /api/transactions
Content-Type: application/json
Authorization: Bearer {token}

{
  "platform": "naverpay" | "coupang",
  "period": { "start": "2026-05-01", "end": "2026-05-31" },
  "items": [
    {
      "transactionId": "...",
      "date": "2026-05-03T12:04:45+09:00",
      "merchantName": "...",
      "productName": "...",
      "amount": 5000,
      "status": "결제완료",
      "platform": "naverpay",
      "raw": { /* 원본 데이터 */ }
    }
  ]
}
```

Mock 구현에서는 `console.log`로 요청 데이터를 출력하고 성공 응답을 반환한다.

### 4.4 manifest.json 변경 사항

```json
{
  "host_permissions": [
    "https://pay.naver.com/*",
    "https://mc.coupang.com/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://pay.naver.com/pc/history*"],
      "js": ["content/naverpay.js"],
      "run_at": "document_idle"
    },
    {
      "matches": ["https://mc.coupang.com/user/orders*"],
      "js": ["content/coupang.js"],
      "run_at": "document_idle"
    }
  ]
}
```

## 5. 선행 조사 필요 사항

- [ ] **쿠팡 주문내역 페이지 구조 분석** (Phase 2 시작 전 필수)
  - 쿠팡 `mc.coupang.com/user/orders` 페이지의 DOM 구조
  - 데이터 로딩 방식 (`__NEXT_DATA__`, XHR API, SSR 등)
  - 주문 목록 API 엔드포인트 (있을 경우)
  - 페이지네이션 방식
  - 주문 상세 데이터 구조 (필드, 타입)

## 6. 리스크 및 대응

| 리스크 | 대응 |
|--------|------|
| 쿠팡 페이지 구조가 복잡하거나 SPA로 되어있어 파싱이 어려울 수 있음 | DevTools로 네트워크/DOM 분석 → API 호출 방식이면 직접 API fetch |
| 네이버페이/쿠팡이 페이지 구조를 변경하면 동작 불가 | 파서를 모듈화하여 빠른 대응 가능하도록 설계 |
| 쿠팡이 자동 요청을 차단할 수 있음 | 요청 간 딜레이, 사용자 세션 활용 |
| eolma 서비스 API가 확정되지 않음 | Mock으로 구현하고, 인터페이스만 확정 → 나중에 교체 |

## 7. 개발 우선순위

1. **Phase 1** (리팩토링) → 2. **Phase 2** (쿠팡) → 3. **Phase 3** (UI 통합) → 4. **Phase 4** (eolma mock) → 5. **Phase 5** (마무리)

Phase 2는 쿠팡 페이지 구조 분석이 선행되어야 하므로, Phase 1 완료 후 쿠팡 페이지 분석을 먼저 진행한다.
