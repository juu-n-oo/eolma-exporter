# eolma UI 디자인 가이드

Apple Human Interface Guidelines에서 영감을 받은 디자인 컨셉.
이 문서는 UI 컴포넌트 구현 시 참조하는 디자인 원칙과 구체적인 스타일 가이드다.

---

## 디자인 원칙

### 1. 명료함 (Clarity)
- 콘텐츠가 디자인의 중심. 장식적 요소를 최소화한다
- 텍스트는 충분한 크기로, 계층 구조가 명확하게 보여야 한다
- 아이콘은 의미가 즉시 전달되는 것만 사용한다
- 불필요한 테두리, 그림자, 장식을 줄이고 여백으로 구조를 만든다

### 2. 존중 (Deference)
- UI는 콘텐츠를 돕는 역할이지, 콘텐츠와 경쟁하지 않는다
- 유동적인 모션과 부드러운 전환으로 사용자의 방향감을 유지한다
- 반투명, 블러 효과를 활용해 맥락을 유지하면서 깊이를 표현한다

### 3. 깊이 (Depth)
- 시각적 레이어와 리얼한 모션으로 계층을 전달한다
- 카드, 모달, 드롭다운에 미묘한 그림자로 떠 있는 느낌을 준다
- 터치/클릭 가능한 요소는 시각적으로 구분되어야 한다

---

## 컬러 시스템

### 라이트 모드 (기본)

| 용도 | 색상 | Tailwind |
|---|---|---|
| 배경 (메인) | `#FFFFFF` | `bg-white` |
| 배경 (보조) | `#F5F5F7` | `bg-gray-50` |
| 배경 (그룹) | `#F2F2F7` | 커스텀 `bg-surface` |
| 텍스트 (주) | `#1D1D1F` | `text-gray-900` |
| 텍스트 (보조) | `#86868B` | `text-gray-500` |
| 텍스트 (비활성) | `#AEAEB2` | `text-gray-400` |
| 구분선 | `#E5E5EA` | `border-gray-200` |
| 액센트 (Primary) | `#007AFF` | 커스텀 `text-primary` / `bg-primary` |
| 성공 | `#34C759` | 커스텀 `text-success` |
| 경고 | `#FF9500` | 커스텀 `text-warning` |
| 위험/지출 | `#FF3B30` | 커스텀 `text-danger` |
| 수입 | `#34C759` | 커스텀 `text-income` |
| 저축 | `#007AFF` | 커스텀 `text-savings` |

### 다크 모드 (Phase 2)

Phase 2에서 구현. `dark:` prefix로 대응할 수 있도록 라이트 모드부터 시맨틱 컬러 토큰으로 설계한다.

---

## 타이포그래피

Apple의 SF Pro에서 영감받은 시스템 폰트 스택 사용.

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
             'Helvetica Neue', Arial, sans-serif;
```

### 스케일

| 용도 | 크기 | 굵기 | Tailwind |
|---|---|---|---|
| 페이지 제목 | 28px | Bold (700) | `text-2xl font-bold` |
| 섹션 제목 | 22px | Semibold (600) | `text-xl font-semibold` |
| 카드 제목 | 17px | Semibold (600) | `text-base font-semibold` |
| 본문 | 15px | Regular (400) | `text-sm font-normal` |
| 보조 텍스트 | 13px | Regular (400) | `text-xs text-gray-500` |
| 금액 (강조) | 34px | Bold (700) | `text-3xl font-bold tabular-nums` |
| 금액 (일반) | 17px | Medium (500) | `text-base font-medium tabular-nums` |

> 금액에는 항상 `tabular-nums`(고정폭 숫자)를 적용하여 정렬을 맞춘다.

---

## 간격 및 레이아웃

### 간격 체계

Apple 스타일의 넉넉한 여백을 사용한다.

| 용도 | 값 | Tailwind |
|---|---|---|
| 페이지 패딩 | 24px | `p-6` |
| 섹션 간 간격 | 32px | `space-y-8` |
| 카드 내부 패딩 | 20px | `p-5` |
| 요소 간 간격 (좁은) | 8px | `gap-2` |
| 요소 간 간격 (기본) | 12px | `gap-3` |
| 요소 간 간격 (넓은) | 16px | `gap-4` |

### 레이아웃 구조

```
┌─────────────────────────────────────────────────┐
│  Header (56px, 고정)                              │
├──────────┬──────────────────────────────────────┤
│          │                                       │
│ Sidebar  │  Main Content                         │
│ (240px)  │  (max-width: 1200px, 중앙 정렬)       │
│          │                                       │
│          │  ┌─────────┐ ┌─────────┐              │
│          │  │  Card   │ │  Card   │              │
│          │  └─────────┘ └─────────┘              │
│          │                                       │
└──────────┴──────────────────────────────────────┘
```

- 사이드바: 240px 고정, 모바일에서 오버레이
- 메인 콘텐츠: `max-w-6xl mx-auto`로 중앙 정렬
- 헤더: 56px 높이, `backdrop-blur` 반투명 효과

---

## 컴포넌트 스타일

### 카드

Apple의 둥근 모서리 카드 스타일.

```
배경: white (bg-white)
모서리: 12px (rounded-xl)
그림자: 0 1px 3px rgba(0,0,0,0.08) (shadow-sm)
내부 패딩: 20px (p-5)
테두리: 없음 (그림자로 구분)
```

### 버튼

| 종류 | 스타일 |
|---|---|
| Primary | `bg-primary text-white rounded-lg px-4 py-2 font-medium` |
| Secondary | `bg-gray-100 text-gray-900 rounded-lg px-4 py-2 font-medium` |
| Danger | `bg-danger text-white rounded-lg px-4 py-2 font-medium` |
| Ghost | `text-primary hover:bg-gray-100 rounded-lg px-4 py-2` |

- 모서리: 8px (`rounded-lg`)
- 호버: 밝기 변화 (`hover:brightness-110` 또는 배경색 변화)
- 비활성: `opacity-50 cursor-not-allowed`
- 크기는 기본(py-2), 작은(py-1.5 text-sm), 큰(py-3 text-lg) 3단계

### 입력 필드

```
배경: #F5F5F7 (bg-gray-50)
모서리: 8px (rounded-lg)
패딩: 10px 12px (px-3 py-2.5)
테두리: 없음 (포커스 시 ring)
포커스: ring-2 ring-primary/50
```

> Apple 스타일의 입력 필드는 테두리 대신 배경색으로 영역을 구분하고, 포커스 시 링으로 강조한다.

### 모달

```
배경: white
모서리: 14px (rounded-2xl)
그림자: 0 25px 50px rgba(0,0,0,0.15)
오버레이: bg-black/30 backdrop-blur-sm
최대 너비: 480px
패딩: 24px (p-6)
```

### 테이블 / 리스트

- 테두리 없는 깔끔한 행 구분 (`divide-y divide-gray-100`)
- 행 호버: `hover:bg-gray-50`
- 헤더: `text-xs font-medium text-gray-500 uppercase tracking-wide`
- Apple 스타일의 그룹 리스트: 배경색 구분 + 둥근 모서리 그룹

### 사이드바 네비게이션

```
활성 항목: bg-gray-100 text-gray-900 font-medium rounded-lg
비활성 항목: text-gray-600 hover:bg-gray-50 rounded-lg
아이콘: 20px, 텍스트와 8px 간격
항목 패딩: px-3 py-2
항목 간 간격: 2px (gap-0.5)
```

---

## 차트 스타일 (Recharts)

대시보드 차트에 적용할 Apple 스타일 가이드.

### 색상 팔레트

카테고리별 차트 색상 (최대 8색):

```
#007AFF (파랑)
#34C759 (초록)
#FF9500 (주황)
#FF3B30 (빨강)
#AF52DE (보라)
#FF2D55 (핑크)
#5AC8FA (하늘)
#FFCC00 (노랑)
```

### 차트 공통

- 배경: 투명 (카드 위에 올라감)
- 그리드: 연한 점선 (`stroke="#F2F2F7" strokeDasharray="3 3"`)
- 축 텍스트: 13px, `#86868B`
- 툴팁: 둥근 모서리, 그림자, 흰색 배경
- 범례: 차트 하단, 간결한 라벨

---

## 모션 및 트랜지션

| 대상 | 속성 | 값 |
|---|---|---|
| 버튼 호버 | transition | `150ms ease` |
| 카드 등장 | fade + slide up | `300ms ease-out` |
| 모달 등장 | scale + fade | `200ms ease-out` |
| 사이드바 토글 | width + opacity | `250ms ease` |
| 페이지 전환 | fade | `200ms ease` |

Tailwind 기준: `transition-all duration-200 ease-out`

> 모션은 자연스럽고 빠르게. 300ms를 넘기지 않는다.

---

## 반응형 브레이크포인트

| 이름 | 너비 | 용도 |
|---|---|---|
| sm | 640px | 모바일 가로 |
| md | 768px | 태블릿 |
| lg | 1024px | 데스크톱 (사이드바 표시) |
| xl | 1280px | 넓은 데스크톱 |

- `lg` 미만: 사이드바 숨김, 햄버거 메뉴로 전환
- 대시보드 카드: `grid-cols-1 md:grid-cols-2 xl:grid-cols-4`
