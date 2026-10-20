// Load each map when its panel opens, so Leaflet receives a visible container.
for (const frame of document.querySelectorAll('iframe[data-src]')) {
  frame.closest('details').addEventListener('toggle', () => {
    if (frame.closest('details').open && !frame.hasAttribute('src')) {
      frame.src = frame.dataset.src;
    }
  });
}
