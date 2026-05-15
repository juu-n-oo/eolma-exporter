// Popup 로직

const statusEl = document.getElementById('status');
const controlsEl = document.getElementById('controls');
const rangeTypeEl = document.getElementById('rangeType');
const monthSelectEl = document.getElementById('monthSelect');
const rangeSelectEl = document.getElementById('rangeSelect');
const yearEl = document.getElementById('year');
const monthEl = document.getElementById('month');
const startMonthEl = document.getElementById('startMonth');
const endMonthEl = document.getElementById('endMonth');
const btnCsv = document.getElementById('btnCsv');
const btnExcel = document.getElementById('btnExcel');
const btnAllExcel = document.getElementById('btnAllExcel');
const btnAllCsv = document.getElementById('btnAllCsv');
const btnEolmaLogin = document.getElementById('btnEolmaLogin');
const btnEolmaUpload = document.getElementById('btnEolmaUpload');
const eolmaStatusDot = document.getElementById('eolmaStatusDot');
const eolmaStatusText = document.getElementById('eolmaStatusText');
const eolmaUserName = document.getElementById('eolmaUserName');
const progressEl = document.getElementById('progress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const platformBadgeEl = document.getElementById('platformBadge');
const headerSubtitleEl = document.getElementById('headerSubtitle');

let currentPageData = null;
let activePlatform = null;
let exportAll = false;

const PLATFORM_LABELS = {
  naverpay: '네이버페이',
  coupang: '쿠팡'
};

function detectPlatform(url) {
  if (url.includes('pay.naver.com/pc/history')) return 'naverpay';
  if (url.includes('mc.coupang.com/ssr/desktop/order/list')) return 'coupang';
  return null;
}

function showPlatformBadge(platform) {
  if (!platform) {
    platformBadgeEl.style.display = 'none';
    return;
  }
  platformBadgeEl.textContent = PLATFORM_LABELS[platform] || platform;
  platformBadgeEl.className = `platform-badge ${platform}`;
  platformBadgeEl.style.display = 'inline-block';
  if (headerSubtitleEl) {
    headerSubtitleEl.textContent = `${PLATFORM_LABELS[platform] || platform} 결제내역 내보내기`;
  }
}

function renderEolmaAuth(authResult) {
  if (authResult.loggedIn) {
    eolmaStatusDot.className = 'status-dot dot-on';
    eolmaStatusText.textContent = '로그인됨';
    eolmaUserName.textContent = authResult.user?.name || '';
    btnEolmaLogin.style.display = 'none';
    btnEolmaUpload.style.display = 'block';
  } else {
    eolmaStatusDot.className = 'status-dot dot-off';
    eolmaStatusText.textContent = 'eolma 미로그인';
    eolmaUserName.textContent = '';
    btnEolmaLogin.style.display = 'block';
    btnEolmaUpload.style.display = 'none';
  }
}

// 초기화
async function init() {
  // eolma 로그인 상태 확인
  const authResult = await eolmaApi.checkAuth();
  renderEolmaAuth(authResult);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    activePlatform = detectPlatform(tab.url || '');

    if (!activePlatform) {
      showError('네이버페이 또는 쿠팡 주문내역 페이지에서 실행해주세요.');
      return;
    }

    showPlatformBadge(activePlatform);

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CURRENT_PAGE' });

    if (!response || !response.success) {
      showError(response?.error || '데이터를 가져올 수 없습니다. 페이지를 새로고침해주세요.');
      return;
    }

    currentPageData = response;
    initDateSelectors();

    if (activePlatform === 'coupang') {
      const more = response.hasNext ? ' (다음 페이지 있음)' : '';
      statusEl.textContent = `현재 페이지 ${response.itemCount}건${more}`;
    } else {
      statusEl.textContent = `총 ${response.totalPage}페이지 (약 ${response.totalPage * response.itemCount}건)`;
    }
    controlsEl.style.display = 'block';
  } catch (e) {
    if (e?.message?.includes('Could not establish connection') || e?.message?.includes('Receiving end does not exist')) {
      showError('페이지를 새로고침한 뒤 익스텐션 아이콘을 다시 클릭해주세요.');
    } else {
      showError('데이터를 가져올 수 없습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.');
    }
  }
}

function initDateSelectors() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  for (let y = currentYear; y >= currentYear - 5; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y + '년';
    yearEl.appendChild(opt);
  }

  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement('option');
    opt.value = String(m).padStart(2, '0');
    opt.textContent = m + '월';
    monthEl.appendChild(opt);
  }

  yearEl.value = currentYear;
  monthEl.value = String(currentMonth).padStart(2, '0');

  const pad = (n) => String(n).padStart(2, '0');
  endMonthEl.value = `${currentYear}-${pad(currentMonth)}`;
  startMonthEl.value = `${currentYear}-${pad(currentMonth)}`;
}

function showError(msg) {
  statusEl.textContent = msg;
  statusEl.classList.add('error');
}

function showStatus(msg) {
  statusEl.textContent = msg;
  statusEl.classList.remove('error');
}

// 범위 타입 변경
rangeTypeEl.addEventListener('change', () => {
  const type = rangeTypeEl.value;
  monthSelectEl.style.display = type === 'month' ? 'block' : 'none';
  rangeSelectEl.style.display = type === 'range' ? 'block' : 'none';
});

// 진행 상황 리스너
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'FETCH_PROGRESS') {
    const countText = message.itemCount ? ` (${message.itemCount}건 수집)` : '';
    if (message.total == null) {
      progressFill.classList.add('indeterminate');
      progressText.textContent = `${message.current}페이지 검색 중...${countText}`;
    } else {
      progressFill.classList.remove('indeterminate');
      const pct = Math.round((message.current / message.total) * 100);
      progressFill.style.width = pct + '%';
      progressText.textContent = `${message.current} / ${message.total} 페이지 검색 중...${countText}`;
    }
  }
});

// 다운로드 버튼
btnCsv.addEventListener('click', () => startExport('csv'));
btnExcel.addEventListener('click', () => startExport('excel'));
btnAllExcel.addEventListener('click', () => startExport('excel', true));
btnAllCsv.addEventListener('click', () => startExport('csv', true));

// eolma 버튼
btnEolmaLogin.addEventListener('click', () => eolmaApi.openLoginPage());
btnEolmaUpload.addEventListener('click', startEolmaUpload);

async function startExport(format, all = false) {
  exportAll = all;
  setButtonsDisabled(true);
  progressEl.style.display = 'block';
  progressFill.classList.remove('indeterminate');
  progressFill.style.width = '0%';
  progressText.textContent = '데이터 수집 시작...';

  try {
    const items = await collectItems(all);
    if (!items || items.length === 0) {
      showError('해당 기간에 결제내역이 없습니다.');
      return;
    }

    if (format === 'csv') {
      await downloadCsv(items);
    } else {
      await downloadExcel(items);
    }

    showStatus(`${items.length}건 다운로드 완료!`);
  } catch (e) {
    showError(e.message);
  } finally {
    progressFill.classList.remove('indeterminate');
    progressEl.style.display = 'none';
    setButtonsDisabled(false);
  }
}

function getSelectedRange() {
  const type = rangeTypeEl.value;

  if (type === 'month') {
    const ym = `${yearEl.value}-${monthEl.value}`;
    return { startMonth: ym, endMonth: ym };
  }

  if (type === 'range') {
    return {
      startMonth: startMonthEl.value,
      endMonth: endMonthEl.value
    };
  }

  return null;
}

async function collectItems(all = false) {
  const range = all ? null : getSelectedRange();

  if (range) {
    const response = await chrome.runtime.sendMessage({
      type: 'FETCH_BY_MONTH',
      platform: activePlatform,
      startMonth: range.startMonth,
      endMonth: range.endMonth
    });

    if (!response.success) {
      throw new Error(response.error || '데이터 수집에 실패했습니다.');
    }

    progressFill.classList.remove('indeterminate');
    progressFill.style.width = '100%';
    progressText.textContent = `완료! (${response.items.length}건)`;
    return response.items;
  }

  const response = await chrome.runtime.sendMessage({
    type: 'FETCH_ALL_PAGES',
    platform: activePlatform,
    fromPage: 1
  });

  if (!response.success) {
    if (response.partialItems && response.partialItems.length > 0) {
      return response.partialItems;
    }
    throw new Error(response.error || '데이터 수집에 실패했습니다.');
  }

  progressFill.style.width = '100%';
  progressText.textContent = '완료!';
  return response.items;
}

function setButtonsDisabled(disabled) {
  btnCsv.disabled = disabled;
  btnExcel.disabled = disabled;
  btnAllExcel.disabled = disabled;
  btnAllCsv.disabled = disabled;
  btnEolmaUpload.disabled = disabled;
}

async function startEolmaUpload() {
  exportAll = false;
  setButtonsDisabled(true);
  progressEl.style.display = 'block';
  progressFill.classList.remove('indeterminate');
  progressFill.style.width = '0%';
  progressText.textContent = '데이터 수집 중...';

  try {
    const items = await collectItems();
    if (!items || items.length === 0) {
      showError('해당 기간에 결제내역이 없습니다.');
      return;
    }

    progressFill.classList.remove('indeterminate');
    progressFill.style.width = '70%';
    progressText.textContent = `${items.length}건 eolma로 전송 중...`;

    const range = getSelectedRange();
    const period = range
      ? { start: range.startMonth + '-01', end: range.endMonth + '-31' }
      : null;

    const result = await eolmaApi.send({ platform: activePlatform, items, period });

    progressFill.style.width = '100%';
    showStatus(`eolma 전송 완료! (${result.uploadedCount}건)`);
  } catch (e) {
    showError('전송 실패: ' + e.message);
  } finally {
    progressFill.classList.remove('indeterminate');
    progressEl.style.display = 'none';
    setButtonsDisabled(false);
  }
}

// CSV 다운로드
async function downloadCsv(items) {
  if (items.length === 0) return;

  const headers = Object.keys(items[0]);
  const csvRows = [headers.join(',')];

  for (const item of items) {
    const row = headers.map(h => {
      const val = String(item[h] ?? '');
      if (val.includes(',') || val.includes('\n') || val.includes('"')) {
        return '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    });
    csvRows.push(row.join(','));
  }

  const bom = '\uFEFF';
  const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, generateFilename('csv'));
}

// Excel 다운로드
async function downloadExcel(items) {
  if (typeof XLSX === 'undefined') {
    showError('Excel 라이브러리를 로드할 수 없습니다. CSV로 다운로드합니다.');
    await downloadCsv(items);
    return;
  }

  const ws = XLSX.utils.json_to_sheet(items);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '결제내역');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, generateFilename('xlsx'));
}

function generateFilename(ext) {
  const platform = activePlatform || 'eolma';
  const range = exportAll ? null : getSelectedRange();
  if (range) {
    if (range.startMonth === range.endMonth) {
      return `${platform}_${range.startMonth}.${ext}`;
    }
    return `${platform}_${range.startMonth}_${range.endMonth}.${ext}`;
  }
  return `${platform}_all.${ext}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({
    url,
    filename,
    saveAs: true
  });
}

init();
