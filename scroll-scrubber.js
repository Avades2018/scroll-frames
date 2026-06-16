/*
 * <scroll-scrubber> — a Wix Studio custom element that scrubs through an
 * image sequence based on scroll position (the "Apple product page" effect).
 *
 * It preloads every frame, draws the current one onto a <canvas>, and maps
 * the page's scroll position over this element to a frame index. The canvas
 * stays pinned (sticky) while the element's tall body scrolls past it.
 *
 * ATTRIBUTES (set these in the Wix custom-element panel):
 *   frame-base   Everything in the frame URL BEFORE the number.
 *                e.g. "https://cdn.example.com/frames/frame_"
 *   frame-count  Total number of frames.            (default 206)
 *   frame-ext    File extension incl. the dot.       (default ".jpg")
 *   frame-pad    Zero-padding width of the number.   (default 4  -> 0001)
 *   frame-start  Number of the first frame.          (default 1)
 *   bg           Background colour behind the canvas (default "#000")
 *
 * SETUP: give this element a tall height in the Wix editor (e.g. 300vh).
 * Taller = slower, more granular scrub. The first 100vh of that height is
 * the visible pinned area; the rest is the scroll runway.
 */
class ScrollScrubber extends HTMLElement {
  connectedCallback() {
    const base   = this.getAttribute("frame-base")  || "";
    const count  = parseInt(this.getAttribute("frame-count") || "206", 10);
    const ext    = this.getAttribute("frame-ext")   || ".jpg";
    const pad    = parseInt(this.getAttribute("frame-pad")   || "4", 10);
    const start  = parseInt(this.getAttribute("frame-start") || "1", 10);
    const bg     = this.getAttribute("bg")          || "#000";
    // trigger: "pin" (default) starts the scrub when the section reaches the
    // top of the screen; "enter" starts it the moment the section becomes
    // visible at the bottom of the screen.
    const trigger = (this.getAttribute("trigger") || "pin").toLowerCase();

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
      // cover-fit: fill the canvas, preserve aspect ratio, centre-crop
      const ir = img.naturalWidth / img.naturalHeight;
      const cr = cw / ch;
      let dw, dh, dx, dy;
      if (cr > ir) { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
      else         { dh = ch; dw = ch * ir; dy = 0; dx = (cw - dw) / 2; }
      ctx.drawImage(img, dx, dy, dw, dh);
    }

    function frameForScroll() {
      const rect = host.getBoundingClientRect();
      const vh   = window.innerHeight;
      let p;
      if (trigger === "enter") {
        // 0% the instant the top edge enters the bottom of the viewport,
        // 100% when the section finishes (its bottom reaches viewport bottom)
        p = (vh - rect.top) / Math.max(1, host.offsetHeight);
      } else {
        // "pin": 0% when the section's top hits the top of the viewport
        p = (-rect.top) / Math.max(1, host.offsetHeight - vh);
      }
      p = Math.max(0, Math.min(1, p));
      return Math.round(p * (count - 1));
    }

    let ticking = false;
    function onScroll() {
      if (!ready || ticking) return;
      ticking = true;
      requestAnimationFrame(() => { draw(frameForScroll()); ticking = false; });
    }

    // preload every frame, then reveal
    for (let i = 0; i < count; i++) {
      const img = new Image();
      const done = () => {
        loaded++;
        loader.textContent = "Loading… " + Math.round((loaded / count) * 100) + "%";
        if (loaded === count) {
          ready = true;
          loader.style.display = "none";
          resize();
          draw(frameForScroll());
        }
      };
      img.onload = done;
      img.onerror = done; // don't let one missing frame stall everything
      img.src = url(i);
      images[i] = img;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", resize);
  }
}

// Guard so the script is safe to load more than once on the same page
// (you have two <scroll-scrubber> elements sharing this file).
if (!customElements.get("scroll-scrubber")) {
  customElements.define("scroll-scrubber", ScrollScrubber);
}
