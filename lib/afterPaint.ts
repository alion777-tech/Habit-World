/** Give immediate feedback a paint opportunity before synchronous calculations. */
export function afterPaint(): Promise<void> {
  return new Promise(resolve => {
    let frame: number | undefined;
    let task: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      clearTimeout(fallback);
      if (task !== undefined) clearTimeout(task);
      if (frame !== undefined) cancelAnimationFrame(frame);
      resolve();
    };
    // Hidden tabs may stop animation frames; saving must still proceed.
    const fallback = setTimeout(finish, 100);
    if (typeof requestAnimationFrame === "function") {
      frame = requestAnimationFrame(() => { task = setTimeout(finish, 0); });
    } else { task = setTimeout(finish, 0); }
  });
}
