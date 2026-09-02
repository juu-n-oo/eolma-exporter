const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const apiPath = path.join(__dirname, '../src/eolma/api.js');

function loadApi(sendMessage) {
  const source = `${fs.readFileSync(apiPath, 'utf8')}\nthis.eolmaApi = eolmaApi;`;
  const context = {
    chrome: {
      runtime: { sendMessage },
      tabs: { create: () => {} }
    },
    fetch: async () => ({ ok: true }),
    console
  };
  vm.runInNewContext(source, context, { filename: apiPath });
  return context.eolmaApi;
}

test('인증 확인은 토큰 저장소 대신 eolma 탭 브리지를 사용한다', async () => {
  const messages = [];
  const api = loadApi(async (message) => {
    messages.push(message);
    return { success: true, loggedIn: true, user: { name: '얼마' } };
  });

  assert.equal(JSON.stringify(await api.checkAuth()), JSON.stringify({ loggedIn: true, user: { name: '얼마' } }));
  assert.equal(messages[0].type, 'EOLMA_SESSION_REQUEST');
  assert.equal(messages[0].action, 'CHECK_AUTH');
  assert.equal(messages[0].payload, undefined);
});

test('전송 데이터는 검증 후 eolma 탭 브리지로만 전달한다', async () => {
  const messages = [];
  const api = loadApi(async (message) => {
    messages.push(message);
    return { success: true, uploadedCount: message.payload.length };
  });

  const result = await api.send({
    platform: 'naverpay',
    items: [{ 가맹점명: '상점', 상품명: '상품', 결제금액: 12000, 결제일시: '2026-09-02T12:00:00' }]
  });

  assert.equal(JSON.stringify(result), JSON.stringify({ success: true, uploadedCount: 1 }));
  assert.equal(messages[0].action, 'UPLOAD_STAGING');
  assert.equal(JSON.stringify(messages[0].payload), JSON.stringify([{
    amount: 12000,
    title: '상점 · 상품',
    transactedAt: '2026-09-02',
    source: 'NAVER_PAY'
  }]));
});

test('확장 소스에는 인증 토큰이나 브라우저 저장소 접근이 없다', () => {
  const sourceRoot = path.join(__dirname, '../src');
  const files = [
    path.join(sourceRoot, 'eolma/api.js'),
    path.join(sourceRoot, 'content/eolma.js')
  ];

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /chrome\.storage|localStorage|access_token/);
  }
});
