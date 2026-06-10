// eolma 서비스 API 클라이언트

const EOLMA_BASE_URL = 'https://eolma.de';

const eolmaApi = {
  /**
   * eolma 로그인 여부를 확인한다.
   *
   * eolma SPA 는 JWT 를 localStorage 에 저장하고 Authorization: Bearer 로 전송한다(쿠키 미사용).
   * content/eolma.js 가 eolma.de 방문 시 토큰을 chrome.storage.local 로 동기화해 두므로,
   * 그 토큰으로 who-am-i 를 호출한다. (MV3 host_permission 덕에 CORS 우회)
   *
   * @returns {Promise<{ loggedIn: boolean, user?: { name: string } }>}
   */
  async checkAuth() {
    const { eolmaAccessToken } = await chrome.storage.local.get('eolmaAccessToken');
    if (!eolmaAccessToken) return { loggedIn: false };

    try {
      const resp = await fetch(`${EOLMA_BASE_URL}/api/auth/who-am-i`, {
        headers: { Authorization: `Bearer ${eolmaAccessToken}` }
      });
      if (!resp.ok) {
        // 토큰 만료/무효 — 캐시 정리 후 미로그인 처리
        if (resp.status === 401) chrome.storage.local.remove('eolmaAccessToken');
        return { loggedIn: false };
      }
      const body = await resp.json();
      const user = body?.data ?? body; // { code, message, data } 래퍼 해제
      return { loggedIn: true, user: { name: user?.nickname || user?.email || 'eolma' } };
    } catch {
      return { loggedIn: false };
    }
  },

  /**
   * eolma 로그인 페이지를 새 탭에서 연다.
   */
  openLoginPage() {
    chrome.tabs.create({ url: `${EOLMA_BASE_URL}/login` });
  },

  /**
   * eolma 홈을 새 탭에서 연다.
   */
  openHome() {
    chrome.tabs.create({ url: EOLMA_BASE_URL });
  },

  /**
   * 백엔드 서버 가용 여부를 확인한다. (public /api/health)
   * @returns {Promise<boolean>}
   */
  async checkHealth() {
    try {
      const resp = await fetch(`${EOLMA_BASE_URL}/api/health`, { method: 'GET' });
      return resp.ok;
    } catch {
      return false;
    }
  },

  /**
   * 수집한 거래내역을 eolma 의 staging 으로 다건 업로드한다.
   * content/eolma.js 가 동기화한 access token 으로 Bearer 인증한다.
   *
   * 실패 시 status 프로퍼티를 가진 Error 를 throw 한다:
   *   401(미인증/만료) · 403(권한없음) · 5xx(서버오류) · 0(네트워크) · 422(보낼 항목 없음)
   *
   * @param {object} options
   * @param {string} options.platform - 'naverpay' | 'coupang'
   * @param {Array}  options.items    - content script 가 포맷한 거래내역 배열
   * @returns {Promise<{ success: boolean, uploadedCount: number }>}
   */
  async send({ platform, items }) {
    const { eolmaAccessToken } = await chrome.storage.local.get('eolmaAccessToken');
    if (!eolmaAccessToken) {
      throw eolmaApi._err('NO_AUTH', 401);
    }

    // staging 적재 형식으로 변환 — amount>0, 유효한 날짜만 전송
    const payload = items
      .map(item => eolmaApi._toStaging(item, platform))
      .filter(s => s.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(s.transactedAt));

    if (payload.length === 0) {
      throw eolmaApi._err('NO_ITEMS', 422);
    }

    let resp;
    try {
      resp = await fetch(`${EOLMA_BASE_URL}/api/staging/transactions/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${eolmaAccessToken}`
        },
        body: JSON.stringify(payload)
      });
    } catch {
      throw eolmaApi._err('NETWORK', 0);
    }

    if (resp.status === 401) {
      chrome.storage.local.remove('eolmaAccessToken');
      throw eolmaApi._err('UNAUTHORIZED', 401);
    }
    if (!resp.ok) {
      throw eolmaApi._err(`HTTP ${resp.status}`, resp.status);
    }

    const body = await resp.json().catch(() => ({}));
    const data = body?.data ?? body;
    return { success: true, uploadedCount: Array.isArray(data) ? data.length : payload.length };
  },

  _err(message, status) {
    const e = new Error(message);
    e.status = status;
    return e;
  },

  _toStaging(item, platform) {
    if (platform === 'naverpay') {
      return {
        amount: Number(item.결제금액) || 0,
        description: [item.가맹점명, item.상품명].filter(Boolean).join(' · '),
        transactedAt: String(item.결제일시 || '').slice(0, 10)
      };
    }
    return {
      amount: Number(item.주문금액) || 0,
      description: [item.판매자, item.상품명].filter(Boolean).join(' · '),
      transactedAt: String(item.주문일시 || '').slice(0, 10)
    };
  }
};
