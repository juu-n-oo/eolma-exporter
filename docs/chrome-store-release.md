# Chrome Web Store 배포 가이드

현재 배포 준비 버전은 **0.3.1**이다. 스토어에 입력할 소개 문구·개인정보 보호 관행·권한 정당성은 [등록 정보 문서](./chrome-web-store-listing.ko.md)를 단일 기준으로 사용한다.

## 패키지 만들기

```bash
cd /Users/joon/Workspace/eolma/eolma-exporter
bash scripts/package-chrome-store.sh
```

스크립트는 다음을 수행한다.

- Manifest V3, 버전, 최소 권한, 아이콘·스크린샷 규격, 토큰/웹 저장소 미사용 여부 확인
- 자동 테스트 실행
- `dist/eolma-exporter-v0.3.1.zip` 생성
- ZIP 최상위에 `manifest.json`이 있는지 확인하고 SHA-256 출력

`dist/`는 배포 산출물이며 Git에 포함하지 않는다.

## 수동 점검

패키지 전에는 `chrome://extensions`에서 `src/`를 압축 해제해 로드하고 아래를 점검한다.

1. 네이버페이와 쿠팡 주문내역에서 월별·기간별·전체 기간 다운로드가 되는지
2. eolma 탭이 없을 때 전송이 비활성화되고 안내가 표시되는지
3. 로그인한 eolma 탭을 열면 전송이 활성화되고, 전송 후 검토 대기함에 내역이 들어가는지
4. 확장 프로그램 저장소에 eolma 토큰이 남지 않는지

## 개발자 대시보드 제출

1. Chrome Web Store Developer Dashboard에서 새 항목 또는 새 버전을 만든다.
2. 생성한 ZIP, 아이콘, 프로모션 타일, 스크린샷을 업로드한다.
3. [등록 정보 문서](./chrome-web-store-listing.ko.md)의 설명·지원 이메일·개인정보처리방침 URL을 입력한다.
4. 개인정보 보호 관행과 권한 정당성을 같은 문서 기준으로 신고한다.
5. 검토 후 심사에 제출한다.

실제 계정 등록과 제출·공개는 개발자 계정 소유자가 수행한다.
