# eolma-exporter

네이버페이 + 쿠팡 결제/주문내역을 Excel/CSV로 내보내는 Chrome Extension.

## 개요

네이버페이, 쿠팡에 로그인한 상태에서 각 플랫폼의 결제/주문내역 페이지를 방문하면 익스텐션이 활성화된다. 월별 또는 기간별로 거래내역을 수집하여 Excel/CSV로 다운로드하거나, eolma 가계부 서비스로 데이터를 전송할 수 있다.

## 지원 플랫폼

| 플랫폼 | 대상 페이지 | 데이터 수집 방식 |
|--------|------------|-----------------|
| 네이버페이 | `pay.naver.com/pc/history` | `__NEXT_DATA__` SSR 데이터 파싱 |
| 쿠팡 | `mc.coupang.com/ssr/desktop/order/list` | 로그인 탭의 주문 JSON API 우선, `__NEXT_DATA__` SSR fallback |

쿠팡은 로그인된 주문내역 탭에서 `/ssr/api/myorders/model`을 `requestYear`,
`pageIndex`, `size=10`으로 요청한다. 첫 페이지는 `pageIndex=0`이며, 응답의 `nextYear`와
`nextPageIndex`를 따라 수집한다. JSON API가 거부되거나 형식이 바뀐 경우에는 같은
탭에서 주문내역 HTML을 요청해 `__NEXT_DATA__.props.pageProps.domains.desktopOrder`를
읽는 방식으로 자동 전환한다. 수집 결과는 저장하지 않으며 매번 현재 로그인 세션에서
새로 조회한다.

## 주요 기능

- **플랫폼별 자동 활성화**: 네이버페이 또는 쿠팡 결제내역 페이지 접속 시 익스텐션 자동 활성화
- **월별/기간별 수집**: 특정 월 또는 시작~종료 기간을 지정하여 거래내역 수집
- **전체 기간 수집**: 연도와 페이지 커서를 따라 전체 주문내역 수집
- **Excel/CSV 다운로드**: 수집한 데이터를 Excel(xlsx) 또는 CSV 형식으로 로컬 다운로드
- **수집 안전장치**: 요청 timeout·재시도, 취소, 중복 제거, 반복 커서 감지, 부분 결과 표시

## 설치 및 사용

### 설치

1. 이 저장소를 클론 또는 다운로드
2. Chrome에서 `chrome://extensions` 접속
3. "개발자 모드" 활성화
4. "압축해제된 확장 프로그램을 로드합니다" 클릭 → `src/` 디렉토리 선택

### 사용법

1. 네이버 또는 쿠팡에 로그인
2. 결제/주문내역 페이지 접속
   - 네이버페이: https://pay.naver.com/pc/history
   - 쿠팡: https://mc.coupang.com/ssr/desktop/order/list
3. 익스텐션 팝업 클릭
4. 다운로드 범위 선택 (월별 / 기간 / 전체)
5. CSV 또는 Excel 다운로드, 또는 eolma로 전송

## 기술 스택

- Chrome Extension Manifest V3
- JavaScript (Vanilla)
- SheetJS (xlsx) - Excel 파일 생성

## 라이선스

MIT
