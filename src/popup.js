// Popup 로직

// 이 확장 프로그램은 한국어 전용으로 제공한다. 플랫폼명·상태 문구처럼
// 동적으로 조합되는 텍스트만 한곳에 둔다.
const TEXT = Object.freeze({
  naverpay: '네이버페이',
  coupang: '쿠팡',
  headerSubtitle: '결제 내역 내보내기',
  goNaverpay: '네이버페이 주문내역 열기',
  goCoupang: '쿠팡 주문내역 열기',
  dataFetchFailed: '데이터를 가져올 수 없습니다. 페이지를 새로고침해주세요.',
  refreshPage: '페이지를 새로고침한 뒤 확장 프로그램 아이콘을 다시 클릭해주세요.',
  eolmaChecking: 'eolma 로그인 확인 중...',
  eolmaLoggedIn: '로그인됨',
  eolmaLoggedOut: '미로그인',
  eolmaTabRequired: 'eolma 탭에서 로그인 필요',
  eolmaUnknown: '로그인 상태 확인 불가',
  visitEolma: 'eolma 가계부 방문 →',
  eolmaLogin: 'eolma 로그인',
  serverChecking: '서버 상태 확인 중...',
  serverUp: 'Online',
  serverDown: 'Offline',
  uploadNeedServer: '서버 연결 후 전송할 수 있습니다.',
  uploadNeedLogin: 'eolma 로그인 후 전송할 수 있습니다.',
  uploadNeedEolmaTab: 'eolma 탭에서 로그인한 뒤 전송할 수 있습니다.',
  uploadAuthError: 'eolma 재로그인이 필요합니다. 데이터는 Excel/CSV로 내려받을 수 있습니다.',
  uploadForbidden: '권한이 없어 전송할 수 없습니다.',
  uploadNetworkError: 'eolma 서버에 연결할 수 없습니다.',
  uploadNoValid: '전송할 수 있는 항목이 없습니다.',
  uploadServerError: '서버 오류로 전송에 실패했습니다. 잠시 후 다시 시도하거나 Excel/CSV로 내려받으세요.',
  coupangReady: '쿠팡 로그인 세션에서 주문내역을 조회할 준비가 되었습니다.',
  noData: '해당 기간에 결제내역이 없습니다.',
  partialUploadBlocked: '일부 주문만 수집되어 eolma 전송을 중단했습니다. CSV/Excel 부분 결과를 확인해주세요.',
  collectionCancelled: '데이터 수집을 취소했습니다.',
  collecting: '데이터 수집 시작...',
  cancellingCollection: '수집을 취소하는 중...',
  collectFailed: '데이터 수집에 실패했습니다.',
  excelLoadError: 'Excel 라이브러리를 로드할 수 없습니다. CSV로 다운로드합니다.',
  paymentHistory: '결제내역',
  currentPageInfo: (count) => `현재 페이지 ${count}건`,
  totalPageInfo: (total, count) => `총 ${total}페이지 (약 ${count}건)`,
  nextPageAvailable: '(다음 페이지 있음)',
  searching: (current, items) => `${current}페이지 검색 중... (${items}건 수집)`,
  searchingTotal: (current, total, items) => `${current} / ${total}페이지 검색 중... (${items}건 수집)`,
  uploading: (count) => `${count}건 eolma로 전송 중...`,
  uploadComplete: (count) => `eolma 전송 완료! (${count}건)`,
  downloadComplete: (count) => `${count}건 다운로드 완료!`,
  partialDownloadComplete: (count) => `${count}건의 부분 결과를 다운로드했습니다. 파일명의 _부분을 확인해주세요.`,
  collectionComplete: (count) => `수집 완료! (${count}건)`
});

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
    naverpay: TEXT.naverpay,
    coupang: TEXT.coupang
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
    headerSubtitleEl.textContent = `${getPlatformLabel(platform)} ${TEXT.headerSubtitle}`;
  }
}

// 지원 페이지에서 반대 플랫폼 주문내역으로 이동하는 버튼을 구성한다.
function setupSwitchLink(platform) {
  const other = platform === 'naverpay' ? 'coupang' : 'naverpay';
  // tint 클래스로 대상 플랫폼 색을 부여 (dot/배경). 텍스트는 자식 span 에만 주입해 dot/svg 보존.
  switchPlatformEl.className = 'btn btn-switch ' + other;
  switchPlatformTextEl.textContent = other === 'coupang' ? TEXT.goCoupang : TEXT.goNaverpay;
  switchPlatformWrap.style.display = 'block';
}

// 초기화
async function init() {
  versionBadgeEl.textContent = `v${chrome.runtime.getManifest().version}`;

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
      showError(response?.error || TEXT.dataFetchFailed);
      return;
    }

    // 쿠팡의 초기 SSR 구조가 바뀌어도 JSON API 기반 수집은 시도할 수 있어야 한다.
    currentPageData = response?.success ? response : { success: true, platform: 'coupang', itemCount: 0, hasNext: true };
    initDateSelectors();

    if (activePlatform === 'coupang') {
      if (response?.success) {
        const more = response.hasNext ? ` ${TEXT.nextPageAvailable}` : '';
        statusEl.textContent = TEXT.currentPageInfo(response.itemCount) + more;
      } else {
        statusEl.textContent = TEXT.coupangReady;
      }
    } else {
      statusEl.textContent = TEXT.totalPageInfo(response.totalPage, response.totalPage * response.itemCount);
    }
    controlsEl.style.display = 'block';
    updateUploadButton();
  } catch (e) {
    if (e?.message?.includes('Could not establish connection') || e?.message?.includes('Receiving end does not exist')) {
      showError(TEXT.refreshPage);
    } else {
      showError(TEXT.dataFetchFailed);
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
  eolmaPillTextEl.textContent = TEXT.eolmaChecking;
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
    eolmaPillTextEl.textContent = result.user?.name || TEXT.eolmaLoggedIn;
    eolmaActionEl.textContent = TEXT.visitEolma;
    eolmaActionEl.href = EOLMA_HOME;
  } else {
    eolmaPillEl.classList.remove('on', 'off');
    eolmaPillTextEl.textContent = result.reason === 'EOLMA_TAB_REQUIRED'
      ? TEXT.eolmaTabRequired
      : TEXT.eolmaLoggedOut;
    eolmaActionEl.textContent = TEXT.eolmaLogin;
    eolmaActionEl.href = `${EOLMA_HOME}/login`;
  }
  eolmaActionEl.style.display = 'inline';
}

// 서버 가용 여부(Online/Offline) → (가용 시) eolma 로그인 상태 순으로 갱신
async function refreshEolmaState() {
  serverPillEl.classList.remove('on', 'off');
  serverPillTextEl.textContent = TEXT.serverChecking;

  serverUp = await eolmaApi.checkHealth();

  if (serverUp) {
    serverPillEl.classList.add('on');
    serverPillTextEl.textContent = TEXT.serverUp;
    await renderEolmaStatus();
  } else {
    serverPillEl.classList.add('off');
    serverPillTextEl.textContent = TEXT.serverDown;
    // 서버 미가용 시 로그인 확인 불가
    eolmaLoggedIn = false;
    eolmaPillEl.classList.remove('on', 'off');
    eolmaPillTextEl.textContent = TEXT.eolmaUnknown;
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
    uploadHintEl.textContent = TEXT.uploadNeedServer;
    uploadHintEl.style.display = 'block';
  } else if (!eolmaLoggedIn) {
    uploadHintEl.textContent = eolmaPillTextEl.textContent === TEXT.eolmaTabRequired
      ? TEXT.uploadNeedEolmaTab
      : TEXT.uploadNeedLogin;
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
      progressText.textContent = TEXT.searching(message.current, message.itemCount || 0);
    } else {
      progressFill.classList.remove('indeterminate');
      const pct = Math.round((message.current / message.total) * 100);
      progressFill.style.width = pct + '%';
      progressText.textContent = TEXT.searchingTotal(message.current, message.total, message.itemCount || 0);
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
  progressText.textContent = TEXT.cancellingCollection;
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
  progressText.textContent = TEXT.collecting;
  setCancelVisible(true);

  try {
    const collection = await collectItems(rangeTypeEl.value === 'all');
    const items = collection.items;
    if (!items || items.length === 0) {
      showError(TEXT.noData);
      return;
    }
    if (collection.partial) {
      showError(TEXT.partialUploadBlocked);
      return;
    }
    progressFill.classList.add('indeterminate');
    progressText.textContent = TEXT.uploading(items.length);

    const result = await eolmaApi.send({ platform: activePlatform, items });
    showStatus(TEXT.uploadComplete(result.uploadedCount));
  } catch (e) {
    if (e?.code === 'CANCELLED') {
      showStatus(TEXT.collectionCancelled);
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
  if (e?.code === 'EOLMA_TAB_REQUIRED') {
    showError(TEXT.uploadNeedEolmaTab);
    refreshEolmaState();
  } else if (status === 401) {
    showError(TEXT.uploadAuthError);
    refreshEolmaState();
  } else if (status === 403) {
    showError(TEXT.uploadForbidden);
  } else if (status === 0) {
    showError(TEXT.uploadNetworkError);
    refreshEolmaState();
  } else if (status === 422) {
    showError(TEXT.uploadNoValid);
  } else {
    showError(TEXT.uploadServerError);
  }
}

async function startExport(format, all = false) {
  exportAll = all;
  setButtonsDisabled(true);
  progressEl.style.display = 'block';
  progressFill.classList.remove('indeterminate');
  progressFill.style.width = '0%';
  progressText.textContent = TEXT.collecting;
  exportPartial = false;
  setCancelVisible(true);

  try {
    const collection = await collectItems(all);
    const items = collection.items;
    if (!items || items.length === 0) {
      showError(TEXT.noData);
      return;
    }
    exportPartial = collection.partial;

    if (format === 'csv') {
      await downloadCsv(items);
    } else {
      await downloadExcel(items);
    }

    showStatus(collection.partial ? TEXT.partialDownloadComplete(items.length) : TEXT.downloadComplete(items.length));
  } catch (e) {
    if (e?.code === 'CANCELLED') {
      showStatus(TEXT.collectionCancelled);
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
    const error = new Error(response?.error || TEXT.collectFailed);
    error.code = response?.code;
    error.collectionError = true;
    throw error;
  }

  progressFill.classList.remove('indeterminate');
  progressFill.style.width = '100%';
  progressText.textContent = TEXT.collectionComplete(response.items.length);
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
    showError(TEXT.excelLoadError);
    await downloadCsv(items);
    return;
  }

  const ws = XLSX.utils.json_to_sheet(items);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, TEXT.paymentHistory);

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, generateFilename('xlsx'));
}

function generateFilename(ext) {
  const platformName = activePlatform ? getPlatformLabel(activePlatform).toLowerCase() : 'eolma';
  const partialSuffix = exportPartial ? '_부분' : '';
  const range = exportAll ? null : getSelectedRange();
  if (range) {
    if (range.startMonth === range.endMonth) {
      return `${platformName}_${range.startMonth}${partialSuffix}.${ext}`;
    }
    return `${platformName}_${range.startMonth}_${range.endMonth}${partialSuffix}.${ext}`;
  }
  return `${platformName}_전체${partialSuffix}.${ext}`;
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
