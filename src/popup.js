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
const monthEl = document.getElementById('month');
const startMonthEl = document.getElementById('startMonth');
const endMonthEl = document.getElementById('endMonth');
const btnCsv = document.getElementById('btnCsv');
const btnExcel = document.getElementById('btnExcel');
const btnAllExcel = document.getElementById('btnAllExcel');
const btnAllCsv = document.getElementById('btnAllCsv');
const progressEl = document.getElementById('progress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const platformBadgeEl = document.getElementById('platformBadge');
const headerSubtitleEl = document.getElementById('headerSubtitle');
const versionBadgeEl = document.getElementById('versionBadge');
const btnAll = document.getElementById('btnAll');
const allMenuEl = document.getElementById('allMenu');
const allDropdownEl = document.getElementById('allDropdown');
const statusCardEl = document.getElementById('statusCard');
const unsupportedEl = document.getElementById('unsupported');
const unsupportedMsgEl = document.getElementById('unsupportedMsg');
const btnGoNaver = document.getElementById('btnGoNaver');
const btnGoCoupang = document.getElementById('btnGoCoupang');
const switchPlatformWrap = document.getElementById('switchPlatformWrap');
const switchPlatformEl = document.getElementById('switchPlatform');
const switchPlatformTextEl = document.getElementById('switchPlatformText');
const eolmaActionEl = document.getElementById('eolmaAction');
const serverPillEl = document.getElementById('serverPill');
const serverPillTextEl = document.getElementById('serverPillText');
const eolmaPillEl = document.getElementById('eolmaPill');
const eolmaPillTextEl = document.getElementById('eolmaPillText');
const btnUpload = document.getElementById('btnUpload');
const uploadHintEl = document.getElementById('uploadHint');
const btnCancel = document.getElementById('btnCancel');

// 플랫폼별 주문내역 페이지 URL (detectPlatform / content_scripts 매칭과 일치)
const PLATFORM_URLS = {
  naverpay: 'https://pay.naver.com/pc/history',
  coupang: 'https://mc.coupang.com/ssr/desktop/order/list'
};
const EOLMA_HOME = 'https://eolma.de';

let currentPageData = null;
let activePlatform = null;
let exportAll = false;
let serverUp = false;
let eolmaLoggedIn = false;
let activeTabId = null;
let exportPartial = false;

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

// 지원 페이지에서 반대 플랫폼 주문내역으로 이동하는 버튼을 구성한다.
function setupSwitchLink(platform) {
  const other = platform === 'naverpay' ? 'coupang' : 'naverpay';
  // tint 클래스로 대상 플랫폼 색을 부여 (dot/배경). 텍스트는 자식 span 에만 주입해 dot/svg 보존.
  switchPlatformEl.className = 'btn btn-switch ' + other;
  switchPlatformTextEl.textContent = other === 'coupang' ? i18n.get('goCoupang') : i18n.get('goNaverpay');
  switchPlatformWrap.style.display = 'block';
}

// 초기화
async function init() {
  // i18n 텍스트 설정
  document.getElementById('headerTitle').textContent = i18n.get('headerTitle');
  versionBadgeEl.textContent = `v${chrome.runtime.getManifest().version}`;
  document.getElementById('downloadRangeLabel').textContent = i18n.get('downloadRange');
  document.getElementById('monthLabel').textContent = i18n.get('yearMonth');
  document.getElementById('startLabel').textContent = i18n.get('start');
  document.getElementById('endLabel').textContent = i18n.get('end');
  btnExcel.textContent = i18n.get('downloadExcel');
  btnCsv.textContent = i18n.get('downloadCsv');
  document.getElementById('allPeriodLabel').textContent = i18n.get('allPeriod');
  btnAllExcel.textContent = i18n.get('allExcel');
  btnAllCsv.textContent = i18n.get('allCsv');
  btnGoNaver.textContent = i18n.get('goNaverpay');
  btnGoCoupang.textContent = i18n.get('goCoupang');
  btnUpload.textContent = i18n.get('eolmaUpload');
  btnCancel.textContent = i18n.get('cancelCollection');
  unsupportedMsgEl.textContent = i18n.get('unsupportedPage');

  // rangeType 옵션 설정
  rangeTypeEl.options[0].textContent = i18n.get('selectMonth');
  rangeTypeEl.options[1].textContent = i18n.get('selectRange');
  rangeTypeEl.options[2].textContent = i18n.get('selectAll');

  // 서버 가용 여부 + eolma 로그인 상태 (페이지 종류와 무관하게 표시)
  refreshEolmaState();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    activeTabId = tab.id;
    activePlatform = detectPlatform(tab.url || '');

    if (!activePlatform) {
      showUnsupported();
      return;
    }

    showPlatformBadge(activePlatform);
    setupSwitchLink(activePlatform);

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CURRENT_PAGE' });

    if ((!response || !response.success) && activePlatform !== 'coupang') {
      showError(response?.error || i18n.get('dataFetchFailed'));
      return;
    }

    // 쿠팡의 초기 SSR 구조가 바뀌어도 JSON API 기반 수집은 시도할 수 있어야 한다.
    currentPageData = response?.success ? response : { success: true, platform: 'coupang', itemCount: 0, hasNext: true };
    initDateSelectors();

    if (activePlatform === 'coupang') {
      if (response?.success) {
        const more = response.hasNext ? ` ${i18n.get('nextPageAvailable')}` : '';
        statusEl.textContent = i18n.get('currentPageInfo', [response.itemCount]) + more;
      } else {
        statusEl.textContent = i18n.get('coupangReady');
      }
    } else {
      statusEl.textContent = i18n.get('totalPageInfo', [response.totalPage, response.totalPage * response.itemCount]);
    }
    controlsEl.style.display = 'block';
    updateUploadButton();
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
  const pad = (n) => String(n).padStart(2, '0');
  const thisMonth = `${currentYear}-${pad(currentMonth)}`;

  // 단일 년월 입력 (YYYY-MM)
  monthEl.value = thisMonth;
  endMonthEl.value = thisMonth;
  startMonthEl.value = thisMonth;
}

function showError(msg) {
  statusEl.textContent = msg;
  statusEl.classList.add('error');
}

function showStatus(msg) {
  statusEl.textContent = msg;
  statusEl.classList.remove('error');
}

// 네이버페이/쿠팡 주문내역 페이지가 아닐 때의 안내 화면
function showUnsupported() {
  statusCardEl.style.display = 'none';
  controlsEl.style.display = 'none';
  unsupportedEl.style.display = 'block';
}

// eolma 로그인 상태를 확인해 LED pill 로 표시
async function renderEolmaStatus() {
  eolmaPillEl.classList.remove('on', 'off');
  eolmaPillTextEl.textContent = i18n.get('eolmaChecking');
  eolmaActionEl.style.display = 'none';

  let result = { loggedIn: false };
  try {
    result = await eolmaApi.checkAuth();
  } catch {
    result = { loggedIn: false };
  }

  eolmaLoggedIn = !!result.loggedIn;
  if (result.loggedIn) {
    eolmaPillEl.classList.add('on');
    eolmaPillTextEl.textContent = result.user?.name || i18n.get('eolmaLoggedIn');
    eolmaActionEl.textContent = i18n.get('visitEolma');
    eolmaActionEl.href = EOLMA_HOME;
  } else {
    eolmaPillEl.classList.remove('on', 'off');
    eolmaPillTextEl.textContent = i18n.get('eolmaLoggedOut');
    eolmaActionEl.textContent = i18n.get('eolmaLogin');
    eolmaActionEl.href = `${EOLMA_HOME}/login`;
  }
  eolmaActionEl.style.display = 'inline';
}

// 서버 가용 여부(Online/Offline) → (가용 시) eolma 로그인 상태 순으로 갱신
async function refreshEolmaState() {
  serverPillEl.classList.remove('on', 'off');
  serverPillTextEl.textContent = i18n.get('serverChecking');

  serverUp = await eolmaApi.checkHealth();

  if (serverUp) {
    serverPillEl.classList.add('on');
    serverPillTextEl.textContent = i18n.get('serverUp');
    await renderEolmaStatus();
  } else {
    serverPillEl.classList.add('off');
    serverPillTextEl.textContent = i18n.get('serverDown');
    // 서버 미가용 시 로그인 확인 불가
    eolmaLoggedIn = false;
    eolmaPillEl.classList.remove('on', 'off');
    eolmaPillTextEl.textContent = i18n.get('eolmaUnknown');
    eolmaActionEl.style.display = 'none';
  }
  updateUploadButton();
}

// 업로드 버튼 활성/비활성 + 힌트
function updateUploadButton() {
  const canUpload = !!activePlatform && serverUp && eolmaLoggedIn;
  btnUpload.disabled = !canUpload;

  if (!activePlatform) {
    uploadHintEl.style.display = 'none';
  } else if (!serverUp) {
    uploadHintEl.textContent = i18n.get('uploadNeedServer');
    uploadHintEl.style.display = 'block';
  } else if (!eolmaLoggedIn) {
    uploadHintEl.textContent = i18n.get('uploadNeedLogin');
    uploadHintEl.style.display = 'block';
  } else {
    uploadHintEl.style.display = 'none';
  }
}

// 미지원 페이지 안내 — 네이버페이/쿠팡 주문내역으로 이동
btnGoNaver.addEventListener('click', () => chrome.tabs.create({ url: PLATFORM_URLS.naverpay }));
btnGoCoupang.addEventListener('click', () => chrome.tabs.create({ url: PLATFORM_URLS.coupang }));

// 지원 페이지 — 반대 플랫폼 주문내역을 새 탭으로 연다
switchPlatformEl.addEventListener('click', () => {
  if (!activePlatform) return;
  const other = activePlatform === 'naverpay' ? 'coupang' : 'naverpay';
  chrome.tabs.create({ url: PLATFORM_URLS[other] });
});

// 전체 기간 드롭다운 (Excel / CSV 통합)
function setAllMenuOpen(open) {
  allMenuEl.style.display = open ? 'block' : 'none';
  allDropdownEl.classList.toggle('open', open);
}
btnAll.addEventListener('click', (e) => {
  e.stopPropagation();
  setAllMenuOpen(allMenuEl.style.display !== 'block');
});
document.addEventListener('click', () => setAllMenuOpen(false));

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

// eolma 업로드 버튼
btnUpload.addEventListener('click', startUpload);
btnCancel.addEventListener('click', async () => {
  if (activePlatform !== 'coupang' || activeTabId == null) return;
  btnCancel.disabled = true;
  progressText.textContent = i18n.get('cancellingCollection');
  try {
    await chrome.tabs.sendMessage(activeTabId, { type: 'CANCEL_FETCH' });
  } catch {
    // 탭이 닫히거나 이동한 경우 진행 중 요청도 함께 사라진다.
  }
});

async function startUpload() {
  setButtonsDisabled(true);
  progressEl.style.display = 'block';
  progressFill.classList.add('indeterminate');
  progressText.textContent = i18n.get('collecting');
  setCancelVisible(true);

  try {
    const collection = await collectItems(rangeTypeEl.value === 'all');
    const items = collection.items;
    if (!items || items.length === 0) {
      showError(i18n.get('noData'));
      return;
    }
    if (collection.partial) {
      showError(i18n.get('partialUploadBlocked'));
      return;
    }
    progressFill.classList.add('indeterminate');
    progressText.textContent = i18n.get('uploading', [items.length]);

    const result = await eolmaApi.send({ platform: activePlatform, items });
    showStatus(i18n.get('uploadComplete', [result.uploadedCount]));
  } catch (e) {
    if (e?.code === 'CANCELLED') {
      showStatus(i18n.get('collectionCancelled'));
    } else if (e?.collectionError) {
      showError(e.message);
    } else {
      handleUploadError(e);
    }
  } finally {
    progressFill.classList.remove('indeterminate');
    progressEl.style.display = 'none';
    setCancelVisible(false);
    setButtonsDisabled(false);
  }
}

// 업로드 실패 처리 — 401/403/5xx/네트워크 분기 (데이터는 Excel/CSV 폴백 가능)
function handleUploadError(e) {
  const status = e?.status;
  if (status === 401) {
    showError(i18n.get('uploadAuthError'));
    refreshEolmaState();
  } else if (status === 403) {
    showError(i18n.get('uploadForbidden'));
  } else if (status === 0) {
    showError(i18n.get('uploadNetworkError'));
    refreshEolmaState();
  } else if (status === 422) {
    showError(i18n.get('uploadNoValid'));
  } else {
    showError(i18n.get('uploadServerError'));
  }
}

async function startExport(format, all = false) {
  exportAll = all;
  setButtonsDisabled(true);
  progressEl.style.display = 'block';
  progressFill.classList.remove('indeterminate');
  progressFill.style.width = '0%';
  progressText.textContent = i18n.get('collecting');
  exportPartial = false;
  setCancelVisible(true);

  try {
    const collection = await collectItems(all);
    const items = collection.items;
    if (!items || items.length === 0) {
      showError(i18n.get('noData'));
      return;
    }
    exportPartial = collection.partial;

    if (format === 'csv') {
      await downloadCsv(items);
    } else {
      await downloadExcel(items);
    }

    showStatus(i18n.get(collection.partial ? 'partialDownloadComplete' : 'downloadComplete', [items.length]));
  } catch (e) {
    if (e?.code === 'CANCELLED') {
      showStatus(i18n.get('collectionCancelled'));
    } else {
      showError(e.message);
    }
  } finally {
    progressFill.classList.remove('indeterminate');
    progressEl.style.display = 'none';
    setCancelVisible(false);
    setButtonsDisabled(false);
  }
}

function getSelectedRange() {
  const type = rangeTypeEl.value;

  if (type === 'month') {
    const ym = monthEl.value;
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
  const message = range
    ? {
        type: 'FETCH_BY_MONTH',
        platform: activePlatform,
        startMonth: range.startMonth,
        endMonth: range.endMonth
      }
    : {
        type: 'FETCH_ALL_PAGES',
        platform: activePlatform,
        fromPage: 1
      };

  const response = activePlatform === 'coupang'
    ? await chrome.tabs.sendMessage(activeTabId, message)
    : await chrome.runtime.sendMessage(message);

  if (!response?.success) {
    if (response?.partialItems?.length > 0) {
      return { items: response.partialItems, partial: true, warning: response.error };
    }
    const error = new Error(response?.error || i18n.get('collectFailed'));
    error.code = response?.code;
    error.collectionError = true;
    throw error;
  }

  progressFill.classList.remove('indeterminate');
  progressFill.style.width = '100%';
  progressText.textContent = i18n.get('collectionComplete', [response.items.length]);
  return {
    items: response.items,
    partial: Boolean(response.partial),
    warning: response.error || null
  };
}

function setCancelVisible(visible) {
  const canCancel = visible && activePlatform === 'coupang';
  btnCancel.style.display = canCancel ? 'block' : 'none';
  btnCancel.disabled = false;
}

function setButtonsDisabled(disabled) {
  btnCsv.disabled = disabled;
  btnExcel.disabled = disabled;
  btnAll.disabled = disabled;
  btnAllExcel.disabled = disabled;
  btnAllCsv.disabled = disabled;
  if (disabled) {
    setAllMenuOpen(false);
    btnUpload.disabled = true;
  } else {
    updateUploadButton();
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
  const partialSuffix = exportPartial ? '_partial' : '';
  const range = exportAll ? null : getSelectedRange();
  if (range) {
    if (range.startMonth === range.endMonth) {
      return `${platformName}_${range.startMonth}${partialSuffix}.${ext}`;
    }
    return `${platformName}_${range.startMonth}_${range.endMonth}${partialSuffix}.${ext}`;
  }
  return `${platformName}_all${partialSuffix}.${ext}`;
}

function downloadBlob(blob, filename) {
  const reader = new FileReader();
  reader.onload = () => {
    chrome.downloads.download({
      url: reader.result,
      filename,
      saveAs: true
    });
  };
  reader.readAsDataURL(blob);
}

init();
