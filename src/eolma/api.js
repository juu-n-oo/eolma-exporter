// eolma 서비스 API 클라이언트 (mock)
// TODO: 백엔드 완성 후 주석 처리된 fetch 블록을 활성화하고 mock 코드 제거

const EOLMA_BASE_URL = 'http://localhost:3000'; // TODO: 프로덕션 URL로 교체

const eolmaApi = {
  /**
   * 현재 브라우저 세션(쿠키)으로 로그인 여부를 확인한다.
   * @returns {Promise<{ loggedIn: boolean, user?: { name: string } }>}
   */
  async checkAuth() {
    // 실제 구현:
    // try {
    //   const resp = await fetch(`${EOLMA_BASE_URL}/api/auth/me`, { credentials: 'include' });
    //   if (!resp.ok) return { loggedIn: false };
    //   const user = await resp.json();
    //   return { loggedIn: true, user };
    // } catch {
    //   return { loggedIn: false };
    // }

    // Mock: chrome.storage.local 플래그로 로그인 상태 시뮬레이션
    const { eolmaMockLoggedIn, eolmaMockUser } = await chrome.storage.local.get([
      'eolmaMockLoggedIn',
      'eolmaMockUser'
    ]);
    if (eolmaMockLoggedIn) {
      return { loggedIn: true, user: eolmaMockUser || { name: '테스트 사용자' } };
    }
    return { loggedIn: false };
  },

  /**
   * eolma 로그인 페이지를 새 탭에서 연다.
   */
  openLoginPage() {
    chrome.tabs.create({ url: `${EOLMA_BASE_URL}/login` });
  },

  /**
   * 거래내역을 eolma 서비스로 전송한다. (쿠키 세션 인증)
   * @param {object} options
   * @param {string} options.platform - 'naverpay' | 'coupang'
   * @param {Array}  options.items    - 포맷된 거래내역 배열
   * @param {object|null} options.period - { start, end } | null
   * @returns {Promise<{ success: boolean, uploadedCount?: number, message?: string }>}
   */
  async send({ platform, items, period }) {
    const payload = {
      platform,
      period: period || null,
      items: items.map(item => eolmaApi._toTransaction(item, platform))
    };

    console.log('[eolma] POST /api/transactions', JSON.stringify(payload, null, 2));

    // 실제 구현:
    // const resp = await fetch(`${EOLMA_BASE_URL}/api/transactions`, {
    //   method: 'POST',
    //   credentials: 'include',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload)
    // });
    // if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    // return await resp.json();

    // Mock
    await new Promise(r => setTimeout(r, 800));
    return { success: true, uploadedCount: items.length };
  },

  _toTransaction(item, platform) {
    if (platform === 'naverpay') {
      return {
        transactionId: item.결제ID,
        date: item.결제일시,
        merchantName: item.가맹점명,
        productName: item.상품명,
        amount: item.결제금액,
        status: item.결제상태,
        platform,
        raw: item
      };
    }
    return {
      transactionId: item.주문ID,
      date: item.주문일시,
      merchantName: item.판매자,
      productName: item.상품명,
      amount: item.주문금액,
      status: item.주문상태,
      platform,
      raw: item
    };
  }
};
