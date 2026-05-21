# eolma-exporter

네이버페이 + 쿠팡 결제/주문내역을 Excel/CSV로 내보내는 Chrome Extension.

## 개요

네이버페이, 쿠팡에 로그인한 상태에서 각 플랫폼의 결제/주문내역 페이지를 방문하면 익스텐션이 활성화된다. 월별 또는 기간별로 거래내역을 수집하여 Excel/CSV로 다운로드하거나, eolma 가계부 서비스로 데이터를 전송할 수 있다.

## 지원 플랫폼

| 플랫폼 | 대상 페이지 | 데이터 수집 방식 |
|--------|------------|-----------------|
| 네이버페이 | `pay.naver.com/pc/history` | `__NEXT_DATA__` SSR 데이터 파싱 |
| 쿠팡 | `mc.coupang.com/user/orders` | 주문내역 페이지 파싱 (분석 필요) |

## 주요 기능

- **플랫폼별 자동 활성화**: 네이버페이 또는 쿠팡 결제내역 페이지 접속 시 익스텐션 자동 활성화
- **월별/기간별 수집**: 특정 월 또는 시작~종료 기간을 지정하여 거래내역 수집
- **Excel/CSV 다운로드**: 수집한 데이터를 Excel(xlsx) 또는 CSV 형식으로 로컬 다운로드

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
   - 쿠팡: https://mc.coupang.com/user/orders
3. 익스텐션 팝업 클릭
4. 다운로드 범위 선택 (월별 / 기간 / 전체)
5. CSV 또는 Excel 다운로드, 또는 eolma로 전송

## 기술 스택

- Chrome Extension Manifest V3
- JavaScript (Vanilla)
- SheetJS (xlsx) - Excel 파일 생성

## 라이선스

MIT
