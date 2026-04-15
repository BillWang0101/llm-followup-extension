export interface Pos {
  /** viewport top（配合 position:fixed） */
  top: number;
  left: number;
  /** 气泡最大可用高度（传给 card 限高，确保底部按钮在视口内） */
  maxHeight: number;
}

const BUBBLE_W = 380;
const MIN_H = 200;   // 再挤也要留这么多
const GAP = 8;       // 气泡到选区的距离
const EDGE = 12;     // 到视口边缘的安全距离

/**
 * 根据选区矩形计算气泡位置和可用高度。
 * - 优先放选区下方；下方空间比上方小很多时翻到上方
 * - 返回的 maxHeight = 所选方向的可用像素，气泡内容超过时内部滚动
 */
export function computeBubblePos(rect: DOMRect): Pos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const spaceBelow = vh - rect.bottom - GAP - EDGE;
  const spaceAbove = rect.top - GAP - EDGE;

  let top: number;
  let maxHeight: number;

  if (spaceBelow >= MIN_H || spaceBelow >= spaceAbove) {
    // 放下方
    top = rect.bottom + GAP;
    maxHeight = Math.max(MIN_H, spaceBelow);
  } else {
    // 翻到上方
    maxHeight = Math.max(MIN_H, spaceAbove);
    top = Math.max(EDGE, rect.top - GAP - maxHeight);
  }

  // 两种都太挤（很小的窗）→ 直接贴顶，满屏展开
  if (spaceBelow < MIN_H && spaceAbove < MIN_H) {
    top = EDGE;
    maxHeight = vh - EDGE * 2;
  }

  let left = rect.left;
  if (left + BUBBLE_W > vw - EDGE) left = Math.max(EDGE, vw - BUBBLE_W - EDGE);

  return { top, left, maxHeight };
}
