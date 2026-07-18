const test = require('node:test');
const assert = require('node:assert/strict');

const { API_PAGE_SIZE, collect, parseHtmlPage } = require('../src/content/coupang-collector.js');

function jsonResponse(body, { status = 200, url = 'https://mc.coupang.com/ssr/api/myorders/model' } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: { get: () => null },
    text: async () => JSON.stringify(body)
  };
}

function htmlResponse(html, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    url: 'https://mc.coupang.com/ssr/desktop/order/list',
    headers: { get: () => null },
    text: async () => html
  };
}

function order(orderId, date, title = `order-${orderId}`) {
  return {
    orderId,
    orderedAt: new Date(`${date}T12:00:00+09:00`).getTime(),
    title,
    totalProductPrice: 1000,
    deliveryGroupList: []
  };
}

test('쿠팡 JSON API는 검증된 최대 page size 10을 사용한다', () => {
  assert.equal(API_PAGE_SIZE, 10);
});

test('기간 수집은 pageIndex 0에서 시작해 nextYear 커서를 따르고 중복을 제거한다', async () => {
  const requested = [];
  const pages = new Map([
    ['2026:0', {
      pageIndex: 0,
      size: 10,
      orderList: [order('a', '2026-01-10'), order('outside', '2026-02-01')],
      hasNext: true,
      nextPageIndex: 0,
      nextYear: 2025
    }],
    ['2025:0', {
      pageIndex: 0,
      size: 10,
      orderList: [order('a', '2026-01-10'), order('b', '2025-12-20')],
      hasNext: false,
      nextPageIndex: null,
      nextYear: null
    }]
  ]);

  const result = await collect({
    fetchImpl: async (url) => {
      const parsed = new URL(url, 'https://mc.coupang.com');
      const key = `${parsed.searchParams.get('requestYear')}:${parsed.searchParams.get('pageIndex')}`;
      requested.push(key);
      return jsonResponse(pages.get(key));
    },
    startMonth: '2025-12',
    endMonth: '2026-01'
  });

  assert.equal(result.success, true);
  assert.deepEqual(requested, ['2026:0', '2025:0']);
  assert.deepEqual(result.items.map((item) => item.orderId), ['a', 'b']);
});

test('JSON API가 거부되면 SSR HTML로 전환한다', async () => {
  const htmlData = {
    props: {
      pageProps: {
        domains: {
          desktopOrder: {
            orderList: [order('html', '2026-07-01')],
            orderPagination: { pageIndex: 0, hasNext: false }
          }
        }
      }
    }
  };
  const html = `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(htmlData)}</script></html>`;
  const requested = [];

  const result = await collect({
    fetchImpl: async (url) => {
      requested.push(String(url));
      if (String(url).startsWith('/ssr/api/')) return jsonResponse({}, { status: 403 });
      return htmlResponse(html);
    },
    all: true
  });

  assert.equal(result.success, true);
  assert.equal(result.transport, 'html');
  assert.equal(result.items[0].orderId, 'html');
  assert.equal(requested.filter((url) => url.startsWith('/ssr/api/')).length, 1);
  assert.equal(requested.at(-1).startsWith('/ssr/desktop/order/list?'), true);
});

test('반복 커서를 감지하면 수집한 내역을 부분 결과로 반환한다', async () => {
  const pages = new Map([
    ['0', {
      pageIndex: 0,
      size: 10,
      orderList: [order('a', '2026-07-02')],
      hasNext: true,
      nextPageIndex: 1,
      nextYear: 2026
    }],
    ['1', {
      pageIndex: 1,
      size: 10,
      orderList: [order('b', '2026-07-01')],
      hasNext: true,
      nextPageIndex: 1,
      nextYear: 2026
    }]
  ]);

  const result = await collect({
    fetchImpl: async (url) => {
      const parsed = new URL(url, 'https://mc.coupang.com');
      return jsonResponse(pages.get(parsed.searchParams.get('pageIndex')));
    },
    all: true
  });

  assert.equal(result.success, true);
  assert.equal(result.partial, true);
  assert.equal(result.code, 'CURSOR_CYCLE');
  assert.deepEqual(result.items.map((item) => item.orderId), ['a', 'b']);
});

test('필수 주문 필드가 깨지면 정상 빈 결과로 오인하지 않는다', async () => {
  let requestCount = 0;
  const result = await collect({
    fetchImpl: async () => {
      requestCount++;
      return jsonResponse({
        pageIndex: 0,
        size: 10,
        orderList: [{ orderId: 'broken', orderedAt: null }],
        hasNext: true,
        nextPageIndex: 1,
        nextYear: 2026
      });
    },
    startMonth: '2026-01',
    endMonth: '2026-12'
  });

  assert.equal(requestCount, 1);
  assert.equal(result.success, false);
  assert.equal(result.code, 'SCHEMA_ERROR');
  assert.equal(result.partial, false);
});

test('사용자 취소는 진행 중인 응답 본문 수신도 중단한다', async () => {
  const controller = new AbortController();
  let markBodyStarted;
  const bodyStarted = new Promise((resolve) => { markBodyStarted = resolve; });
  const fetchImpl = async (_url, options) => ({
    ok: true,
    status: 200,
    url: 'https://mc.coupang.com/ssr/api/myorders/model',
    headers: { get: () => null },
    text: () => {
      markBodyStarted();
      return new Promise((_resolve, reject) => {
        if (options.signal.aborted) {
          reject(new Error('aborted'));
          return;
        }
        options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      });
    }
  });

  const promise = collect({ fetchImpl, all: true, signal: controller.signal });
  await bodyStarted;
  controller.abort();

  await assert.rejects(promise, (error) => error.code === 'CANCELLED');
});

test('HTTP 429는 Retry-After를 반영해 재시도한다', async () => {
  let requestCount = 0;
  const result = await collect({
    fetchImpl: async () => {
      requestCount++;
      if (requestCount === 1) {
        return {
          ok: false,
          status: 429,
          url: 'https://mc.coupang.com/ssr/api/myorders/model',
          headers: { get: (name) => name === 'retry-after' ? '0' : null },
          text: async () => ''
        };
      }
      return jsonResponse({
        pageIndex: 0,
        size: 10,
        orderList: [order('retried', '2026-07-01')],
        hasNext: false,
        nextPageIndex: null,
        nextYear: null
      });
    },
    all: true
  });

  assert.equal(requestCount, 2);
  assert.equal(result.items[0].orderId, 'retried');
});

test('쿠팡 응답의 partial 표시는 최종 결과에 전파한다', async () => {
  const result = await collect({
    fetchImpl: async () => jsonResponse({
      pageIndex: 0,
      size: 10,
      orderList: [order('partial', '2026-07-01')],
      hasNext: false,
      nextPageIndex: null,
      nextYear: null,
      partial: true
    }),
    all: true
  });

  assert.equal(result.success, true);
  assert.equal(result.partial, true);
  assert.match(result.error, /일부 결과/);
});

test('SSR 파서는 현재 cursor를 pageIndex 기본값으로 사용한다', () => {
  const data = {
    props: {
      pageProps: {
        domains: {
          desktopOrder: {
            orderList: [],
            orderPagination: { hasNext: false }
          }
        }
      }
    }
  };
  const html = `<script id='__NEXT_DATA__'>${JSON.stringify(data)}</script>`;
  const page = parseHtmlPage(html, { year: 2026, pageIndex: 0 });

  assert.equal(page.pageIndex, 0);
  assert.equal(page.hasNext, false);
});
