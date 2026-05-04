# npay-exporter

네이버페이 결제내역을 Excel/CSV로 내보내는 Chrome Extension.

## 개요

사용자가 네이버에 로그인한 상태에서 네이버페이 결제내역 페이지(`https://pay.naver.com/pc/history`)를 방문하면, 페이지에 내장된 결제내역 데이터를 Excel 또는 CSV 형식으로 다운로드할 수 있게 해주는 크롬 확장 프로그램이다.

## 핵심 원리

네이버페이 결제내역 페이지는 Next.js SSR 앱이며, 결제내역 데이터는 별도 API 호출이 아닌 **`__NEXT_DATA__`** 스크립트 태그에 JSON으로 내장되어 있다.

1. 사용자가 네이버페이 결제내역 페이지에 접속
2. Content Script가 페이지 DOM에서 `__NEXT_DATA__`를 읽어 결제내역 파싱
3. 다중 페이지 데이터는 `fetch('https://pay.naver.com/pc/history?page=N')`로 HTML을 받아 `__NEXT_DATA__` 추출
4. 파싱된 데이터를 Excel(xlsx) 또는 CSV로 변환하여 다운로드

### 데이터 경로
```
__NEXT_DATA__.props.pageProps.dehydratedState.queries[0].state.data.pages[0].items[]
```

### 결제내역 항목 필드
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

### 페이지네이션
- URL 패턴: `https://pay.naver.com/pc/history?page=N` (N = 1, 2, 3, ...)
- 매 페이지마다 SSR로 `__NEXT_DATA__`에 데이터 포함 (별도 XHR/Fetch 호출 없음)
- 쿠키 기반 인증 (로그인 세션)
- 페이지당 15건
- 페이지 메타: `pages[0].totalPage` (총 페이지 수), `pages[0].curPage` (현재 페이지), `pages[0].itemCount` (항목 수)

## 기술 스택

- Chrome Extension Manifest V3
- JavaScript (Vanilla)
- SheetJS (xlsx 라이브러리) - Excel 파일 생성용

## 프로젝트 구조

```
npay-exporter/
├── CLAUDE.md
├── docs/
│   └── plan.md          # 개발 계획서
├── src/
│   ├── manifest.json    # Chrome Extension 매니페스트
│   ├── background.js    # Service Worker
│   ├── content.js       # Content Script (__NEXT_DATA__ 파싱)
│   ├── popup.html       # 팝업 UI
│   ├── popup.js         # 팝업 로직
│   └── lib/
│       └── xlsx.min.js  # SheetJS 라이브러리
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## 개발/빌드

- 별도 빌드 과정 없이 `src/` 디렉토리를 Chrome에서 "압축해제된 확장 프로그램 로드"로 로드하여 개발
- 추후 필요 시 webpack/vite 등 번들러 도입 가능
