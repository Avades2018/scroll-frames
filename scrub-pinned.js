/*
 * <scrub-pinned> — pinned scroll scrubber for the FIRST animation.
 *
 * Behaviour is fixed in code (no pin/trigger/radius attributes needed):
 *   - starts scrubbing the moment the section appears at the bottom of screen
 *   - stays pinned on screen while it plays
 *   - finishes exactly as it releases from the top, then holds the last frame
 *
 * In Wix: give this element a TALL height (~300vh) — that is the scroll runway.
 *
 * Only frame attributes are read (these already work fine):
 *   frame-base, frame-count, frame-pad, frame-start, frame-ext, bg
 */
class ScrubPinned extends HTMLElement {
  connectedCallback() {
    const base  = this.getAttribute("frame-base")  || "";
    const count = parseInt(this.getAttribute("frame-count") || "1", 10);
    const ext   = this.getAttribute("frame-ext")   || ".jpg";
    const pad   = parseInt(this.getAttribute("frame-pad")   || "4", 10);
    const start = parseInt(this.getAttribute("frame-start") || "0", 10);
    const bg    = this.getAttribute("bg")           || "#000";

    this.style.display = "block";
    this.style.position = "relative";
    this.innerHTML = `
      <div class="ss-pin" style="position:sticky;top:0;height:100vh;
           overflow:hidden;background:${bg};">
        <canvas class="ss-canvas" style="display:block;width:100%;height:100%;"></canvas>
        <div class="ss-loader" style="position:absolute;inset:0;display:flex;
             align-items:center;justify-content:center;background:${bg};
             color:#fff;font:500 14px/1.2 system-ui,sans-serif;">Loading… 0%</div>
      </div>`;

    const host   = this;
    const canvas = this.querySelector(".ss-canvas");
    const loader = this.querySelector(".ss-loader");
    const ctx    = canvas.getContext("2d");

    const images = new Array(count);
    let loaded = 0, ready = false, current = -1;
    const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
    const url = (i) => base + String(start + i).padStart(pad, "0") + ext;

    function resize() {
      const r = canvas.getBoundingClientRect();
      canvas.width  = Math.max(1, Math.round(r.width  * dpr()));
      canvas.height = Math.max(1, Math.round(r.height * dpr()));
      if (ready) { current = -1; draw(frameForScroll()); }
    }

    function draw(i) {
      const img = images[i];
      if (!img || !img.complete || !img.naturalWidth || i === current) return;
      current = i;
      const cw = canvas.width, ch = canvas.height;
      ctx.clearRect(0, 0, cw, ch);
      const ir = img.naturalWidth / img.naturalHeight, cr = cw / ch;
      let dw, dh, dx, dy;
      if (cr > ir) { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
      else         { dh = ch; dw = ch * ir; dy = 0; dx = (cw - dw) / 2; }
      ctx.drawImage(img, dx, dy, dw, dh);
    }

    function frameForScroll() {
      const rect = host.getBoundingClientRect();
      const vh   = window.innerHeight;
      // Pinned, start-on-entry: 0% as the top edge enters the bottom of the
      // viewport, 100% exactly as the section releases from the top.
      let p = (vh - rect.top) / Math.max(1, host.offsetHeight);
      p = Math.max(0, Math.min(1, p));
      return Math.round(p * (count - 1));
    }

    let ticking = false;
    function onScroll() {
      if (!ready || ticking) return;
      ticking = true;
      requestAnimationFrame(() => { draw(frameForScroll()); ticking = false; });
    }

    for (let i = 0; i < count; i++) {
      const img = new Image();
      const done = () => {
        loaded++;
        loader.textContent = "Loading… " + Math.round((loaded / count) * 100) + "%";
        if (loaded === count) { ready = true; loader.style.display = "none"; resize(); draw(frameForScroll()); }
      };
      img.onload = done; img.onerror = done; img.src = url(i); images[i] = img;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", resize);
  }
}
if (!customElements.get("scrub-pinned")) customElements.define("scrub-pinned", ScrubPinned);
