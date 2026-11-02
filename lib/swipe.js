// Swipe / drag hook — works for mouse (PC, drag) and touch (mobile).
// Emits directional 'swipe' events: up/down/left/right when threshold exceeded,
// and 'drag' events during the drag with delta.

window.useSwipe = function useSwipe(ref, { onSwipe, onDrag, onEnd, threshold = 40, enabled = true } = {}) {
  React.useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    let start = null;
    let last = null;
    let dragging = false;

    function point(e) {
      if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }

    function down(e) {
      start = point(e);
      last = start;
      dragging = true;
      if (e.cancelable) e.preventDefault();
    }
    function move(e) {
      if (!dragging || !start) return;
      last = point(e);
      const dx = last.x - start.x;
      const dy = last.y - start.y;
      onDrag && onDrag({ dx, dy });
      if (e.cancelable) e.preventDefault();
    }
    function up(e) {
      if (!dragging || !start) return;
      dragging = false;
      const p = last || start;
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      const adx = Math.abs(dx), ady = Math.abs(dy);
      let dir = null;
      if (Math.max(adx, ady) > threshold) {
        if (adx > ady) dir = dx > 0 ? 'right' : 'left';
        else dir = dy > 0 ? 'down' : 'up';
      }
      onEnd && onEnd({ dx, dy, dir });
      if (dir) onSwipe && onSwipe(dir, { dx, dy });
      start = null;
      last = null;
    }

    el.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', up);
    el.addEventListener('touchcancel', up);

    return () => {
      el.removeEventListener('mousedown', down);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      el.removeEventListener('touchstart', down);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', up);
      el.removeEventListener('touchcancel', up);
    };
  }, [enabled]);
};

// Force React re-render helper (subscribe to store)
window.useStore = function useStore() {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    return window.DentiBellStore.subscribe(() => setTick(t => t + 1));
  }, []);
  return window.DentiBellStore.getState();
};
