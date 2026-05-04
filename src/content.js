// Content Script: __NEXT_DATA__ 파싱 및 메시지 통신

function parsePaymentData() {
  const scriptEl = document.getElementById('__NEXT_DATA__');
  if (!scriptEl) {
    return { success: false, error: '__NEXT_DATA__를 찾을 수 없습니다.' };
  }

  try {
    const nextData = JSON.parse(scriptEl.textContent);
    const queries = nextData.props.pageProps.dehydratedState.queries;
    if (!queries || queries.length === 0) {
      return { success: false, error: '결제내역 쿼리를 찾을 수 없습니다.' };
    }

    const pageData = queries[0].state.data.pages[0];
    const items = pageData.items.map(formatItem);

    return {
      success: true,
      items,
      totalPage: pageData.totalPage,
      curPage: pageData.curPage,
      itemCount: pageData.itemCount
    };
  } catch (e) {
    return { success: false, error: '데이터 파싱 실패: ' + e.message };
  }
}

function formatItem(item) {
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

// 메시지 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_CURRENT_PAGE') {
    sendResponse(parsePaymentData());
  }
  return true;
});
