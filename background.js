/* background.js — canvas aurora (optimized) */
(() => {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  let DPR = Math.max(1, window.devicePixelRatio || 1);
  function resize(){ canvas.width = innerWidth * DPR; canvas.height = innerHeight * DPR; canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px'; ctx.setTransform(DPR,0,0,DPR,0,0); }
  window.addEventListener('resize', () => { DPR = Math.max(1, window.devicePixelRatio || 1); resize(); }, { passive:true });
  resize();

  const blobs = [
    { x: innerWidth*0.15, y: innerHeight*0.2, r: Math.max(120, innerWidth*0.28), h:260, s:78, l:58, dx:.06, dy:.02 },
    { x: innerWidth*0.82, y: innerHeight*0.36, r: Math.max(140, innerWidth*0.32), h:300, s:70, l:46, dx:-.05, dy:.04 },
    { x: innerWidth*0.5, y: innerHeight*0.78, r: Math.max(160, innerWidth*0.44), h:220, s:62, l:44, dx:.03, dy:-.03 }
  ];
  let t = 0;
  function draw(){
    t += 0.006;
    // base gradient
    const g = ctx.createLinearGradient(0,0,innerWidth,innerHeight);
    g.addColorStop(0,'rgba(8,2,20,0.75)'); g.addColorStop(0.5,'rgba(12,0,34,0.7)'); g.addColorStop(1,'rgba(6,2,20,0.85)');
    ctx.fillStyle = g; ctx.fillRect(0,0,innerWidth,innerHeight);

    ctx.globalCompositeOperation = 'lighter';
    blobs.forEach((b,i)=>{
      b.x += Math.cos(t*(i+1)*0.7)*b.dx*4;
      b.y += Math.sin(t*(i+1)*0.9)*b.dy*4;
      const grd = ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);
      const hs = `hsl(${b.h} ${b.s}% ${b.l}% /`;
      grd.addColorStop(0, `${hs} 0.56)`); grd.addColorStop(0.25, `${hs} 0.28)`); grd.addColorStop(0.6, `${hs} 0.06)`); grd.addColorStop(1, `${hs} 0.0)`);
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    // vignette
    const vig = ctx.createRadialGradient(innerWidth/2,innerHeight/2,Math.min(innerWidth,innerHeight)/3,innerWidth/2,innerHeight/2,Math.max(innerWidth,innerHeight)/1.1);
    vig.addColorStop(0,'rgba(0,0,0,0)'); vig.addColorStop(1,'rgba(5,2,10,0.45)');
    ctx.fillStyle = vig; ctx.fillRect(0,0,innerWidth,innerHeight);

    requestAnimationFrame(draw);
  }
  draw();
})();
