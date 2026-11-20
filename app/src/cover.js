// Neon Cover Studio renderer: draws multi-panel neon-sunset cover art.
// Each panel holds a photo with its own crop and position; a sunset grade,
// a halftone shade and bold Anton lettering tie the panels into one poster.

// Panel rectangles for each layout, in canvas pixels. g is the gutter.
export const LAYOUTS = {
  trio(w, h, g) {
    const split = Math.round(w * 0.58);
    const mid = Math.round(h * 0.5);
    return [
      { x: g, y: g, w: split - g * 2, h: h - g * 2 },
      { x: split + g, y: g, w: w - split - g * 2, h: mid - g * 2 },
      { x: split + g, y: mid + g, w: w - split - g * 2, h: h - mid - g * 2 },
    ];
  },
  duo(w, h, g) {
    const split = Math.round(w * 0.62);
    return [
      { x: g, y: g, w: split - g * 2, h: h - g * 2 },
      { x: split + g, y: g, w: w - split - g * 2, h: h - g * 2 },
    ];
  },
  solo(w, h, g) {
    return [{ x: g, y: g, w: w - g * 2, h: h - g * 2 }];
  },
};

export function panelCount(layout) {
  return layout === 'trio' ? 3 : layout === 'duo' ? 2 : 1;
}

// Cover-fit source rectangle for one panel: the photo fills the panel,
// zoomed around its centre and shifted by dx/dy in [-1, 1].
function sourceRect(img, pw, ph, zoom, dx, dy) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const base = Math.max(pw / iw, ph / ih);
  const sw = Math.min(pw / base / zoom, iw);
  const sh = Math.min(ph / base / zoom, ih);
  const maxX = (iw - sw) / 2;
  const maxY = (ih - sh) / 2;
  const sx = Math.min(Math.max(iw / 2 - sw / 2 + dx * maxX, 0), iw - sw);
  const sy = Math.min(Math.max(ih / 2 - sh / 2 + dy * maxY, 0), ih - sh);
  return { sx, sy, sw, sh };
}

let dotPattern = null;

function halftone(ctx) {
  if (dotPattern) return dotPattern;
  const tile = document.createElement('canvas');
  tile.width = 12;
  tile.height = 12;
  const t = tile.getContext('2d');
  t.fillStyle = 'rgba(0,0,0,0.6)';
  t.beginPath();
  t.arc(6, 6, 2.1, 0, Math.PI * 2);
  t.fill();
  dotPattern = ctx.createPattern(tile, 'repeat');
  return dotPattern;
}

// Sunset grade over one panel: warm wash rising from the foot, cool teal
// at the top, halftone shade low down, and a dark vignette at the edges.
function gradePanel(ctx, r, grade) {
  const wash = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  wash.addColorStop(0, 'rgba(255, 190, 90, 0)');
  wash.addColorStop(0.55, `rgba(255, 110, 60, ${(0.1 * grade).toFixed(3)})`);
  wash.addColorStop(1, `rgba(190, 30, 110, ${(0.34 * grade).toFixed(3)})`);
  ctx.fillStyle = wash;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  const cool = ctx.createLinearGradient(0, r.y, 0, r.y + r.h * 0.4);
  cool.addColorStop(0, `rgba(20, 110, 140, ${(0.14 * grade).toFixed(3)})`);
  cool.addColorStop(1, 'rgba(20, 110, 140, 0)');
  ctx.fillStyle = cool;
  ctx.fillRect(r.x, r.y, r.w, r.h * 0.4);
  ctx.save();
  ctx.globalAlpha = 0.16 * grade;
  ctx.fillStyle = halftone(ctx);
  ctx.fillRect(r.x, r.y + r.h * 0.66, r.w, r.h * 0.34);
  ctx.restore();
  const v = ctx.createRadialGradient(
    r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.35,
    r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h) * 0.75,
  );
  v.addColorStop(0, 'rgba(8,4,18,0)');
  v.addColorStop(1, `rgba(8,4,18,${(0.32 * grade).toFixed(3)})`);
  ctx.fillStyle = v;
  ctx.fillRect(r.x, r.y, r.w, r.h);
}

// Caption band across the foot: slanted neon accent bar, small kicker,
// then the big caption in Anton with a dark outline and soft shadow.
function drawCaption(ctx, w, h, caption, kicker) {
  const bandH = Math.max(120, Math.round(h * 0.26));
  const by = h - bandH;
  const band = ctx.createLinearGradient(0, by - 40, 0, h);
  band.addColorStop(0, 'rgba(8,4,16,0)');
  band.addColorStop(0.35, 'rgba(8,4,16,0.82)');
  band.addColorStop(1, 'rgba(8,4,16,0.94)');
  ctx.fillStyle = band;
  ctx.fillRect(0, by - 40, w, h - by + 40);
  const barY = by + 14;
  const barH = Math.max(8, Math.round(h * 0.012));
  const bar = ctx.createLinearGradient(0, 0, w, 0);
  bar.addColorStop(0, '#ff2e88');
  bar.addColorStop(0.55, '#ff7a18');
  bar.addColorStop(1, '#ffc247');
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, barY + barH);
  ctx.lineTo(w, barY);
  ctx.lineTo(w, barY + barH);
  ctx.lineTo(0, barY + barH * 2);
  ctx.closePath();
  ctx.fillStyle = bar;
  ctx.fill();
  ctx.restore();
  const kick = (kicker || '').trim().toUpperCase();
  if (kick) {
    const kickSize = Math.max(16, Math.round(h * 0.026));
    ctx.font = `${kickSize}px Anton, 'Arial Narrow', sans-serif`;
    ctx.letterSpacing = `${Math.round(kickSize * 0.22)}px`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffb347';
    ctx.fillText(kick, Math.round(w * 0.045), barY + barH + kickSize + 16);
    ctx.letterSpacing = '0px';
  }
  const text = (caption || '').trim().toUpperCase();
  if (!text) return;
  let size = Math.round(h * 0.115);
  ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  while (size > 20 && ctx.measureText(text).width > w * 0.92) {
    size -= 4;
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.save();
  ctx.translate(w / 2, 0);
  ctx.rotate(-0.02);
  ctx.translate(-w / 2, 0);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160720';
  ctx.lineWidth = Math.max(3, size * 0.07);
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = size * 0.14;
  ctx.shadowOffsetY = size * 0.03;
  const ty = h - Math.round(bandH * 0.16);
  ctx.strokeText(text, w / 2, ty);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, w / 2, ty);
  ctx.restore();
}

// Draws the whole cover. state: { layout, caption, kicker, grade,
// photos: [image|null], panels: [{ photo, zoom, dx, dy }] }.
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const g = Math.max(4, Math.round(w * 0.006));
  ctx.fillStyle = '#f7f2ea';
  ctx.fillRect(0, 0, w, h);
  const rects = LAYOUTS[state.layout](w, h, g);
  rects.forEach((r, i) => {
    const setting = state.panels[i] || { photo: 0, zoom: 1, dx: 0, dy: 0 };
    const img = state.photos[setting.photo] || state.photos[0] || null;
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    if (img) {
      const s = sourceRect(img, r.w, r.h, setting.zoom, setting.dx, setting.dy);
      ctx.drawImage(img, s.sx, s.sy, s.sw, s.sh, r.x, r.y, r.w, r.h);
    } else {
      const ph = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
      ph.addColorStop(0, '#3b1d4e');
      ph.addColorStop(0.6, '#a83a6e');
      ph.addColorStop(1, '#ff7a18');
      ctx.fillStyle = ph;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    gradePanel(ctx, r, state.grade);
    ctx.restore();
    ctx.strokeStyle = 'rgba(20,8,28,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  });
  drawCaption(ctx, w, h, state.caption, state.kicker);
}
