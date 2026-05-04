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
const progressEl = document.getElementById('progress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

let currentPageData = null;

// 초기화
async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url || !tab.url.includes('pay.naver.com/pc/history')) {
      showError('네이버페이 결제내역 페이지에서 실행해주세요.\n(pay.naver.com/pc/history)');
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CURRENT_PAGE' });

    if (!response || !response.success) {
      showError(response?.error || '데이터를 가져올 수 없습니다. 페이지를 새로고침해주세요.');
      return;
    }

    currentPageData = response;
    initDateSelectors();

    statusEl.textContent = `총 ${response.totalPage}페이지 (약 ${response.totalPage * response.itemCount}건)`;
    controlsEl.style.display = 'block';
  } catch (e) {
    showError('데이터를 가져올 수 없습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.');
  }
}

function initDateSelectors() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // 년도 셀렉터 (현재년도 ~ 5년 전)
  for (let y = currentYear; y >= currentYear - 5; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y + '년';
    yearEl.appendChild(opt);
  }

  // 월 셀렉터
  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement('option');
    opt.value = String(m).padStart(2, '0');
    opt.textContent = m + '월';
    monthEl.appendChild(opt);
  }

  // 현재 월 선택
  yearEl.value = currentYear;
  monthEl.value = String(currentMonth).padStart(2, '0');

  // 기간 선택 기본값
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
    const pct = Math.round((message.current / message.total) * 100);
    progressFill.style.width = pct + '%';
    const countText = message.itemCount ? ` (${message.itemCount}건 수집)` : '';
    progressText.textContent = `${message.current} / ${message.total} 페이지 검색 중...${countText}`;
  }
});

// 다운로드 버튼
btnCsv.addEventListener('click', () => startExport('csv'));
btnExcel.addEventListener('click', () => startExport('excel'));

async function startExport(format) {
  setButtonsDisabled(true);
  progressEl.style.display = 'block';
  progressFill.style.width = '0%';
  progressText.textContent = '데이터 수집 시작...';

  try {
    const items = await collectItems();
    if (!items || items.length === 0) {
      showError('해당 기간에 결제내역이 없습니다.');
      setButtonsDisabled(false);
      progressEl.style.display = 'none';
      return;
    }

    if (format === 'csv') {
      downloadCsv(items);
    } else {
      downloadExcel(items);
    }

    showStatus(`${items.length}건 다운로드 완료!`);
  } catch (e) {
    showError('다운로드 실패: ' + e.message);
  }

  progressEl.style.display = 'none';
  setButtonsDisabled(false);
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

  // 전체
  return null;
}

async function collectItems() {
  const range = getSelectedRange();

  if (range) {
    // 월별/기간별 fetch
    const response = await chrome.runtime.sendMessage({
      type: 'FETCH_BY_MONTH',
      startMonth: range.startMonth,
      endMonth: range.endMonth
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    progressFill.style.width = '100%';
    progressText.textContent = `완료! (${response.items.length}건)`;
    return response.items;
  }

  // 전체 fetch
  const response = await chrome.runtime.sendMessage({
    type: 'FETCH_ALL_PAGES',
    fromPage: 1
  });

  if (!response.success) {
    if (response.partialItems && response.partialItems.length > 0) {
      return response.partialItems;
    }
    throw new Error(response.error);
  }

  progressFill.style.width = '100%';
  progressText.textContent = '완료!';
  return response.items;
}

function setButtonsDisabled(disabled) {
  btnCsv.disabled = disabled;
  btnExcel.disabled = disabled;
}

// CSV 다운로드
function downloadCsv(items) {
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
function downloadExcel(items) {
  if (typeof XLSX === 'undefined') {
    showError('Excel 라이브러리를 로드할 수 없습니다. CSV로 다운로드합니다.');
    downloadCsv(items);
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
  const range = getSelectedRange();
  if (range) {
    if (range.startMonth === range.endMonth) {
      return `npay_history_${range.startMonth}.${ext}`;
    }
    return `npay_history_${range.startMonth}_${range.endMonth}.${ext}`;
  }
  return `npay_history_all.${ext}`;
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
