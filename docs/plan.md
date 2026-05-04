# npay-exporter 개발 계획서

## 1. 목표

네이버페이 결제내역(`https://pay.naver.com/pc/history`)을 Excel/CSV로 내보내는 Chrome Extension 개발.

## 2. 동작 흐름

```
[사용자] 네이버 로그인 → 네이버페이 결제내역 페이지 접속
        ↓
[Content Script] 페이지 DOM에서 __NEXT_DATA__ 읽기 → 결제내역 파싱
        ↓
[Extension] 팝업 UI에서 다운로드 옵션 제공 (CSV / Excel, 페이지 범위)
        ↓
[사용자] 원하는 형식 선택 → 파일 다운로드
```

## 3. API 분석 결과 (완료)

### 3.1 데이터 소스
네이버페이 결제내역 페이지는 **Next.js SSR** 앱이며, 결제내역 데이터는 별도 XHR/Fetch API가 아닌 **`__NEXT_DATA__` 스크립트 태그**에 JSON으로 내장됨.

- 데이터 경로: `__NEXT_DATA__.props.pageProps.dehydratedState.queries[0].state.data.pages[0].items[]`
- 페이지네이션: URL 쿼리 파라미터 `?page=N`으로 각 페이지 SSR 로드
- 인증: 브라우저 쿠키 기반 (네이버 로그인 세션)
- 페이지당 15건
- 페이지 메타정보: `pages[0].totalPage` (총 페이지 수), `pages[0].curPage` (현재 페이지), `pages[0].itemCount` (항목 수)
- 전체 수집 전략: 1페이지 fetch → `totalPage` 확인 → `page=2`부터 `page=totalPage`까지 순차 fetch

### 3.2 결제내역 항목 데이터 구조
```json
{
  "_id": "N20260503NP8144309762",
  "serviceType": "SIMPLE_PAYMENT",
  "status": {
    "name": "PAYMENT_COMPLETED",
    "text": "결제완료",
    "color": "BLACK"
  },
  "merchantNo": "201042344",
  "merchantName": "Apple Services",
  "product": {
    "name": "Apple Services",
    "imgUrl": "https://...",
    "infoUrl": "https://www.apple.com",
    "price": 5000,
    "restAmount": 5000
  },
  "date": 1777782285000,
  "additionalData": {
    "primaryPayMeansCode": "ODADNONE",
    "payId": "20260503NP8144309762",
    "isMembership": false,
    "isBranch": false
  }
}
```

### 3.3 내보낼 필드 매핑
| 엑셀 컬럼명 | JSON 경로 | 변환 | 예시 |
|-------------|-----------|------|------|
| 결제일시 | `date` | epoch ms → YYYY-MM-DD HH:mm:ss | 2026-05-03 12:04:45 |
| 결제상태 | `status.text` | 그대로 | 결제완료 |
| 가맹점명 | `merchantName` | 그대로 | Apple Services |
| 상품명 | `product.name` | 그대로 | Apple Services |
| 결제금액 | `product.price` | 숫자 | 5000 |
| 잔여금액 | `product.restAmount` | 숫자 | 5000 |
| 결제ID | `_id` | 그대로 | N20260503NP8144309762 |
| 서비스타입 | `serviceType` | 그대로 | SIMPLE_PAYMENT |
| 결제수단코드 | `additionalData.primaryPayMeansCode` | 그대로 | ODADNONE |

## 4. 개발 단계

### Phase 1: 프로젝트 셋업
- [x] 네이버페이 결제내역 페이지 API 분석
- [x] API 응답 데이터 구조 문서화
- [ ] Chrome Extension 기본 구조 생성 (Manifest V3)

### Phase 2: 핵심 기능 구현
- [ ] Content Script에서 `__NEXT_DATA__` 파싱하여 결제내역 추출
- [ ] Content Script → Popup 메시지 통신 구현
- [ ] 팝업 UI 구현 (다운로드 버튼, 형식 선택)
- [ ] CSV 변환 및 다운로드 기능
- [ ] Excel(xlsx) 변환 및 다운로드 기능 (SheetJS 사용)

### Phase 3: 사용성 개선
- [ ] 다중 페이지 일괄 다운로드 (fetch로 page=N HTML 가져와서 __NEXT_DATA__ 파싱)
- [ ] 날짜 범위 필터링 기능
- [ ] 로딩 상태 및 에러 처리 UI
- [ ] 네이버페이 페이지가 아닐 때 확장 비활성화 표시

### Phase 4: 마무리
- [ ] 아이콘 제작
- [ ] 테스트 (다양한 결제 유형, 대량 데이터)
- [ ] Chrome Web Store 배포 준비

## 5. 주요 기술 결정

### 5.1 데이터 수집 방식: `__NEXT_DATA__` 파싱 (확정)

네이버페이가 별도 결제내역 API를 호출하지 않고 Next.js SSR로 데이터를 내장하므로:

- **현재 페이지**: Content Script가 DOM에서 `document.getElementById('__NEXT_DATA__')`로 JSON 파싱
- **다른 페이지**: Background Service Worker에서 `fetch('https://pay.naver.com/pc/history?page=N', {credentials: 'include'})`로 HTML을 받아 `__NEXT_DATA__` JSON 추출

### 5.2 Excel 생성
- SheetJS(`xlsx`) 라이브러리 사용
- CDN 대신 로컬 번들로 포함 (오프라인 동작 보장)

## 6. 보안 고려사항
- 사용자의 네이버 로그인 세션(쿠키)은 읽거나 저장하지 않음
- 다중 페이지 fetch 시 브라우저가 자동으로 쿠키를 포함 (별도 토큰 저장 없음)
- 수집한 결제내역 데이터는 외부로 전송하지 않으며, 로컬에서만 처리

## 7. 제약 사항 및 리스크
- 네이버페이가 Next.js 구조나 `__NEXT_DATA__` 스키마를 변경하면 동작하지 않을 수 있음
- `dehydratedState.queries` 배열에서 결제내역 쿼리의 인덱스가 변경될 수 있음
- 네이버 측에서 비정상 요청으로 판단하여 차단할 가능성 있음 (다중 페이지 fetch 시)
