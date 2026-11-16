/**
 * Utility to preserve window scroll position and scrollable container positions
 * across reactive DOM updates, Firestore snapshot updates, and modal open/close transitions.
 */

interface SavedContainerScroll {
  el: HTMLElement;
  top: number;
  left: number;
}

export function captureScrollState(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const savedX = window.scrollX;
  const savedY = window.scrollY;

  const containerSnapshots: SavedContainerScroll[] = [];
  const containers = document.querySelectorAll<HTMLElement>('[data-scroll-preserve]');
  containers.forEach((el) => {
    containerSnapshots.push({
      el,
      top: el.scrollTop,
      left: el.scrollLeft
    });
  });

  const applyRestore = () => {
    const maxScrollY = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight
    );
    const targetY = Math.min(savedY, maxScrollY);

    if (Math.abs(window.scrollY - targetY) > 1 || Math.abs(window.scrollX - savedX) > 1) {
      window.scrollTo({
        left: savedX,
        top: targetY,
        behavior: 'instant' as ScrollBehavior
      });
    }

    containerSnapshots.forEach(({ el, top, left }) => {
      if (el.isConnected) {
        const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
        const clampedTop = Math.min(top, maxTop);
        if (Math.abs(el.scrollTop - clampedTop) > 1) {
          el.scrollTop = clampedTop;
        }
        if (Math.abs(el.scrollLeft - left) > 1) {
          el.scrollLeft = left;
        }
      }
    });
  };

  // Restore immediately after React commit and again on subsequent animation frames
  // in case browser focus/layout anchoring shifts scroll asynchronously.
  return () => {
    queueMicrotask(applyRestore);
    requestAnimationFrame(() => {
      applyRestore();
      requestAnimationFrame(applyRestore);
    });
  };
}

export async function runPreservingScroll<T>(fn: () => T | Promise<T>): Promise<T> {
  const restore = captureScrollState();
  try {
    const result = await fn();
    restore();
    return result;
  } catch (err) {
    restore();
    throw err;
  }
}

export function blurActiveTrigger(): void {
  if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}
