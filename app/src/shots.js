// Fixed scenes for screenshots: ?shot=editor shows the page with sample
// photos loaded; ?shot=cover shows the cover alone at the chosen size.
// `layout`, `size`, `photo`, `photo2`, `caption` and `kicker` come from
// the query. window.__shotReady is set once the cover is painted.
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await load({
    photo: query.get('photo') ?? 'pier',
    photo2: query.get('photo2') ?? '',
    caption: query.get('caption') ?? 'Sunset Heist',
    kicker: query.get('kicker') ?? 'Neon Sunset • Est. 2026',
    layout: query.get('layout') ?? 'trio',
    size: query.get('size') ?? '1920x1080',
  });
  try {
    await document.fonts.load('100px Anton');
    await document.fonts.ready;
  } catch {
    // The caption falls back to a narrow sans if the font misses.
  }
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
