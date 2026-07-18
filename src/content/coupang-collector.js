// 쿠팡 주문내역 수집 코어. 브라우저 content script와 Node 테스트에서 함께 사용한다.
(function initCoupangCollector(globalScope) {
  const API_PAGE_SIZE = 10;
  const REQUEST_TIMEOUT_MS = 15_000;
  const MAX_RETRIES = 2;
  const RETRY_BASE_DELAY_MS = 500;

  class CollectorError extends Error {
    constructor(message, code = 'COLLECT_ERROR', status = 0) {
      super(message);
      this.name = 'CollectorError';
      this.code = code;
      this.status = status;
    }
  }

  const sleep = (ms, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new CollectorError('수집이 취소되었습니다.', 'CANCELLED'));
      return;
    }

    const onAbort = () => {
      clearTimeout(timer);
      reject(new CollectorError('수집이 취소되었습니다.', 'CANCELLED'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });

  function errorCodeForStatus(status) {
    if (status === 401 || status === 403) return 'AUTH_ERROR';
    if (status === 429) return 'RATE_LIMIT';
    return 'HTTP_ERROR';
  }

  function errorMessageForStatus(status) {
    if (status === 401 || status === 403) {
      return '로그인이 만료되었거나 쿠팡이 요청을 거부했습니다. 쿠팡 주문내역 페이지를 새로고침한 뒤 다시 시도해주세요.';
    }
    if (status === 429) return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
    if (status >= 500) return `쿠팡 서버 오류가 발생했습니다. (HTTP ${status})`;
    return `주문내역을 불러오지 못했습니다. (HTTP ${status})`;
  }

  function parseRetryAfter(value) {
    if (!value) return null;
    const seconds = Number(value);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const dateMs = Date.parse(value);
    return Number.isFinite(dateMs) ? Math.max(0, dateMs - Date.now()) : null;
  }

  async function fetchTextWithRetry(fetchImpl, url, options, signal) {
    let lastError;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (signal?.aborted) throw new CollectorError('수집이 취소되었습니다.', 'CANCELLED');

      const controller = new AbortController();
      const abortFromParent = () => controller.abort();
      signal?.addEventListener('abort', abortFromParent, { once: true });
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetchImpl(url, { ...options, signal: controller.signal });
        if (response.ok) {
          // timeout과 사용자 취소는 응답 헤더뿐 아니라 본문 수신이 끝날 때까지 유지한다.
          const body = await response.text();
          return { response, body };
        }

        const retryable = response.status === 429 || response.status >= 500;
        const error = new CollectorError(
          errorMessageForStatus(response.status),
          errorCodeForStatus(response.status),
          response.status
        );
        if (!retryable || attempt === MAX_RETRIES) throw error;

        lastError = error;
        const retryAfter = parseRetryAfter(response.headers?.get?.('retry-after'));
        await sleep(retryAfter ?? RETRY_BASE_DELAY_MS * (2 ** attempt), signal);
      } catch (error) {
        if (signal?.aborted) throw new CollectorError('수집이 취소되었습니다.', 'CANCELLED');
        if (error instanceof CollectorError && error.status > 0) {
          if (error.status !== 429 && error.status < 500) throw error;
          lastError = error;
        } else {
          lastError = new CollectorError(
            controller.signal.aborted
              ? '쿠팡 응답 시간이 초과되었습니다.'
              : '네트워크 연결을 확인해주세요.',
            controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR'
          );
        }

        if (attempt === MAX_RETRIES) throw lastError;
        await sleep(RETRY_BASE_DELAY_MS * (2 ** attempt), signal);
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', abortFromParent);
      }
    }

    throw lastError;
  }

  function validatePage(raw) {
    if (!raw || !Array.isArray(raw.orderList)) {
      throw new CollectorError('쿠팡 주문내역 응답 형식이 올바르지 않습니다.', 'SCHEMA_ERROR');
    }

    const pageIndex = Number(raw.pageIndex);
    const nextPageIndex = raw.nextPageIndex == null ? null : Number(raw.nextPageIndex);
    const nextYear = raw.nextYear == null ? null : Number(raw.nextYear);

    if (!Number.isInteger(pageIndex) || pageIndex < 0) {
      throw new CollectorError('쿠팡 페이지 번호가 올바르지 않습니다.', 'SCHEMA_ERROR');
    }
    if (raw.hasNext && (!Number.isInteger(nextPageIndex) || nextPageIndex < 0 || !Number.isInteger(nextYear))) {
      throw new CollectorError('쿠팡 다음 페이지 정보가 올바르지 않습니다.', 'INVALID_CURSOR');
    }

    return {
      orders: raw.orderList,
      pageIndex,
      hasNext: Boolean(raw.hasNext),
      nextPageIndex,
      nextYear,
      pageSize: Number.isInteger(Number(raw.size)) ? Number(raw.size) : null,
      partial: Boolean(raw.partial)
    };
  }

  function looksLikeHtml(text) {
    return /^\s*</.test(text);
  }

  function looksLikeLoginPage(text, responseUrl = '') {
    return /\/login(?:[/?#]|$)|member\/login/i.test(responseUrl)
      || /<title[^>]*>[^<]*로그인[^<]*<\/title>/i.test(text)
      || /(?:id|class)=["'][^"']*(?:login-form|login__form|member-login)[^"']*["']/i.test(text);
  }

  async function fetchApiPage(fetchImpl, cursor, requestedSize, signal) {
    const sizes = [requestedSize];
    let lastError;

    for (const size of sizes) {
      const params = new URLSearchParams({
        requestYear: String(cursor.year),
        pageIndex: String(cursor.pageIndex),
        size: String(size)
      });

      try {
        const { response, body: text } = await fetchTextWithRetry(fetchImpl, `/ssr/api/myorders/model?${params}`, {
          credentials: 'include',
          headers: { Accept: 'application/json' }
        }, signal);
        if (looksLikeHtml(text)) {
          const code = looksLikeLoginPage(text, response.url) ? 'AUTH_ERROR' : 'API_UNAVAILABLE';
          throw new CollectorError('쿠팡 주문 API 대신 HTML 응답을 받았습니다.', code);
        }

        let raw;
        try {
          raw = JSON.parse(text);
        } catch {
          throw new CollectorError('쿠팡 주문 API 응답을 해석할 수 없습니다.', 'SCHEMA_ERROR');
        }

        const page = validatePage(raw);
        if (page.pageSize != null && page.pageSize !== size) {
          throw new CollectorError('쿠팡이 요청과 다른 페이지 크기를 반환했습니다.', 'SCHEMA_ERROR');
        }
        return { ...page, transport: 'api', pageSize: page.pageSize || size };
      } catch (error) {
        if (error.code === 'CANCELLED') throw error;
        lastError = error;
        break;
      }
    }

    throw lastError;
  }

  function parseHtmlPage(html, cursor) {
    if (looksLikeLoginPage(html)) {
      throw new CollectorError('쿠팡 로그인이 필요합니다.', 'AUTH_ERROR');
    }

    const match = html.match(/<script\s+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!match) throw new CollectorError('쿠팡 주문내역 HTML에서 데이터를 찾을 수 없습니다.', 'SCHEMA_ERROR');

    let nextData;
    try {
      nextData = JSON.parse(match[1]);
    } catch {
      throw new CollectorError('쿠팡 주문내역 HTML을 해석할 수 없습니다.', 'SCHEMA_ERROR');
    }

    const desktopOrder = nextData?.props?.pageProps?.domains?.desktopOrder;
    const pagination = desktopOrder?.orderPagination || {};
    return validatePage({
      orderList: desktopOrder?.orderList,
      pageIndex: pagination.pageIndex ?? cursor.pageIndex,
      hasNext: pagination.hasNext,
      nextPageIndex: pagination.nextPageIndex,
      nextYear: pagination.nextYear ?? cursor.year,
      partial: false
    });
  }

  async function fetchHtmlPage(fetchImpl, cursor, signal) {
    const params = new URLSearchParams({
      requestYear: String(cursor.year),
      pageIndex: String(cursor.pageIndex)
    });
    const { body: html } = await fetchTextWithRetry(fetchImpl, `/ssr/desktop/order/list?${params}`, {
      credentials: 'include'
    }, signal);
    return { ...parseHtmlPage(html, cursor), transport: 'html', pageSize: null };
  }

  function orderTimestamp(order) {
    const value = order?.orderedAt;
    if (value == null || value === '') return null;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function orderKey(order) {
    if (order?.orderId != null && String(order.orderId)) return `id:${order.orderId}`;
    return `fallback:${order?.orderedAt || ''}:${order?.title || ''}:${order?.totalProductPrice || ''}`;
  }

  async function collect(options) {
    const {
      fetchImpl,
      startMonth = null,
      endMonth = null,
      all = false,
      signal,
      onProgress = () => {}
    } = options;

    if (typeof fetchImpl !== 'function') throw new CollectorError('fetch 구현이 필요합니다.', 'CONFIG_ERROR');

    let startMs = null;
    let endMs = null;
    let initialYear = new Date().getFullYear();
    let minimumYear = null;

    if (!all) {
      if (!/^\d{4}-\d{2}$/.test(startMonth || '') || !/^\d{4}-\d{2}$/.test(endMonth || '')) {
        throw new CollectorError('수집 기간이 올바르지 않습니다.', 'INVALID_RANGE');
      }
      const [startYear, startMon] = startMonth.split('-').map(Number);
      const [endYear, endMon] = endMonth.split('-').map(Number);
      startMs = new Date(startYear, startMon - 1, 1, 0, 0, 0, 0).getTime();
      endMs = new Date(endYear, endMon, 0, 23, 59, 59, 999).getTime();
      if (startMs > endMs) throw new CollectorError('시작 월은 종료 월보다 늦을 수 없습니다.', 'INVALID_RANGE');
      initialYear = endYear;
      minimumYear = startYear;
    }

    let cursor = { year: initialYear, pageIndex: 0 };
    let requestedSize = API_PAGE_SIZE;
    let transport = 'api';
    let pageCount = 0;
    let serverPartial = false;
    const visited = new Set();
    const seenOrders = new Set();
    const orders = [];

    const partialResult = (error) => ({
      success: orders.length > 0,
      items: orders,
      partial: orders.length > 0,
      error: error.message,
      code: error.code || 'COLLECT_ERROR',
      loadedPages: pageCount,
      transport
    });

    while (true) {
      if (signal?.aborted) throw new CollectorError('수집이 취소되었습니다.', 'CANCELLED');
      if (minimumYear != null && cursor.year < minimumYear) break;

      const cursorKey = `${cursor.year}:${cursor.pageIndex}`;
      if (visited.has(cursorKey)) {
        return partialResult(new CollectorError('쿠팡이 같은 페이지를 반복해 수집을 중단했습니다.', 'CURSOR_CYCLE'));
      }
      visited.add(cursorKey);

      let page;
      try {
        if (transport === 'api') {
          try {
            page = await fetchApiPage(fetchImpl, cursor, requestedSize, signal);
            requestedSize = page.pageSize || requestedSize;
          } catch (apiError) {
            if (apiError.code === 'CANCELLED') throw apiError;
            page = await fetchHtmlPage(fetchImpl, cursor, signal);
            transport = 'html';
          }
        } else {
          page = await fetchHtmlPage(fetchImpl, cursor, signal);
        }
      } catch (error) {
        if (error.code === 'CANCELLED') throw error;
        const result = partialResult(error);
        if (result.success) return result;
        return { ...result, success: false, partial: false };
      }

      pageCount++;
      serverPartial ||= page.partial;
      let allOlderThanStart = page.orders.length > 0;
      let invalidOrderFound = false;

      for (const order of page.orders) {
        const timestamp = orderTimestamp(order);
        if (timestamp == null || order?.orderId == null) {
          invalidOrderFound = true;
          // 형식이 깨진 주문은 페이지가 오래됐다는 판단 근거로 사용하지 않는다.
          allOlderThanStart = false;
          continue;
        }
        if (startMs == null || timestamp >= startMs) allOlderThanStart = false;
        if (startMs != null && (timestamp < startMs || timestamp > endMs)) continue;

        const key = orderKey(order);
        if (seenOrders.has(key)) continue;
        seenOrders.add(key);
        orders.push(order);
      }

      onProgress({ current: pageCount, total: null, itemCount: orders.length, transport });

      if (invalidOrderFound) {
        const result = partialResult(new CollectorError(
          '쿠팡 주문 항목의 필수 정보가 없어 수집을 중단했습니다.',
          'SCHEMA_ERROR'
        ));
        if (result.success) return result;
        return { ...result, success: false, partial: false };
      }

      if ((startMs != null && allOlderThanStart) || !page.hasNext) break;

      const nextCursor = { year: page.nextYear, pageIndex: page.nextPageIndex };
      if (!Number.isInteger(nextCursor.year) || !Number.isInteger(nextCursor.pageIndex) || nextCursor.pageIndex < 0) {
        return partialResult(new CollectorError('쿠팡 다음 페이지 정보가 올바르지 않습니다.', 'INVALID_CURSOR'));
      }
      if (nextCursor.year > cursor.year) {
        return partialResult(new CollectorError('쿠팡 다음 페이지의 연도 정보가 올바르지 않습니다.', 'INVALID_CURSOR'));
      }
      cursor = nextCursor;
    }

    return {
      success: true,
      items: orders,
      partial: serverPartial,
      error: serverPartial ? '쿠팡이 일부 결과만 반환했습니다.' : null,
      loadedPages: pageCount,
      transport
    };
  }

  const exported = {
    API_PAGE_SIZE,
    CollectorError,
    collect,
    parseHtmlPage,
    validatePage
  };

  globalScope.CoupangCollector = exported;
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
})(typeof globalThis !== 'undefined' ? globalThis : this);
