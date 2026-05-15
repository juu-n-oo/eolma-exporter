// Popup 로직

// i18n helper
const i18n = {
  get(key, placeholders = []) {
    return chrome.i18n.getMessage(key, placeholders);
  }
};

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
const eolmaLinkEl = document.getElementById('eolmaLink');

let currentPageData = null;
let activePlatform = null;
let exportAll = false;

const getPlatformLabel = (platform) => {
  const labels = {
    naverpay: i18n.get('naverpay'),
    coupang: i18n.get('coupang')
  };
  return labels[platform] || platform;
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
  platformBadgeEl.textContent = getPlatformLabel(platform);
  platformBadgeEl.className = `platform-badge ${platform}`;
  platformBadgeEl.style.display = 'inline-block';
  if (headerSubtitleEl) {
    headerSubtitleEl.textContent = `${getPlatformLabel(platform)} ${i18n.get('headerSubtitle')}`;
  }
}

function renderEolmaAuth(authResult) {
  if (authResult.loggedIn) {
    eolmaStatusDot.className = 'status-dot dot-on';
    eolmaStatusText.textContent = i18n.get('eolmaLoggedIn');
    eolmaUserName.textContent = authResult.user?.name || '';
    btnEolmaLogin.style.display = 'none';
    btnEolmaUpload.style.display = 'block';
    btnEolmaUpload.textContent = i18n.get('eolmaUpload');
  } else {
    eolmaStatusDot.className = 'status-dot dot-off';
    eolmaStatusText.textContent = i18n.get('eolmaLoggedOut');
    eolmaUserName.textContent = '';
    btnEolmaLogin.style.display = 'block';
    btnEolmaUpload.style.display = 'none';
    btnEolmaLogin.textContent = i18n.get('eolmaLogin');
  }
}

// 초기화
async function init() {
  // i18n 텍스트 설정
  document.getElementById('headerTitle').textContent = i18n.get('headerTitle');
  document.getElementById('downloadRangeLabel').textContent = i18n.get('downloadRange');
  document.getElementById('yearLabel').textContent = i18n.get('year');
  document.getElementById('monthLabel').textContent = i18n.get('month');
  document.getElementById('startLabel').textContent = i18n.get('start');
  document.getElementById('endLabel').textContent = i18n.get('end');
  btnExcel.textContent = i18n.get('downloadExcel');
  btnCsv.textContent = i18n.get('downloadCsv');
  document.getElementById('allPeriodLabel').textContent = i18n.get('allPeriod');
  btnAllExcel.textContent = i18n.get('allExcel');
  btnAllCsv.textContent = i18n.get('allCsv');
  eolmaLinkEl.textContent = i18n.get('visitEolma');
  eolmaLinkEl.href = 'https://eolma.de';

  // rangeType 옵션 설정
  rangeTypeEl.options[0].textContent = i18n.get('selectMonth');
  rangeTypeEl.options[1].textContent = i18n.get('selectRange');
  rangeTypeEl.options[2].textContent = i18n.get('selectAll');

  // eolma 로그인 상태 확인
  const authResult = await eolmaApi.checkAuth();
  renderEolmaAuth(authResult);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    activePlatform = detectPlatform(tab.url || '');

    if (!activePlatform) {
      showError(i18n.get('unsupportedPage'));
      return;
    }

    showPlatformBadge(activePlatform);

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CURRENT_PAGE' });

    if (!response || !response.success) {
      showError(response?.error || i18n.get('dataFetchFailed'));
      return;
    }

    currentPageData = response;
    initDateSelectors();

    if (activePlatform === 'coupang') {
      const more = response.hasNext ? ` ${i18n.get('nextPageAvailable')}` : '';
      statusEl.textContent = i18n.get('currentPageInfo', [response.itemCount]) + more;
    } else {
      statusEl.textContent = i18n.get('totalPageInfo', [response.totalPage, response.totalPage * response.itemCount]);
    }
    controlsEl.style.display = 'block';
  } catch (e) {
    if (e?.message?.includes('Could not establish connection') || e?.message?.includes('Receiving end does not exist')) {
      showError(i18n.get('refreshPage'));
    } else {
      showError(i18n.get('dataFetchFailed'));
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
    if (message.total == null) {
      progressFill.classList.add('indeterminate');
      progressText.textContent = i18n.get('searching', [message.current, message.itemCount || 0]);
    } else {
      progressFill.classList.remove('indeterminate');
      const pct = Math.round((message.current / message.total) * 100);
      progressFill.style.width = pct + '%';
      progressText.textContent = i18n.get('searchingTotal', [message.current, message.total, message.itemCount || 0]);
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
  progressText.textContent = i18n.get('collecting');

  try {
    const items = await collectItems(all);
    if (!items || items.length === 0) {
      showError(i18n.get('noData'));
      return;
    }

    if (format === 'csv') {
      await downloadCsv(items);
    } else {
      await downloadExcel(items);
    }

    showStatus(i18n.get('downloadComplete', [items.length]));
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
      throw new Error(response.error || i18n.get('collectFailed'));
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
    throw new Error(response.error || i18n.get('collectFailed'));
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
  progressText.textContent = i18n.get('collecting');

  try {
    const items = await collectItems();
    if (!items || items.length === 0) {
      showError(i18n.get('noData'));
      return;
    }

    progressFill.classList.remove('indeterminate');
    progressFill.style.width = '70%';
    progressText.textContent = i18n.get('uploading', [items.length]);

    const range = getSelectedRange();
    const period = range
      ? { start: range.startMonth + '-01', end: range.endMonth + '-31' }
      : null;

    const result = await eolmaApi.send({ platform: activePlatform, items, period });

    progressFill.style.width = '100%';
    showStatus(i18n.get('uploadComplete', [result.uploadedCount]));
  } catch (e) {
    showError(i18n.get('uploadFailed') + e.message);
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
    showError(i18n.get('excelLoadError'));
    await downloadCsv(items);
    return;
  }

  const ws = XLSX.utils.json_to_sheet(items);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, i18n.get('paymentHistory'));

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, generateFilename('xlsx'));
}

function generateFilename(ext) {
  const platformName = activePlatform ? getPlatformLabel(activePlatform).toLowerCase() : 'eolma';
  const range = exportAll ? null : getSelectedRange();
  if (range) {
    if (range.startMonth === range.endMonth) {
      return `${platformName}_${range.startMonth}.${ext}`;
    }
    return `${platformName}_${range.startMonth}_${range.endMonth}.${ext}`;
  }
  return `${platformName}_all.${ext}`;
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
