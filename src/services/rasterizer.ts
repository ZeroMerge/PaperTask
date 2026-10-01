import QRCode from 'qrcode';
import type { CardPropertyConfig, NotionTask, PrintSettings, RollHeaderConfig } from '../types';

export const THERMAL_WIDTH = 384; // Fixed dots across 57mm paper

/**
 * Helper to draw a filled rounded rectangle (strictly 0 to 7px radius, no solid border)
 */
function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillColor: string
) {
  ctx.save();
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Word wrap helper for canvas text
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Render a Notion Task into a high-contrast, borderless 384px Canvas
 * Dynamically renders properties pulled from the user's Notion Database!
 */
export async function renderTaskCard(
  task: NotionTask,
  properties: CardPropertyConfig[],
  _settings: PrintSettings,
  options?: { isRollItem?: boolean }
): Promise<{ canvas: HTMLCanvasElement; height: number }> {
  const canvas = document.createElement('canvas');
  canvas.width = THERMAL_WIDTH;
  canvas.height = 1800; // estimated max, cropped later
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas 2D context');

  // Fill canvas with pure white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, THERMAL_WIDTH, canvas.height);

  let y = options?.isRollItem ? 12 : 20; // Start padding
  const paddingX = 12; // Usable width: 360 dots
  const contentWidth = THERMAL_WIDTH - paddingX * 2;

  // 1. Gather all badge-type properties (Select, Status) that are enabled
  const enabledProps = properties.filter((p) => p.enabled);
  const badgeItems: { label: string; text: string }[] = [];

  for (const prop of enabledProps) {
    const propName = prop.label;
    const taskProp = task.properties?.[propName];
    if (taskProp && taskProp.displayString) {
      if (taskProp.type === 'select' || taskProp.type === 'status') {
        badgeItems.push({ label: propName, text: taskProp.displayString.toUpperCase() });
      }
    }
  }

  // Fallback for manually added priority or status if not in dynamic properties
  if (badgeItems.length === 0) {
    if (task.priority) {
      badgeItems.push({ label: 'Priority', text: `● ${task.priority.toUpperCase()}` });
    }
    if (task.status) {
      badgeItems.push({ label: 'Status', text: task.status.replace('_', ' ').toUpperCase() });
    }
    if (task.project) {
      badgeItems.push({ label: 'Project', text: task.project.toUpperCase() });
    }
  }

  // Render Top Badges (Solid black rounded rectangles, white knockout bold text)
  if (badgeItems.length > 0) {
    let badgeX = paddingX;
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    for (const badge of badgeItems) {
      const textWidth = ctx.measureText(badge.text).width;
      const pillW = textWidth + 18;

      if (badgeX + pillW > THERMAL_WIDTH - paddingX) {
        badgeX = paddingX;
        y += 28;
      }

      fillRoundedRect(ctx, badgeX, y, pillW, 24, 4, '#000000');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(badge.text, badgeX + 9, y + 17);
      ctx.fillStyle = '#000000';
      badgeX += pillW + 8;
    }
    y += 34;
  }

  // 2. MAIN TASK HEADLINE (Bold 24px punchy typography)
  ctx.fillStyle = '#000000';
  ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const titleLines = wrapText(ctx, task.title, contentWidth - 38);

  // Tactile Checkbox: 24x24 square with 3px stroke for physical pen check
  const checkboxSize = 24;
  const checkboxY = y + 2;
  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(paddingX, checkboxY, checkboxSize, checkboxSize, 4);
  ctx.stroke();
  ctx.restore();

  // Draw Title text lines (large, crisp, readable)
  ctx.fillStyle = '#000000';
  for (let i = 0; i < titleLines.length; i++) {
    ctx.fillText(titleLines[i], paddingX + 36, y + 22 + i * 32);
  }
  y += Math.max(36, titleLines.length * 32 + 12);

  // 3. MULTI-SELECT TAGS
  for (const prop of enabledProps) {
    const taskProp = task.properties?.[prop.label];
    if (taskProp && taskProp.type === 'multi_select' && Array.isArray(taskProp.value)) {
      const tags = taskProp.value as string[];
      if (tags.length > 0) {
        let tagX = paddingX;
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        for (const tag of tags) {
          const tagText = `#${tag}`;
          const tWidth = ctx.measureText(tagText).width;
          const tagW = tWidth + 14;
          if (tagX + tagW > THERMAL_WIDTH - paddingX) {
            tagX = paddingX;
            y += 28;
          }
          fillRoundedRect(ctx, tagX, y, tagW, 22, 4, '#000000');
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(tagText, tagX + 7, y + 16);
          ctx.fillStyle = '#000000';
          tagX += tagW + 6;
        }
        y += 30;
      }
    }
  }

  // 4. DYNAMIC PROPERTIES (Date, Number, People, Text, Checkbox)
  for (const prop of enabledProps) {
    const taskProp = task.properties?.[prop.label];
    if (!taskProp || !taskProp.displayString) continue;

    // Skip title, select, status, multi_select already rendered
    if (
      taskProp.type === 'title' ||
      taskProp.type === 'select' ||
      taskProp.type === 'status' ||
      taskProp.type === 'multi_select'
    ) {
      continue;
    }

    if (taskProp.type === 'date') {
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`📅 ${prop.label}: ${taskProp.displayString}`, paddingX, y + 16);
      y += 26;
    } else if (taskProp.type === 'number') {
      const numVal = Number(taskProp.value) || 0;
      const lower = prop.label.toLowerCase();

      // Check if this is a Pomodoro / Focus counter
      if (lower.includes('pomo') || lower.includes('estimate') || lower.includes('focus')) {
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(`${prop.label}:`, paddingX, y + 16);

        const pomoCount = Math.min(8, Math.max(1, numVal || 4));
        const pomoRadius = 6.5;
        const startX = paddingX + ctx.measureText(`${prop.label}:`).width + 14;

        ctx.save();
        for (let p = 0; p < pomoCount; p++) {
          const cx = startX + p * 19 + pomoRadius;
          const cy = y + 11;
          ctx.beginPath();
          ctx.arc(cx, cy, pomoRadius, 0, Math.PI * 2);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.2;
          ctx.stroke();
        }
        ctx.restore();
        y += 28;
      } else {
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(`🔢 ${prop.label}: ${taskProp.displayString}`, paddingX, y + 16);
        y += 26;
      }
    } else if (taskProp.type === 'people') {
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`👤 ${prop.label}: ${taskProp.displayString}`, paddingX, y + 16);
      y += 26;
    } else if (taskProp.type === 'checkbox') {
      const isChecked = Boolean(taskProp.value);
      ctx.save();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(paddingX, y + 1, 18, 18, 3);
      if (isChecked) {
        ctx.fillStyle = '#000000';
        ctx.fill();
      } else {
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(prop.label, paddingX + 26, y + 16);
      y += 26;
    } else if (taskProp.type === 'rich_text' || taskProp.type === 'formula') {
      ctx.fillStyle = '#000000';
      ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const textLines = wrapText(ctx, `${prop.label}: ${taskProp.displayString}`, contentWidth);
      for (let l = 0; l < textLines.length; l++) {
        ctx.fillText(textLines[l], paddingX, y + 15 + l * 22);
      }
      y += textLines.length * 22 + 6;
    }
  }

  // 5. SUBTASKS CHECKLIST (if present)
  if (task.subtasks && task.subtasks.length > 0) {
    y += 8;
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    for (const sub of task.subtasks) {
      ctx.save();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(paddingX + 2, y, 18, 18, 3);
      if (sub.completed) {
        ctx.fillStyle = '#000000';
        ctx.fill();
      } else {
        ctx.stroke();
      }
      ctx.restore();

      ctx.fillStyle = '#000000';
      const subLines = wrapText(ctx, sub.text, contentWidth - 32);
      for (let s = 0; s < subLines.length; s++) {
        ctx.fillText(subLines[s], paddingX + 28, y + 15 + s * 24);
      }
      y += Math.max(26, subLines.length * 24 + 6);
    }
  }

  // 6. SCANNABLE NOTION PAGE QR CODE (if page link exists)
  const qrPropEnabled = properties.find((p) => p.id === 'qrCode' || p.type === 'qr')?.enabled ?? true;
  if (qrPropEnabled && task.notionUrl) {
    y += 12;
    try {
      const qrDataUrl = await QRCode.toDataURL(task.notionUrl, {
        width: 84,
        margin: 0,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#FFFFFF' },
      });

      const qrImg = new Image();
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = reject;
        qrImg.src = qrDataUrl;
      });

      const qrX = paddingX;
      ctx.drawImage(qrImg, qrX, y, 80, 80);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('NOTION PAGE LINK', qrX + 94, y + 34);
      ctx.font = 'bold 11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText('Scan to view or edit page', qrX + 94, y + 52);

      y += 92;
    } catch {
      // Continue if QR fails
    }
  }

  // 7. SUBTLE DOTTED TEAR-LINE (Only for standalone cards, avoided in continuous roll)
  if (!options?.isRollItem) {
    y += 16;
    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(paddingX, y);
    ctx.lineTo(THERMAL_WIDTH - paddingX, y);
    ctx.stroke();
    ctx.restore();
    y += 20; // Bottom margin
  } else {
    y += 10;
  }

  // Crop canvas to actual used height
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = THERMAL_WIDTH;
  finalCanvas.height = y;
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) throw new Error('Could not get final canvas context');

  finalCtx.drawImage(canvas, 0, 0, THERMAL_WIDTH, y, 0, 0, THERMAL_WIDTH, y);

  return { canvas: finalCanvas, height: y };
}

/**
 * Render an official Daily Mission Receipt Header at the top of the roll
 */
export function renderRollHeader(
  tasks: NotionTask[],
  config: RollHeaderConfig
): { canvas: HTMLCanvasElement; height: number } {
  const canvas = document.createElement('canvas');
  canvas.width = THERMAL_WIDTH;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, THERMAL_WIDTH, 360);

  const paddingX = 14;
  let y = 16;

  // Solid double header border
  ctx.fillStyle = '#000000';
  ctx.fillRect(paddingX, y, THERMAL_WIDTH - paddingX * 2, 3);
  y += 6;
  ctx.fillRect(paddingX, y, THERMAL_WIDTH - paddingX * 2, 1);
  y += 20;

  // Title: e.g. "● PAPERTASK DAILY FOCUS ●"
  ctx.textAlign = 'center';
  ctx.font = '900 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(config.customTitle.toUpperCase() || "TODAY'S MISSIONS", THERMAL_WIDTH / 2, y);
  y += 22;

  // Today's Date
  if (config.showDate) {
    const todayStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).toUpperCase();
    ctx.font = 'bold 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(todayStr, THERMAL_WIDTH / 2, y);
    y += 18;
  }

  // Subtle separator line
  ctx.save();
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(paddingX + 24, y);
  ctx.lineTo(THERMAL_WIDTH - paddingX - 24, y);
  ctx.stroke();
  ctx.restore();
  y += 18;

  // Stats: task count & focus pomodoros
  if (config.showStats) {
    const totalPomodoros = tasks.reduce((sum, t) => sum + (t.estimatePomodoros || 1), 0);
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${tasks.length} TASKS  ·  ${totalPomodoros} FOCUS POMODOROS`, THERMAL_WIDTH / 2, y);
    y += 20;
  }

  // Daily Motto / Quote
  if (config.motto) {
    ctx.font = 'italic 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`“${config.motto}”`, THERMAL_WIDTH / 2, y);
    y += 20;
  }

  // Bottom double line
  ctx.textAlign = 'left';
  y += 2;
  ctx.fillRect(paddingX, y, THERMAL_WIDTH - paddingX * 2, 1);
  y += 3;
  ctx.fillRect(paddingX, y, THERMAL_WIDTH - paddingX * 2, 3);
  y += 16;

  const cropped = document.createElement('canvas');
  cropped.width = THERMAL_WIDTH;
  cropped.height = y;
  const cCtx = cropped.getContext('2d');
  if (cCtx) cCtx.drawImage(canvas, 0, 0, THERMAL_WIDTH, y, 0, 0, THERMAL_WIDTH, y);
  return { canvas: cropped, height: y };
}

/**
 * Render an end-of-day reflection notes box at the bottom of the roll
 */
export function renderRollFooter(): { canvas: HTMLCanvasElement; height: number } {
  const canvas = document.createElement('canvas');
  canvas.width = THERMAL_WIDTH;
  canvas.height = 220;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, THERMAL_WIDTH, 220);

  const paddingX = 14;
  let y = 14;

  // Top double line
  ctx.fillStyle = '#000000';
  ctx.fillRect(paddingX, y, THERMAL_WIDTH - paddingX * 2, 3);
  y += 6;
  ctx.fillRect(paddingX, y, THERMAL_WIDTH - paddingX * 2, 1);
  y += 20;

  // Pen reflection box
  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(paddingX + 4, y - 14, 18, 18);
  ctx.restore();

  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('ALL TASKS COMPLETED', paddingX + 32, y);
  y += 24;

  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('DAILY REFLECTION & NOTES:', paddingX + 4, y);
  y += 18;

  // Pen write-in lines
  for (let l = 0; l < 2; l++) {
    ctx.save();
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paddingX + 4, y);
    ctx.lineTo(THERMAL_WIDTH - paddingX - 4, y);
    ctx.stroke();
    ctx.restore();
    y += 22;
  }

  // Bottom double line
  y += 2;
  ctx.fillRect(paddingX, y, THERMAL_WIDTH - paddingX * 2, 1);
  y += 3;
  ctx.fillRect(paddingX, y, THERMAL_WIDTH - paddingX * 2, 3);
  y += 16;

  const cropped = document.createElement('canvas');
  cropped.width = THERMAL_WIDTH;
  cropped.height = y;
  const cCtx = cropped.getContext('2d');
  if (cCtx) cCtx.drawImage(canvas, 0, 0, THERMAL_WIDTH, y, 0, 0, THERMAL_WIDTH, y);
  return { canvas: cropped, height: y };
}

/**
 * Render multiple tasks into a single seamless continuous 384px canvas roll!
 * Perfect for continuous thermal paper rolls / sticker tape without wasted paper feeds!
 */
export async function renderSeamlessRoll(
  tasks: NotionTask[],
  properties: CardPropertyConfig[],
  settings: PrintSettings,
  rollConfig?: RollHeaderConfig
): Promise<{ canvas: HTMLCanvasElement; height: number }> {
  if (tasks.length === 0) {
    const emptyCanvas = document.createElement('canvas');
    emptyCanvas.width = THERMAL_WIDTH;
    emptyCanvas.height = 100;
    return { canvas: emptyCanvas, height: 100 };
  }

  // 1. Render Roll Header Banner (if enabled)
  let headerChunk: { canvas: HTMLCanvasElement; height: number } | null = null;
  if (rollConfig?.enabled) {
    headerChunk = renderRollHeader(tasks, rollConfig);
  }

  // 2. Render each individual task card with roll item flag
  const renderedCards: { canvas: HTMLCanvasElement; height: number }[] = [];
  let totalCardsHeight = 0;
  const SEPARATOR_HEIGHT = 36; // Clean cut guide between tasks

  for (let i = 0; i < tasks.length; i++) {
    const card = await renderTaskCard(tasks[i], properties, settings, { isRollItem: true });
    renderedCards.push(card);
    totalCardsHeight += card.height;
    if (i < tasks.length - 1) {
      totalCardsHeight += SEPARATOR_HEIGHT;
    }
  }

  // 3. Render Roll Footer (if enabled)
  let footerChunk: { canvas: HTMLCanvasElement; height: number } | null = null;
  if (rollConfig?.enabled && rollConfig?.includeFooterNotes) {
    footerChunk = renderRollFooter();
  }

  // Compute total canvas height
  const topPad = 12;
  const bottomPad = 24;
  let totalHeight = topPad + bottomPad + totalCardsHeight;
  if (headerChunk) totalHeight += headerChunk.height + 16;
  if (footerChunk) totalHeight += footerChunk.height + 16;

  // 4. Stitch everything onto one continuous seamless canvas
  const rollCanvas = document.createElement('canvas');
  rollCanvas.width = THERMAL_WIDTH;
  rollCanvas.height = totalHeight;
  const ctx = rollCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas context');

  // Pure white paper base
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, THERMAL_WIDTH, totalHeight);

  let currentY = topPad;

  // Draw Header Banner
  if (headerChunk) {
    ctx.drawImage(headerChunk.canvas, 0, currentY);
    currentY += headerChunk.height + 16;
  }

  // Draw Cards with Cut Guides
  for (let i = 0; i < renderedCards.length; i++) {
    const card = renderedCards[i];
    ctx.drawImage(card.canvas, 0, currentY);
    currentY += card.height;

    // Draw single clean dotted cut/tear guide between cards
    if (i < renderedCards.length - 1) {
      ctx.save();
      const midY = currentY + SEPARATOR_HEIGHT / 2;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 5]); // Dotted tear line
      ctx.beginPath();
      ctx.moveTo(12, midY);
      ctx.lineTo(THERMAL_WIDTH - 12, midY);
      ctx.stroke();

      // Clean scissor tear mark in center with knockout white background
      const cutText = '✂ - - - - - - - - - - - - - - - - ✂';
      ctx.font = 'bold 11px ui-monospace, SFMono-Regular, monospace';
      ctx.textAlign = 'center';
      const cutW = ctx.measureText(cutText).width;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect((THERMAL_WIDTH - cutW) / 2 - 8, midY - 9, cutW + 16, 18);
      ctx.fillStyle = '#000000';
      ctx.fillText(cutText, THERMAL_WIDTH / 2, midY + 4);
      ctx.restore();

      currentY += SEPARATOR_HEIGHT;
    }
  }

  // Draw Footer Notes
  if (footerChunk) {
    currentY += 16;
    ctx.drawImage(footerChunk.canvas, 0, currentY);
  }

  return { canvas: rollCanvas, height: totalHeight };
}

/**
 * Convert Canvas to 1-Bit Monochrome Bitmap with Atkinson / Threshold Dithering
 */
export function canvasTo1BitBitmap(
  canvas: HTMLCanvasElement,
  mode: 'atkinson' | 'threshold' | 'floyd_steinberg' = 'atkinson',
  darknessThreshold: number = 160
): { bitmap: Uint8Array; lines: number; previewDataUrl: string; crispDataUrl: string } {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get canvas context');

  const width = canvas.width; // 384
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Grayscale buffer
  const gray = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // 1-Bit binary buffer
  const binary = new Uint8Array(width * height);

  if (mode === 'threshold') {
    for (let i = 0; i < gray.length; i++) {
      binary[i] = gray[i] < darknessThreshold ? 1 : 0;
    }
  } else if (mode === 'atkinson') {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const oldPixel = gray[idx];

        // Keep pure black text and lines completely sharp without noisy dithering halos
        if (oldPixel <= 40) {
          binary[idx] = 1;
          continue;
        }
        if (oldPixel >= 250) {
          binary[idx] = 0;
          continue;
        }

        const newPixel = oldPixel < darknessThreshold ? 0 : 255;
        binary[idx] = newPixel === 0 ? 1 : 0;
        const err = (oldPixel - newPixel) / 8;

        if (x + 1 < width) gray[idx + 1] += err;
        if (x + 2 < width) gray[idx + 2] += err;
        if (y + 1 < height) {
          if (x - 1 >= 0) gray[(y + 1) * width + (x - 1)] += err;
          gray[(y + 1) * width + x] += err;
          if (x + 1 < width) gray[(y + 1) * width + (x + 1)] += err;
        }
        if (y + 2 < height) {
          gray[(y + 2) * width + x] += err;
        }
      }
    }
  } else {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const oldPixel = gray[idx];

        if (oldPixel <= 40) {
          binary[idx] = 1;
          continue;
        }
        if (oldPixel >= 250) {
          binary[idx] = 0;
          continue;
        }

        const newPixel = oldPixel < darknessThreshold ? 0 : 255;
        binary[idx] = newPixel === 0 ? 1 : 0;
        const err = oldPixel - newPixel;

        if (x + 1 < width) gray[idx + 1] += (err * 7) / 16;
        if (y + 1 < height) {
          if (x - 1 >= 0) gray[(y + 1) * width + (x - 1)] += (err * 3) / 16;
          gray[(y + 1) * width + x] += (err * 5) / 16;
          if (x + 1 < width) gray[(y + 1) * width + (x + 1)] += (err * 1) / 16;
        }
      }
    }
  }

  // Pack into 1-bit per pixel bytes (48 bytes per line)
  const bytesPerRow = width / 8;
  const packed = new Uint8Array(bytesPerRow * height);

  const previewImgData = ctx.createImageData(width, height);
  const pData = previewImgData.data;

  for (let y = 0; y < height; y++) {
    for (let byteX = 0; byteX < bytesPerRow; byteX++) {
      let b = 0;
      for (let bit = 0; bit < 8; bit++) {
        const px = byteX * 8 + bit;
        const pixelVal = binary[y * width + px];
        if (pixelVal === 1) {
          b |= 1 << bit; // Match CatPrinter / FunPrint bit-endianness
          const pIdx = (y * width + px) * 4;
          pData[pIdx] = 10;
          pData[pIdx + 1] = 10;
          pData[pIdx + 2] = 12;
          pData[pIdx + 3] = 255;
        } else {
          const pIdx = (y * width + px) * 4;
          pData[pIdx] = 255;
          pData[pIdx + 1] = 255;
          pData[pIdx + 2] = 255;
          pData[pIdx + 3] = 255;
        }
      }
      packed[y * bytesPerRow + byteX] = b;
    }
  }

  const pCanvas = document.createElement('canvas');
  pCanvas.width = width;
  pCanvas.height = height;
  const pCtx = pCanvas.getContext('2d');
  if (pCtx) {
    pCtx.putImageData(previewImgData, 0, 0);
  }

  return {
    bitmap: packed,
    lines: height,
    previewDataUrl: pCanvas.toDataURL('image/png'),
    crispDataUrl: canvas.toDataURL('image/png'),
  };
}
