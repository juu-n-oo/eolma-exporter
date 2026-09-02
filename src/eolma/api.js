// eolma 서비스 API 클라이언트

const EOLMA_BASE_URL = 'https://eolma.de';
const EOLMA_SESSION_REQUEST = 'EOLMA_SESSION_REQUEST';

const eolmaApi = {
  /**
   * eolma 탭에서 로그인 여부를 확인한다.
   *
   * eolma의 인증 쿠키는 HttpOnly이므로 확장 프로그램은 읽거나 저장하지 않는다.
   * 대신 사용자가 열어 둔 eolma 탭의 content script가 same-origin 요청을 보내며,
   * 브라우저가 해당 탭의 쿠키를 자동으로 첨부한다.
   */
  async checkAuth() {
    try {
      const result = await eolmaApi._requestSession('CHECK_AUTH');
      return result.loggedIn
        ? { loggedIn: true, user: result.user }
        : { loggedIn: false };
    } catch (error) {
      return { loggedIn: false, reason: error.code };
    }
  },

  /** eolma 로그인 페이지를 새 탭에서 연다. */
  openLoginPage() {
    chrome.tabs.create({ url: `${EOLMA_BASE_URL}/login` });
  },

  /** eolma 홈을 새 탭에서 연다. */
  openHome() {
    chrome.tabs.create({ url: EOLMA_BASE_URL });
  },

  /** 백엔드 서버 가용 여부를 확인한다. (public /api/health) */
  async checkHealth() {
    try {
      const resp = await fetch(`${EOLMA_BASE_URL}/api/health`, { method: 'GET' });
      return resp.ok;
    } catch {
      return false;
    }
  },

  /**
   * 수집한 거래내역을 eolma의 staging으로 다건 업로드한다.
   * 전송은 사용자가 로그인해 열어 둔 eolma 탭을 통해서만 이뤄진다.
   */
  async send({ platform, items }) {
    const payload = items
      .map(item => eolmaApi._toStaging(item, platform))
      .filter(s => (s.amount > 0 || (s.amount === 0 && s.memo)) && /^\d{4}-\d{2}-\d{2}$/.test(s.transactedAt));

    if (payload.length === 0) {
      throw eolmaApi._err('NO_ITEMS', 422);
    }

    const result = await eolmaApi._requestSession('UPLOAD_STAGING', payload);
    return { success: true, uploadedCount: result.uploadedCount ?? payload.length };
  },

  async _requestSession(action, payload) {
    let result;
    try {
      result = await chrome.runtime.sendMessage({
        type: EOLMA_SESSION_REQUEST,
        action,
        payload
      });
    } catch {
      throw eolmaApi._err('EOLMA_TAB_REQUIRED', 401);
    }

    if (!result?.success) {
      throw eolmaApi._err(result?.code || 'NETWORK', result?.status ?? 0);
    }
    return result;
  },

  _err(code, status) {
    const error = new Error(code);
    error.code = code;
    error.status = status;
    return error;
  },

  /** 수집 항목 1건을 staging bulk API 요청 형식으로 변환한다. */
  _toStaging(item, platform) {
    let staging;
    if (platform === 'naverpay') {
      staging = {
        amount: Number(item.결제금액) || 0,
        title: [item.가맹점명, item.상품명].filter(Boolean).join(' · '),
        transactedAt: String(item.결제일시 || '').slice(0, 10)
      };
    } else {
      const amount = Number(item.주문금액) || 0;
      staging = {
        amount,
        title: [item.판매자, item.상품명].filter(Boolean).join(' · '),
        transactedAt: String(item.주문일시 || '').slice(0, 10)
      };

      const status = String(item.주문상태 || '');
      if (status.includes('취소완료') || status.includes('반품완료')) {
        staging.amount = 0;
        staging.memo = `주문상태: ${status} · 원금액 ${amount.toLocaleString('ko-KR')}원`;
      } else if (status.includes('반품신청')) {
        staging.memo = '주문상태: 반품신청';
      }
    }

    const source = eolmaApi.SOURCE_BY_PLATFORM[platform];
    if (source) staging.source = source;
    return staging;
  },

  SOURCE_BY_PLATFORM: {
    naverpay: 'NAVER_PAY',
    coupang: 'COUPANG'
  }
};
