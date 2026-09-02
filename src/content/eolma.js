// eolma.de Content Script
//
// 인증 쿠키는 HttpOnly로 유지한다. 이 스크립트는 쿠키·토큰을 읽거나 저장하지 않고,
// 사용자가 로그인해 둔 eolma 탭에서만 same-origin API 요청을 대신 보낸다.

const SESSION_REQUEST = 'EOLMA_SESSION_REQUEST';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== SESSION_REQUEST) return;

  handleSessionRequest(message)
    .then(sendResponse)
    .catch(() => sendResponse({ success: false, status: 0, code: 'NETWORK' }));
  return true;
});

async function handleSessionRequest(message) {
  if (message.action === 'CHECK_AUTH') return checkAuth();
  if (message.action === 'UPLOAD_STAGING') return uploadStaging(message.payload);
  return { success: false, status: 400, code: 'INVALID_REQUEST' };
}

async function checkAuth() {
  const response = await fetch('/api/auth/who-am-i', {
    credentials: 'include',
    cache: 'no-store'
  });

  if (response.status === 401 || response.status === 403) {
    return { success: true, loggedIn: false };
  }
  if (!response.ok) {
    return { success: false, status: response.status, code: 'HTTP_ERROR' };
  }

  const body = await response.json().catch(() => ({}));
  const user = body?.data ?? body;
  return {
    success: true,
    loggedIn: true,
    user: { name: user?.nickname || user?.email || 'eolma' }
  };
}

async function uploadStaging(payload) {
  if (!Array.isArray(payload) || payload.length === 0) {
    return { success: false, status: 422, code: 'NO_ITEMS' };
  }

  const response = await fetch('/api/staging/transactions/bulk', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    return {
      success: false,
      status: response.status,
      code: response.status === 401 ? 'UNAUTHORIZED' : 'HTTP_ERROR'
    };
  }

  const body = await response.json().catch(() => ({}));
  const data = body?.data ?? body;
  return {
    success: true,
    uploadedCount: Array.isArray(data) ? data.length : payload.length
  };
}
