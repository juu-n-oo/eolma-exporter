// eolma.de Content Script
// eolma SPA 는 JWT 를 페이지 localStorage('access_token') 에 저장한다.
// content script 는 같은 origin 의 localStorage 에 접근할 수 있으므로,
// 토큰을 읽어 확장 저장소(chrome.storage.local)에 동기화해 둔다.
// 팝업은 이 캐시된 토큰으로 who-am-i 를 호출해 로그인 여부를 확인한다.

function syncEolmaToken() {
  try {
    const token = localStorage.getItem('access_token');
    if (token) {
      chrome.storage.local.set({ eolmaAccessToken: token });
    } else {
      chrome.storage.local.remove('eolmaAccessToken');
    }
  } catch (e) {
    // localStorage 접근 불가 시 무시
  }
}

// 최초 진입 시 1회 동기화
syncEolmaToken();

// 로그인/로그아웃으로 토큰이 바뀌는 경우를 위해 storage 이벤트도 반영
window.addEventListener('storage', (e) => {
  if (e.key === 'access_token' || e.key === null) {
    syncEolmaToken();
  }
});
