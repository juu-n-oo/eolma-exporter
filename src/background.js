// Background Service Worker: 다중 페이지 fetch 및 데이터 수집

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_ALL_PAGES') {
    const platform = message.platform || 'naverpay';
    if (platform === 'coupang') {
      fetchCoupangAllPages()
        .then(sendResponse)
        .catch(e => sendResponse({ success: false, error: e.message }));
      return true;
    }
    fetchAllPages(message.fromPage || 1, message.toPage)
      .then(sendResponse)
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }

  if (message.type === 'FETCH_BY_MONTH') {
    const platform = message.platform || 'naverpay';
    if (platform === 'coupang') {
      fetchCoupangByMonth(message.startMonth, message.endMonth)
        .then(sendResponse)
        .catch(e => sendResponse({ success: false, error: e.message }));
      return true;
    }
    fetchByMonth(message.startMonth, message.endMonth)
      .then(sendResponse)
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }
});

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

  // 나머지 페이지 순차 fetch
  while (!done && page < totalPage) {
    page++;
    const result = await fetchPageRaw(page);
    if (!result.success) {
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
      return { success: false, error: `HTTP ${resp.status}` };
    }

    const html = await resp.text();
    return parseNextDataFromHtml(html);
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function parseNextDataFromHtml(html) {
  const match = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    return { success: false, error: '__NEXT_DATA__ not found in HTML' };
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
    return { success: false, error: 'Parse error: ' + e.message };
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
  let pageIndex = 1;
  let done = false;
  let pageCount = 0;

  while (!done) {
    const result = await fetchCoupangPageRaw(pageIndex);
    if (!result.success) {
      if (allItems.length > 0) {
        return { success: true, items: allItems.map(formatCoupangItem), partial: true };
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
    }
  }

  return { success: true, items: allItems.map(formatCoupangItem) };
}

async function fetchCoupangAllPages() {
  let allItems = [];
  let pageIndex = 1;
  let hasNext = true;
  let pageCount = 0;

  while (hasNext) {
    const result = await fetchCoupangPageRaw(pageIndex);
    if (!result.success) {
      if (allItems.length > 0) {
        return {
          success: false,
          error: `${pageIndex}페이지 로드 실패: ${result.error}`,
          partialItems: allItems.map(formatCoupangItem)
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
    }
  }

  return { success: true, items: allItems.map(formatCoupangItem) };
}

async function fetchCoupangPageRaw(pageIndex) {
  try {
    const resp = await fetch(`https://mc.coupang.com/ssr/desktop/order/list?pageIndex=${pageIndex}`, {
      credentials: 'include'
    });

    if (!resp.ok) {
      return { success: false, error: `HTTP ${resp.status}` };
    }

    const html = await resp.text();
    return parseCoupangNextDataFromHtml(html);
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function parseCoupangNextDataFromHtml(html) {
  const match = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    return { success: false, error: '__NEXT_DATA__ not found in HTML' };
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
      nextPageIndex: desktopOrder.orderPagination.nextPageIndex
    };
  } catch (e) {
    return { success: false, error: 'Parse error: ' + e.message };
  }
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
