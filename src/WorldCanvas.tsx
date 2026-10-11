import { useEffect, useRef, useState } from 'react';
import { PLACES, type World } from './simulation';

function draw(ctx: CanvasRenderingContext2D, world: World, selected: number, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#c8edf1'; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.scale(w / 100, h / 100);
  const polygon = (points: number[][], color: string) => {
    ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  };
  polygon([[7, 54], [16, 25], [38, 14], [64, 17], [87, 31], [94, 60], [77, 83], [45, 90], [19, 78]], '#82c7d0');
  polygon([[7, 50], [16, 21], [38, 10], [64, 13], [87, 27], [94, 56], [77, 79], [45, 86], [19, 74]], '#e9ebc2');
  polygon([[12, 49], [21, 25], [39, 15], [63, 18], [83, 30], [88, 55], [74, 74], [45, 81], [23, 69]], '#acd28d');
  ctx.strokeStyle = '#e8e9d8'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(27, 34); ctx.lineTo(54, 53); ctx.lineTo(77, 37); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(54, 53); ctx.lineTo(64, 70); ctx.stroke();
  for (const [x, y] of [[20, 28], [27, 22], [35, 29], [18, 39], [29, 43], [38, 38], [35, 17]]) {
    ctx.fillStyle = '#607b60'; ctx.fillRect(x - .5, y, 1, 5);
    polygon([[x - 4, y + 1], [x, y - 8], [x + 4, y + 1]], '#357d66');
    polygon([[x - 3, y - 2], [x, y - 10], [x + 3, y - 2]], '#499b72');
  }
  for (const [x, y, color] of [[70, 28, '#d26d79'], [81, 35, '#747fbe'], [72, 46, '#d59e3a']] as const) {
    ctx.fillStyle = '#f8faf4'; ctx.fillRect(x - 3, y - 1, 6, 6);
    polygon([[x - 4, y], [x, y - 6], [x + 4, y]], color);
    ctx.fillStyle = '#56736d'; ctx.fillRect(x - .7, y + 2, 1.4, 3);
  }
  ctx.fillStyle = '#fcf9ea'; ctx.beginPath(); ctx.ellipse(54, 53, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#578e8b'; ctx.fillRect(50, 48, 8, 4);
  ctx.fillStyle = '#e7bd53'; ctx.fillRect(52, 49, 4, 2);
  polygon([[60, 69], [65, 62], [70, 69]], '#db798c');
  ctx.fillStyle = '#f6f3ed'; ctx.fillRect(61, 69, 8, 5);
  for (let i = 0; i < 25; i++) {
    ctx.fillStyle = i % 2 ? '#f6f8e1' : '#e5a8b9';
    ctx.fillRect(25 + (i * 17 % 53), 57 + (i * 7 % 16), .8, .8);
  }
  for (const agent of [...world.agents].sort((a, b) => a.y - b.y)) {
    const x = agent.x + (agent.id % 3 - 1) * 1.6, y = agent.y + Math.floor(agent.id / 3) * 1.2;
    if (agent.id === selected) { ctx.strokeStyle = '#183d3b'; ctx.lineWidth = .4; ctx.beginPath(); ctx.ellipse(x, y + 2, 2.1, .8, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = ['#396d9c', '#cb657c', '#c5952f', '#735b99'][agent.id % 4]; ctx.fillRect(x - .8, y, 1.6, 1.8);
    ctx.fillStyle = '#f5dec6'; ctx.fillRect(x - .7, y - 1.2, 1.4, 1.3);
    ctx.fillStyle = '#273d42'; ctx.fillRect(x - .7, y - 1.6, 1.4, .5);
    if (agent.cargo) { ctx.fillStyle = '#f7c652'; ctx.fillRect(x + .8, y, .8, 1); }
  }
  ctx.restore();
}

export default function WorldCanvas({ world, selected, en }: { world: World; selected: number; en: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try { ctx = element.getContext('2d'); } catch { /* Keep HTML controls usable without canvas. */ }
    if (!ctx) { setUnavailable(true); return; }
    setUnavailable(false);
    const context = ctx;
    const render = () => {
      const { width, height } = element.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.round(width * ratio); element.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw(context, world, selected, width, height);
    };
    render();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(render);
      observer.observe(element);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', render);
    return () => window.removeEventListener('resize', render);
  }, [world, selected]);
  return <div className="world-scene">
    <canvas ref={canvas} aria-label={en ? 'Fictional island with twelve simulated agents' : '12人の架空のエージェントが暮らす島'} />
    {unavailable && <p className="world-canvas-error" role="status">{en ? 'Canvas unavailable. The simulation and agent list remain available.' : '島を描画できません。シミュレーションと一覧は利用できます。'}</p>}
    {Object.entries(PLACES).map(([key, point]) => <span className="world-place" key={key} style={{ left: `${point.x}%`, top: `${point.y + 12}%` }}>{({ grove: en ? 'Grove' : '森', commons: en ? 'Commons' : '広場', home: en ? 'Village' : '住まい' })[key]}</span>)}
  </div>;
}
