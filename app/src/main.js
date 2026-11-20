// Wires the page: add photos, pick a multi-panel layout, crop and
// position each panel, write the caption, and export the cover as a PNG
// in 1080 x 1080, 1080 x 1350 or 1920 x 1080. A `?shot=` query sets up
// a fixed scene for a screenshot instead (./shots.js).
import { drawCover, LAYOUTS, panelCount } from './cover.js';
import { runShot } from './shots.js';

const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const kickerInput = document.getElementById('kicker');
const status = document.getElementById('status');
const overlay = document.getElementById('panelOverlay');
const thumbs = document.getElementById('thumbs');
const panelBtns = document.getElementById('panelBtns');
const panelPhoto = document.getElementById('panelPhoto');
const zoomInput = document.getElementById('zoom');
const posXInput = document.getElementById('posX');
const posYInput = document.getElementById('posY');
const gradeInput = document.getElementById('grade');

const state = {
  layout: 'trio',
  size: '1920x1080',
  caption: 'Sunset Heist',
  kicker: 'Neon Sunset • Est. 2026',
  grade: 0.8,
  photos: [],
  panels: [
    { photo: 0, zoom: 1, dx: 0, dy: 0 },
    { photo: 1, zoom: 1, dx: 0, dy: 0 },
    { photo: 2, zoom: 1, dx: 0, dy: 0 },
  ],
  selected: 0,
};

const fontReady = (async () => {
  try {
    await document.fonts.load('100px Anton');
    await document.fonts.ready;
  } catch {
    // The caption falls back to a narrow sans if the font misses.
  }
})();

function currentPanels() {
  return state.panels.slice(0, panelCount(state.layout));
}

function applySize() {
  const [w, h] = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

async function redraw() {
  await fontReady;
  applySize();
  drawCover(canvas, state);
  placeOverlay();
}

function placeOverlay() {
  const rects = LAYOUTS[state.layout](canvas.width, canvas.height,
    Math.max(4, Math.round(canvas.width * 0.006)));
  const r = rects[state.selected];
  if (!r) {
    overlay.hidden = true;
    return;
  }
  overlay.hidden = false;
  overlay.style.left = `${(r.x / canvas.width) * 100}%`;
  overlay.style.top = `${(r.y / canvas.height) * 100}%`;
  overlay.style.width = `${(r.w / canvas.width) * 100}%`;
  overlay.style.height = `${(r.h / canvas.height) * 100}%`;
}

function refreshPanelButtons() {
  panelBtns.textContent = '';
  currentPanels().forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = `Panel ${i + 1}`;
    b.setAttribute('aria-pressed', String(i === state.selected));
    b.addEventListener('click', () => {
      state.selected = i;
      refreshPanelControls();
      redraw();
    });
    panelBtns.appendChild(b);
  });
}

function refreshPanelControls() {
  const setting = state.panels[state.selected];
  panelPhoto.textContent = '';
  state.photos.forEach((_, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = `Photo ${i + 1}`;
    panelPhoto.appendChild(o);
  });
  if (state.photos.length === 0) {
    const o = document.createElement('option');
    o.value = '0';
    o.textContent = 'No photo yet';
    panelPhoto.appendChild(o);
  }
  panelPhoto.value = String(setting.photo);
  zoomInput.value = String(setting.zoom);
  posXInput.value = String(setting.dx);
  posYInput.value = String(setting.dy);
  refreshPanelButtons();
}

function refreshThumbs() {
  thumbs.textContent = '';
  state.photos.forEach((img, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.title = `Use photo ${i + 1} in the selected panel`;
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = `Photo ${i + 1}`;
    b.appendChild(thumb);
    b.addEventListener('click', () => {
      state.panels[state.selected].photo = i;
      refreshPanelControls();
      redraw();
    });
    thumbs.appendChild(b);
  });
}

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function addPhotos(files) {
  for (const file of files) {
    if (state.photos.length >= 3) break;
    if (!file.type.startsWith('image/')) continue;
    const img = await loadImage(URL.createObjectURL(file));
    state.photos.push(img);
  }
  refreshThumbs();
  refreshPanelControls();
  await redraw();
}

async function loadSample(name) {
  if (state.photos.length >= 3) return;
  const img = await loadImage(`samples/${name}.jpg`);
  state.photos.push(img);
  refreshThumbs();
  refreshPanelControls();
}

document.getElementById('photo').addEventListener('change', (e) => {
  addPhotos([...e.target.files]);
});
document.querySelectorAll('[data-sample]').forEach((b) => {
  b.addEventListener('click', async () => {
    await loadSample(b.dataset.sample);
    await redraw();
  });
});
document.querySelectorAll('[data-layout]').forEach((b) => {
  b.addEventListener('click', () => {
    state.layout = b.dataset.layout;
    state.selected = 0;
    document.querySelectorAll('[data-layout]').forEach((x) => {
      x.setAttribute('aria-pressed', String(x === b));
    });
    refreshPanelControls();
    redraw();
  });
});
document.querySelectorAll('[data-size]').forEach((b) => {
  b.addEventListener('click', () => {
    state.size = b.dataset.size;
    document.querySelectorAll('[data-size]').forEach((x) => {
      x.setAttribute('aria-pressed', String(x === b));
    });
    redraw();
  });
});
panelPhoto.addEventListener('change', () => {
  state.panels[state.selected].photo = Number(panelPhoto.value);
  redraw();
});
zoomInput.addEventListener('input', () => {
  state.panels[state.selected].zoom = Number(zoomInput.value);
  redraw();
});
posXInput.addEventListener('input', () => {
  state.panels[state.selected].dx = Number(posXInput.value);
  redraw();
});
posYInput.addEventListener('input', () => {
  state.panels[state.selected].dy = Number(posYInput.value);
  redraw();
});
gradeInput.addEventListener('input', () => {
  state.grade = Number(gradeInput.value) / 100;
  redraw();
});
captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  redraw();
});
kickerInput.addEventListener('input', () => {
  state.kicker = kickerInput.value;
  redraw();
});
canvas.addEventListener('click', (e) => {
  const box = canvas.getBoundingClientRect();
  const x = ((e.clientX - box.left) / box.width) * canvas.width;
  const y = ((e.clientY - box.top) / box.height) * canvas.height;
  const rects = LAYOUTS[state.layout](canvas.width, canvas.height,
    Math.max(4, Math.round(canvas.width * 0.006)));
  const hit = rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  if (hit >= 0) {
    state.selected = hit;
    refreshPanelControls();
    redraw();
  }
});
document.getElementById('export').addEventListener('click', () => {
  canvas.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-cover-${state.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved neon-cover-${state.size}.png`;
  }, 'image/png');
});

async function applyScene(scene) {
  state.layout = ['trio', 'duo', 'solo'].includes(scene.layout) ? scene.layout : 'trio';
  state.size = SIZES[scene.size] ? scene.size : '1920x1080';
  state.caption = scene.caption;
  state.kicker = scene.kicker;
  captionInput.value = scene.caption;
  kickerInput.value = scene.kicker;
  document.querySelectorAll('[data-layout]').forEach((x) => {
    x.setAttribute('aria-pressed', String(x.dataset.layout === state.layout));
  });
  document.querySelectorAll('[data-size]').forEach((x) => {
    x.setAttribute('aria-pressed', String(x.dataset.size === state.size));
  });
  await loadSample(scene.photo);
  if (scene.photo2) await loadSample(scene.photo2);
  refreshPanelControls();
  await redraw();
}

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), applyScene);
} else {
  refreshPanelControls();
  redraw();
}
