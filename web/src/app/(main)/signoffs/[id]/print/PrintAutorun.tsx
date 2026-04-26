"use client";

import { useEffect } from "react";

/**
 * When `?auto=1` is on the URL we trigger the browser print dialog as soon
 * as the report content has rendered. The export-button flow opens this
 * page in a new tab with the auto flag set so the operator gets the
 * print-to-PDF dialog without an extra click.
 */
export function PrintAutorun() {
  useEffect(() => {
    let cancelled = false;
    // Small delay to let the markdown content stream + lay out before print.
    const t = setTimeout(() => {
      if (!cancelled) window.print();
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);
  return null;
}
