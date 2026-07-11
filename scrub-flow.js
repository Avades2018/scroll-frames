/*
 * <scrub-flow> — continuous (non-locking) scroll scrubber for the PANNING
 * animation.
 *
 * Behaviour is fixed in code (no pin/trigger/radius attributes needed):
 *   - the section scrolls past normally, never locking to the screen
 *   - the animation scrubs continuously: starts as the top edge appears at the
 *     bottom of the viewport, finishes as the bottom edge leaves the top
 *   - corners are rounded to 20px
 *
 * In Wix: give this element the display height you want (e.g. 100vh). In this
 * mode the height sets both the on-screen size and the scrub length.
 *
 * Only frame attributes are read:
 *   frame-base, frame-count, frame-pad, frame-start, frame-ext, bg
 */
class ScrubFlow extends HTMLElement {
  connectedCallback() {
    const base  = this.getAttribute("frame-base")  || "";
    const count = parseInt(this.getAttribute("frame-count") || "1", 10);
    const ext   = this.getAttribute("frame-ext")   || ".jpg";
    const pad   = parseInt(this.getAttribute("frame-pad")   || "4", 10);
    const start = parseInt(this.getAttribute("frame-start") || "0", 10);
    const bg    = this.getAttribute("bg")           || "#000";

    const RADIUS = "20px"; // corner radius for this animation
    const MARGIN = "20px"; // gap between the viewport edges and the animation

    this.style.display = "block";
    this.style.position = "relative";
    // .ss-bleed spans the full viewport width regardless of how narrow Wix
    // makes the element, then insets the visual by MARGIN on all sides.
    this.innerHTML = `
      <div class="ss-bleed" style="position:relative;width:100vw;left:50%;
           transform:translateX(-50%);height:100%;box-sizing:border-box;
           padding:${MARGIN};">
        <div class="ss-pin" style="position:relative;width:100%;height:100%;
             overflow:hidden;border-radius:${RADIUS};background:${bg};">
          <canvas class="ss-canvas" style="display:block;width:100%;height:100%;"></canvas>
          <div class="ss-loader" style="position:absolute;inset:0;display:flex;
               align-items:center;justify-content:center;background:${bg};
               color:#fff;font:500 14px/1.2 system-ui,sans-serif;">Loading… 0%</div>
        </div>
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
      // Continuous, no lock: 0% as the top edge enters the bottom of the
      // viewport, 100% as the bottom edge leaves the top of the viewport.
      let p = (vh - rect.top) / Math.max(1, host.offsetHeight + vh);
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
if (!customElements.get("scrub-flow")) customElements.define("scrub-flow", ScrubFlow);
