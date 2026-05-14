# eolma-exporter

네이버페이 + 쿠팡 결제/주문내역을 Excel/CSV로 내보내고, eolma 서비스로 전송하는 Chrome Extension.

## 개요

사용자가 네이버페이 또는 쿠팡에 로그인한 상태에서 결제/주문내역 페이지를 방문하면, 익스텐션이 활성화되어 거래내역을 수집한다. 월별/기간별로 데이터를 Excel 또는 CSV로 다운로드하거나, eolma 가계부 서비스로 HTTP POST 전송할 수 있다.

이 프로젝트는 [eolma 가계부 서비스](docs/eolma-propsal.md)의 브라우저 플러그인 컴포넌트이다.

## 지원 플랫폼

### 네이버페이

- **대상 URL**: `https://pay.naver.com/pc/history*`
- **수집 방식**: `__NEXT_DATA__` SSR 데이터 파싱
- **인증**: 브라우저 쿠키 기반 (네이버 로그인 세션)

#### 데이터 경로
```
__NEXT_DATA__.props.pageProps.dehydratedState.queries[0].state.data.pages[0].items[]
```

#### 결제내역 항목 필드
| 필드 | 경로 | 설명 | 예시 |
|------|------|------|------|
| 결제ID | `_id` | 고유 결제 식별자 | `N20260503NP8144309762` |
| 서비스타입 | `serviceType` | 결제 유형 | `SIMPLE_PAYMENT` |
| 결제상태 | `status.text` | 한글 상태명 | `결제완료`, `결제취소` |
| 상태코드 | `status.name` | 상태 코드 | `PAYMENT_COMPLETED`, `CANCELLED` |
| 가맹점명 | `merchantName` | 결제 상점 | `Apple Services` |
| 상품명 | `product.name` | 상품/서비스명 | `Google One` |
| 결제금액 | `product.price` | 결제 금액 (원) | `5000` |
| 잔여금액 | `product.restAmount` | 남은 금액 | `5000` |
| 결제일시 | `date` | epoch milliseconds | `1777782285000` |
| 결제수단코드 | `additionalData.primaryPayMeansCode` | 결제수단 | `ODADNONE` |

#### 페이지네이션
- URL 패턴: `https://pay.naver.com/pc/history?page=N` (N = 1, 2, 3, ...)
- 매 페이지마다 SSR로 `__NEXT_DATA__`에 데이터 포함
- 페이지당 15건
- 페이지 메타: `pages[0].totalPage`, `pages[0].curPage`, `pages[0].itemCount`

### 쿠팡

- **대상 URL**: `https://mc.coupang.com/user/orders*`
- **수집 방식**: 주문내역 페이지 분석 필요 (Phase 2에서 구현)
- **인증**: 브라우저 쿠키 기반 (쿠팡 로그인 세션)
- **참고**: 쿠팡의 `__NEXT_DATA__` 또는 유사 SSR 데이터 구조, API 엔드포인트 분석이 선행되어야 함

## eolma 서비스 연동

- 수집한 거래내역을 eolma 서비스로 HTTP POST 전송
- 현재 mock 구현 (실제 서비스 연동은 eolma 백엔드 완성 후)
- API 엔드포인트: `POST /api/transactions` (mock)
- 서비스에 로그인되어 있으면 직접 업로드, 아니면 Excel/CSV 다운로드

## UI 디자인

익스텐션 UI 개발 시 [eolma 디자인 가이드](docs/design-guide.md)를 따른다. 주요 원칙:

- **컬러**: 액센트 `#007AFF`, 배경 `#FFFFFF` / `#F5F5F7`, 텍스트 `#1D1D1F` / `#86868B`
- **폰트**: 시스템 폰트 스택 (`-apple-system, BlinkMacSystemFont, 'Segoe UI', ...`)
- **모서리**: 카드 12px, 버튼/입력 8px
- **버튼**: Primary `bg-primary text-white rounded-lg`, Secondary `bg-gray-100 text-gray-900 rounded-lg`
- **입력 필드**: 테두리 없이 배경색(`#F5F5F7`)으로 구분, 포커스 시 ring
- **간격**: 넉넉한 여백 (카드 내부 20px, 요소 간 12px)
- **모션**: 150~300ms, `ease-out`

상세 스타일은 `docs/design-guide.md` 참조.

## 기술 스택

- Chrome Extension Manifest V3
- JavaScript (Vanilla)
- SheetJS (xlsx 라이브러리) - Excel 파일 생성용

## 프로젝트 구조

```
eolma-exporter/
├── CLAUDE.md
├── README.md
├── docs/
│   ├── plan.md              # 개발 계획서
│   ├── design-guide.md      # UI 디자인 가이드
│   └── eolma-propsal.md     # eolma 가계부 서비스 기획서
├── src/
│   ├── manifest.json        # Chrome Extension 매니페스트
│   ├── background.js        # Service Worker (다중 페이지 fetch)
│   ├── popup.html           # 팝업 UI
│   ├── popup.js             # 팝업 로직
│   ├── content/
│   │   ├── naverpay.js      # 네이버페이 Content Script
│   │   └── coupang.js       # 쿠팡 Content Script
│   ├── lib/
│   │   └── xlsx.min.js      # SheetJS 라이브러리
│   └── eolma/
│       └── api.js           # eolma 서비스 API 클라이언트 (mock)
├── icons/               # → src/icons/로 이동 예정
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── test/                    # 테스트 데이터 및 스크립트
```

## 개발/빌드

- 별도 빌드 과정 없이 `src/` 디렉토리를 Chrome에서 "압축해제된 확장 프로그램 로드"로 로드하여 개발
- 추후 필요 시 webpack/vite 등 번들러 도입 가능

## 핵심 원리

1. 사용자가 네이버페이 또는 쿠팡 결제/주문내역 페이지에 접속
2. 해당 플랫폼의 Content Script가 페이지에서 거래 데이터를 파싱
3. 다중 페이지 데이터는 Background Service Worker에서 fetch로 수집
4. 파싱된 데이터를 Excel/CSV로 변환하여 다운로드하거나 eolma 서비스로 전송
