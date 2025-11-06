/* background.js
   Canvas aurora + soft blobs. Lightweight, mobile-aware, requestAnimationFrame.
   Tuned for smoothness and low CPU.
*/
(() => {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  let DPR = Math.max(1, window.devicePixelRatio || 1);
  let w = canvas.width = innerWidth * DPR;
  let h = canvas.height = innerHeight * DPR;
  canvas.style.width = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  const BLOBS = [
    { x: innerWidth * 0.18, y: innerHeight * 0.14, r: Math.max(120, innerWidth * 0.28), hue: 265, sat: 78, light: 58, dx: .12, dy: .04 },
    { x: innerWidth * 0.82, y: innerHeight * 0.36, r: Math.max(140, innerWidth * 0.32), hue: 300, sat: 70, light: 46, dx: -.08, dy: .06 },
    { x: innerWidth * 0.5, y: innerHeight * 0.78, r: Math.max(160, innerWidth * 0.44), hue: 220, sat: 62, light: 44, dx: .05, dy: -.05 }
  ];

  let t = 0;
  function draw() {
    t += 0.006;
    // base
    const g = ctx.createLinearGradient(0, 0, innerWidth, innerHeight);
    g.addColorStop(0, 'rgba(8,2,20,0.75)');
    g.addColorStop(0.5, 'rgba(12,0,34,0.7)');
    g.addColorStop(1, 'rgba(6,2,20,0.85)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, innerWidth, innerHeight);

    ctx.globalCompositeOperation = 'lighter';
    BLOBS.forEach((b, i) => {
      b.x += Math.cos(t * (i + 1) * 0.7) * b.dx * 4;
      b.y += Math.sin(t * (i + 1) * 0.9) * b.dy * 4;
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

    ctx.globalCompositeOperation = 'source-over';
    const vig = ctx.createRadialGradient(innerWidth/2, innerHeight/2, Math.min(innerWidth,innerHeight)/3, innerWidth/2, innerHeight/2, Math.max(innerWidth,innerHeight)/1.1);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(5,2,10,0.45)');
    ctx.fillStyle = vig;
    ctx.fillRect(0,0, innerWidth, innerHeight);

    requestAnimationFrame(draw);
  }

  function onResize() {
    DPR = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = innerWidth * DPR;
    canvas.height = innerHeight * DPR;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    BLOBS[0].x = innerWidth * 0.18; BLOBS[0].y = innerHeight * 0.14; BLOBS[0].r = Math.max(120, innerWidth * 0.28);
    BLOBS[1].x = innerWidth * 0.82; BLOBS[1].y = innerHeight * 0.36; BLOBS[1].r = Math.max(140, innerWidth * 0.32);
    BLOBS[2].x = innerWidth * 0.52; BLOBS[2].y = innerHeight * 0.78; BLOBS[2].r = Math.max(160, innerWidth * 0.44);
  }

  window.addEventListener('resize', onResize, { passive:true });
  draw();
})();
