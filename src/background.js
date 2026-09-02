// Background Service Worker: 다중 페이지 fetch 및 데이터 수집

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_ALL_PAGES') {
    const platform = message.platform || 'naverpay';
    if (platform === 'coupang') {
      fetchCoupangAllPages()
        .then(sendResponse)
        .catch((error) => sendResponse(unexpectedCollectionError(error)));
      return true;
    }
    fetchAllPages(message.fromPage || 1, message.toPage)
      .then(sendResponse)
      .catch((error) => sendResponse(unexpectedCollectionError(error)));
    return true;
  }

  if (message.type === 'FETCH_BY_MONTH') {
    const platform = message.platform || 'naverpay';
    if (platform === 'coupang') {
      fetchCoupangByMonth(message.startMonth, message.endMonth)
        .then(sendResponse)
        .catch((error) => sendResponse(unexpectedCollectionError(error)));
      return true;
    }
    fetchByMonth(message.startMonth, message.endMonth)
      .then(sendResponse)
      .catch((error) => sendResponse(unexpectedCollectionError(error)));
    return true;
  }
});

function unexpectedCollectionError(error) {
  console.error('결제내역 수집 중 예기치 못한 오류가 발생했습니다.', error);
  return {
    success: false,
    error: '데이터를 수집하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    code: 'COLLECT_ERROR'
  };
}

// ── 네이버페이 ──────────────────────────────────────────────────────────────

// 월별 데이터 수집: startMonth, endMonth는 "YYYY-MM" 형식
async function fetchByMonth(startMonth, endMonth) {
  const startDate = new Date(startMonth + '-01T00:00:00');
  // endMonth의 마지막 날 23:59:59
  const endYear = parseInt(endMonth.split('-')[0]);
  const endMon = parseInt(endMonth.split('-')[1]);
  const endDate = new Date(endYear, endMon, 0, 23, 59, 59, 999);

  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  // 1페이지부터 순차 fetch
  const firstResult = await fetchPageRaw(1);
  if (!firstResult.success) return firstResult;

  const totalPage = firstResult.totalPage;
  let allItems = [];
  let page = 1;
  let done = false;

  // 첫 페이지 처리
  const filtered = filterItemsByDate(firstResult.items, startMs, endMs);
  allItems = allItems.concat(filtered.matched);
  done = filtered.allOlderThanStart;

  chrome.runtime.sendMessage({
    type: 'FETCH_PROGRESS',
    current: 1,
    total: totalPage,
    itemCount: allItems.length
  }).catch(() => {});

  // 나머지 페이지 순차 fetch
  while (!done && page < totalPage) {
    page++;
    const result = await fetchPageRaw(page);
    if (!result.success) {
      if (result.code === 'AUTH_ERROR') return result;
      // 부분 결과 반환
      return {
        success: true,
        items: allItems.map(formatNaverpayItem),
        loadedPages: page - 1,
        partial: true
      };
    }

    const f = filterItemsByDate(result.items, startMs, endMs);
    allItems = allItems.concat(f.matched);
    done = f.allOlderThanStart;

    // 진행 상황 브로드캐스트
    chrome.runtime.sendMessage({
      type: 'FETCH_PROGRESS',
      current: page,
      total: totalPage,
      itemCount: allItems.length
    }).catch(() => {});
  }

  return {
    success: true,
    items: allItems.map(formatNaverpayItem),
    loadedPages: page
  };
}

function filterItemsByDate(items, startMs, endMs) {
  const matched = [];
  let allOlderThanStart = true;

  for (const item of items) {
    const d = item.date;
    if (d >= startMs && d <= endMs) {
      matched.push(item);
    }
    // 아직 startDate보다 새로운(또는 같은) 항목이 있으면 계속 fetch
    if (d >= startMs) {
      allOlderThanStart = false;
    }
  }

  return { matched, allOlderThanStart };
}

async function fetchAllPages(fromPage, toPage) {
  const firstResult = await fetchPageRaw(fromPage);
  if (!firstResult.success) return firstResult;

  const totalPage = toPage
    ? Math.min(toPage, firstResult.totalPage)
    : firstResult.totalPage;

  let allItems = [...firstResult.items];

  for (let page = fromPage + 1; page <= totalPage; page++) {
    const result = await fetchPageRaw(page);
    if (!result.success) {
      if (result.code === 'AUTH_ERROR') return result;
      return {
        success: false,
        error: `${page}페이지 로드 실패: ${result.error}`,
        partialItems: allItems.map(formatNaverpayItem),
        loadedPages: page - 1
      };
    }
    allItems = allItems.concat(result.items);

    chrome.runtime.sendMessage({
      type: 'FETCH_PROGRESS',
      current: page - fromPage + 1,
      total: totalPage - fromPage + 1
    }).catch(() => {});
  }

  return {
    success: true,
    items: allItems.map(formatNaverpayItem),
    totalPage,
    loadedPages: totalPage - fromPage + 1
  };
}

async function fetchPageRaw(page) {
  try {
    const resp = await fetch(`https://pay.naver.com/pc/history?page=${page}`, {
      credentials: 'include'
    });

    if (!resp.ok) {
      return { success: false, error: httpErrorMessage(resp.status), code: httpErrorCode(resp.status) };
    }

    const html = await resp.text();
    return parseNextDataFromHtml(html);
  } catch (e) {
    return { success: false, error: '네트워크 연결을 확인해주세요.', code: 'NETWORK_ERROR' };
  }
}

function parseNextDataFromHtml(html) {
  const match = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    return { success: false, error: '네이버페이 결제내역 정보를 찾을 수 없습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.' };
  }

  try {
    const nextData = JSON.parse(match[1]);
    const pageData = nextData.props.pageProps.dehydratedState.queries[0].state.data.pages[0];

    return {
      success: true,
      items: pageData.items, // raw items (필터링용)
      totalPage: pageData.totalPage,
      curPage: pageData.curPage,
      itemCount: pageData.itemCount
    };
  } catch (e) {
    console.warn('네이버페이 결제내역 파싱에 실패했습니다.', e);
    return { success: false, error: '네이버페이 결제내역을 해석하지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.' };
  }
}

function formatNaverpayItem(item) {
  return {
    결제일시: formatDate(item.date),
    결제상태: item.status?.text || '',
    가맹점명: item.merchantName || '',
    상품명: item.product?.name || '',
    결제금액: item.product?.price || 0,
    잔여금액: item.product?.restAmount || 0,
    결제ID: item._id || '',
    서비스타입: item.serviceType || '',
    결제수단코드: item.additionalData?.primaryPayMeansCode || ''
  };
}

function formatDate(epochMs) {
  if (!epochMs) return '';
  const d = new Date(epochMs);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ── 쿠팡 ────────────────────────────────────────────────────────────────────

const COUPANG_STATUS_MAP = {
  DELIVERING: '배송중',
  FINAL_DELIVERY: '배송완료',
  RETURN_COMPLETE: '반품완료',
  RETURN_REQUEST: '반품신청',
  CANCEL_COMPLETE: '취소완료',
  PAYMENT_COMPLETED: '결제완료',
  PREPARING: '상품준비중',
  DEPARTURE: '배송시작'
};

async function fetchCoupangByMonth(startMonth, endMonth) {
  const startDate = new Date(startMonth + '-01T00:00:00');
  const endYear = parseInt(endMonth.split('-')[0]);
  const endMon = parseInt(endMonth.split('-')[1]);
  const endDate = new Date(endYear, endMon, 0, 23, 59, 59, 999);
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  let allItems = [];
  let requestYear = endYear;
  let pageIndex = 0;
  let done = false;
  let pageCount = 0;
  const visited = new Set();

  while (!done) {
    const cursorKey = `${requestYear}:${pageIndex}`;
    if (visited.has(cursorKey)) {
      return {
        success: true,
        items: dedupeCoupangOrders(allItems).map(formatCoupangItem),
        partial: true,
        error: '쿠팡이 같은 페이지를 반복해 수집을 중단했습니다.'
      };
    }
    visited.add(cursorKey);

    const result = await fetchCoupangPageRaw(requestYear, pageIndex);
    if (!result.success) {
      if (result.code === 'AUTH_ERROR') return result;
      if (allItems.length > 0) {
        return { success: true, items: dedupeCoupangOrders(allItems).map(formatCoupangItem), partial: true };
      }
      return result;
    }

    pageCount++;
    const f = filterCoupangItemsByDate(result.orders, startMs, endMs);
    allItems = allItems.concat(f.matched);

    chrome.runtime.sendMessage({
      type: 'FETCH_PROGRESS',
      current: pageCount,
      total: null,
      itemCount: allItems.length
    }).catch(() => {});

    if (f.allOlderThanStart || !result.hasNext) {
      done = true;
    } else {
      pageIndex = result.nextPageIndex;
      requestYear = result.nextYear ?? requestYear;
    }
  }

  return { success: true, items: dedupeCoupangOrders(allItems).map(formatCoupangItem) };
}

async function fetchCoupangAllPages() {
  let allItems = [];
  let requestYear = new Date().getFullYear();
  let pageIndex = 0;
  let hasNext = true;
  let pageCount = 0;
  const visited = new Set();

  while (hasNext) {
    const cursorKey = `${requestYear}:${pageIndex}`;
    if (visited.has(cursorKey)) {
      return {
        success: true,
        items: dedupeCoupangOrders(allItems).map(formatCoupangItem),
        partial: true,
        error: '쿠팡이 같은 페이지를 반복해 수집을 중단했습니다.'
      };
    }
    visited.add(cursorKey);

    const result = await fetchCoupangPageRaw(requestYear, pageIndex);
    if (!result.success) {
      if (result.code === 'AUTH_ERROR') return result;
      if (allItems.length > 0) {
        return {
          success: false,
          error: `${pageIndex}페이지 로드 실패: ${result.error}`,
          partialItems: dedupeCoupangOrders(allItems).map(formatCoupangItem)
        };
      }
      return result;
    }

    pageCount++;
    allItems = allItems.concat(result.orders);
    hasNext = result.hasNext;

    chrome.runtime.sendMessage({
      type: 'FETCH_PROGRESS',
      current: pageCount,
      total: null,
      itemCount: allItems.length
    }).catch(() => {});

    if (hasNext) {
      pageIndex = result.nextPageIndex;
      requestYear = result.nextYear ?? requestYear;
    }
  }

  return { success: true, items: dedupeCoupangOrders(allItems).map(formatCoupangItem) };
}

async function fetchCoupangPageRaw(requestYear, pageIndex) {
  try {
    const params = new URLSearchParams({
      requestYear: String(requestYear),
      pageIndex: String(pageIndex)
    });
    const resp = await fetch(`https://mc.coupang.com/ssr/desktop/order/list?${params}`, {
      credentials: 'include'
    });

    if (!resp.ok) {
      return { success: false, error: httpErrorMessage(resp.status), code: httpErrorCode(resp.status) };
    }

    const html = await resp.text();
    return parseCoupangNextDataFromHtml(html);
  } catch (e) {
    return { success: false, error: '네트워크 연결을 확인해주세요.', code: 'NETWORK_ERROR' };
  }
}

function httpErrorMessage(status) {
  if (status === 401 || status === 403) return '로그인이 만료되었습니다. 해당 사이트에 다시 로그인해주세요.';
  if (status === 429) return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  if (status >= 500) return `서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요. (HTTP ${status})`;
  return `페이지를 불러오지 못했습니다. (HTTP ${status})`;
}

function httpErrorCode(status) {
  if (status === 401 || status === 403) return 'AUTH_ERROR';
  if (status === 429) return 'RATE_LIMIT';
  return 'HTTP_ERROR';
}

function parseCoupangNextDataFromHtml(html) {
  const match = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    return { success: false, error: '쿠팡 주문내역 정보를 찾을 수 없습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.' };
  }

  try {
    const nextData = JSON.parse(match[1]);
    const desktopOrder = nextData.props.pageProps.domains.desktopOrder;

    if (!desktopOrder || !desktopOrder.orderList) {
      return { success: false, error: '주문내역 데이터를 찾을 수 없습니다.' };
    }

    return {
      success: true,
      orders: desktopOrder.orderList,
      hasNext: desktopOrder.orderPagination.hasNext,
      nextPageIndex: desktopOrder.orderPagination.nextPageIndex,
      nextYear: desktopOrder.orderPagination.nextYear
    };
  } catch (e) {
    console.warn('쿠팡 주문내역 파싱에 실패했습니다.', e);
    return { success: false, error: '쿠팡 주문내역을 해석하지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.' };
  }
}

function dedupeCoupangOrders(orders) {
  const seen = new Set();
  return orders.filter((order) => {
    const key = order.orderId == null
      ? `${order.orderedAt || ''}:${order.title || ''}:${order.totalProductPrice || ''}`
      : String(order.orderId);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function filterCoupangItemsByDate(orders, startMs, endMs) {
  const matched = [];
  let allOlderThanStart = true;

  for (const order of orders) {
    const d = order.orderedAt;
    if (d >= startMs && d <= endMs) {
      matched.push(order);
    }
    if (d >= startMs) {
      allOlderThanStart = false;
    }
  }

  return { matched, allOlderThanStart };
}

function formatCoupangItem(order) {
  const firstGroup = order.deliveryGroupList?.[0];
  const statuses = (order.deliveryGroupList || []).map(g => g.groupStatus?.status || '');
  const unique = [...new Set(statuses)];
  const statusText = order.allCanceled
    ? '취소완료'
    : unique.map(s => COUPANG_STATUS_MAP[s] || s).join(', ');

  return {
    주문일시: formatDate(order.orderedAt),
    주문상태: statusText,
    상품명: order.title,
    주문금액: order.totalProductPrice,
    판매자: firstGroup?.vendor?.vendorName || '',
    주문ID: String(order.orderId)
  };
}
