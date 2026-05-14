// Content Script: 쿠팡 주문내역 __NEXT_DATA__ 파싱 및 메시지 통신

const STATUS_MAP = {
  DELIVERING: '배송중',
  FINAL_DELIVERY: '배송완료',
  RETURN_COMPLETE: '반품완료',
  RETURN_REQUEST: '반품신청',
  CANCEL_COMPLETE: '취소완료',
  PAYMENT_COMPLETED: '결제완료',
  PREPARING: '상품준비중',
  DEPARTURE: '배송시작'
};

function parseOrderData() {
  const scriptEl = document.getElementById('__NEXT_DATA__');
  if (!scriptEl) {
    return { success: false, error: '__NEXT_DATA__를 찾을 수 없습니다.' };
  }

  try {
    const nextData = JSON.parse(scriptEl.textContent);
    const desktopOrder = nextData.props.pageProps.domains.desktopOrder;

    if (!desktopOrder || !desktopOrder.orderList) {
      return { success: false, error: '주문내역 데이터를 찾을 수 없습니다.' };
    }

    const { orderList, orderPagination } = desktopOrder;
    const items = orderList.map(formatOrder);

    return {
      success: true,
      platform: 'coupang',
      items,
      hasNext: orderPagination.hasNext,
      nextPageIndex: orderPagination.nextPageIndex,
      itemCount: items.length,
      totalPage: null
    };
  } catch (e) {
    return { success: false, error: '데이터 파싱 실패: ' + e.message };
  }
}

function getOrderStatus(order) {
  if (order.allCanceled) return '취소완료';
  const statuses = (order.deliveryGroupList || []).map(g => g.groupStatus?.status || '');
  const unique = [...new Set(statuses)];
  return unique.map(s => STATUS_MAP[s] || s).join(', ');
}

function formatOrder(order) {
  const firstGroup = order.deliveryGroupList?.[0];
  return {
    주문일시: formatDate(order.orderedAt),
    주문상태: getOrderStatus(order),
    상품명: order.title,
    주문금액: order.totalProductPrice,
    판매자: firstGroup?.vendor?.vendorName || '',
    주문ID: String(order.orderId)
  };
}

function formatDate(epochMs) {
  if (!epochMs) return '';
  const d = new Date(epochMs);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_CURRENT_PAGE') {
    sendResponse(parseOrderData());
  }
  return true;
});
