/* background.js
   Canvas aurora + soft blobs. Lightweight, mobile-aware, requestAnimationFrame.
   No external libs. Tuned for smoothness and low CPU.
*/
(() => {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  let w = canvas.width = innerWidth;
  let h = canvas.height = innerHeight;
  const DPR = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = w * DPR;
  canvas.height = h * DPR;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.scale(DPR, DPR);

  // blobs config
  const BLOBS = [
    { x: w * 0.2, y: h * 0.15, r: Math.max(120, w * 0.28), hue: 265, sat: 80, light: 55, speed: 0.02, dx: .1, dy: .03 },
    { x: w * 0.8, y: h * 0.35, r: Math.max(160, w * 0.34), hue: 300, sat: 75, light: 45, speed: 0.015, dx: -.07, dy: .06 },
    { x: w * 0.5, y: h * 0.8, r: Math.max(180, w * 0.45), hue: 220, sat: 60, light: 40, speed: 0.01, dx: .05, dy: -.05 }
  ];

  let t = 0;
  function draw() {
    t += 0.005;
    // subtle base gradient
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, 'rgba(8,2,20,0.75)');
    g.addColorStop(0.5, 'rgba(12,0,34,0.7)');
    g.addColorStop(1, 'rgba(6,2,20,0.85)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // additive blending for aurora blobs
    ctx.globalCompositeOperation = 'lighter';
    BLOBS.forEach((b, i) => {
      // animate positions with slow sin/cos
      b.x += Math.cos(t * (i + 1) * 0.7) * b.dx;
      b.y += Math.sin(t * (i + 1) * 0.9) * b.dy;
      const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      const hs = `hsl(${b.hue} ${b.sat}% ${b.light}% /`;
      grd.addColorStop(0, `${hs} 0.55)`);
      grd.addColorStop(0.25, `${hs} 0.28)`);
      grd.addColorStop(0.6, `${hs} 0.06)`);
      grd.addColorStop(1, `${hs} 0.0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // soft vignette
    ctx.globalCompositeOperation = 'source-over';
    const vig = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)/3, w/2, h/2, Math.max(w,h)/1.1);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(5,2,10,0.45)');
    ctx.fillStyle = vig;
    ctx.fillRect(0,0,w,h);

    requestAnimationFrame(draw);
  }

  // resize handling
  function onResize() {
    w = canvas.width = innerWidth * DPR;
    h = canvas.height = innerHeight * DPR;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // re-center blobs
    BLOBS[0].x = innerWidth * 0.18; BLOBS[0].y = innerHeight * 0.14; BLOBS[0].r = Math.max(120, innerWidth * 0.28);
    BLOBS[1].x = innerWidth * 0.82; BLOBS[1].y = innerHeight * 0.36; BLOBS[1].r = Math.max(160, innerWidth * 0.34);
    BLOBS[2].x = innerWidth * 0.52; BLOBS[2].y = innerHeight * 0.78; BLOBS[2].r = Math.max(160, innerWidth * 0.45);
  }

  window.addEventListener('resize', onResize, { passive:true });
  draw();
})();
