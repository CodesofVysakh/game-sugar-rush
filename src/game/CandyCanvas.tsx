import {
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  CandyType,
  COLS,
  ROWS,
  CELL,
  PALETTE,
  EMPTY,
  Screen,
} from "./types";
import {
  Board,
  guaranteedBoard,
  findMatches,
  gravityAndFill,
  hasPossibleMove,
  swap,
  emptyBoard,
} from "./logic";

type Pt = { r: number; c: number };
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  r: number;
  vr: number;
  shape: number;
};
type Floater = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  text: string;
  size: number;
  color: string;
};

export interface CandyHandle {
  start: () => void;
  pause: () => void;
  resume: () => void;
}

interface Props {
  screen: Screen;
  onScore: (score: number) => void;
  onCombo: (combo: number) => void;
  onGameOver: (finalScore: number) => void;
  onProgress: () => void;
}

function CandyCanvas(
  { screen, onScore, onCombo, onGameOver, onProgress }: Props,
  ref: React.Ref<CandyHandle>,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // core state in refs for the loop (no re-renders churn)
  const board = useRef<Board>(emptyBoard());
  const running = useRef(false);
  const busy = useRef(false);
  const gameOverFired = useRef(false);
  const score = useRef(0);
  const shake = useRef({ t: 0, mag: 0 });

  // swap animation state
  const swapAnim = useRef<{ a: Pt; b: Pt; t: number } | null>(null);

  const particles = useRef<Particle[]>([]);
  const floaters = useRef<Floater[]>([]);
  const ripples = useRef<{ x: number; y: number; size: number }[]>([]);

  const sel = useRef<Pt | null>(null);
  const hover = useRef<Pt | null>(null);
  const kbdCursor = useRef<Pt>({ r: 3, c: 3 });
  const cell = useRef(CELL);
  const layout = useRef({ dpr: 1, W: 0, H: 0 });

  // latest callbacks
  const onScoreRef = useRef(onScore);
  onScoreRef.current = onScore;
  const onComboRef = useRef(onCombo);
  onComboRef.current = onCombo;
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  // ------------------------------------------------------------------
  const resize = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const boardPx = Math.max(260, Math.min(wrap.clientWidth, wrap.clientHeight));
    canvas.width = boardPx * dpr;
    canvas.height = boardPx * dpr;
    canvas.style.width = boardPx + "px";
    canvas.style.height = boardPx + "px";
    layout.current = { dpr, W: boardPx, H: boardPx };
    cell.current = boardPx / COLS;
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  // ------------------------------------------------------------------
  // FX
  // ------------------------------------------------------------------
  const emit = useCallback(
    (x: number, y: number, n: number, color: string, big = false) => {
      const list = particles.current;
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = (big ? 260 : 150) * (0.35 + Math.random() * 0.85);
        list.push({
          x,
          y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - (big ? 90 : 50),
          life: 420 + Math.random() * 360,
          max: 780,
          color,
          size: (big ? 7 : 4) + Math.random() * 6,
          r: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.22,
          shape: Math.random() < 0.78 ? 0 : 1,
        });
      }
      if (list.length > 650) list.splice(0, list.length - 650);
    },
    [],
  );

  const floater = useCallback(
    (x: number, y: number, text: string, big = false) => {
      floaters.current.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y - 8,
        vx: (Math.random() - 0.5) * 26,
        vy: -66,
        life: 820,
        max: 820,
        text,
        size: big ? 30 : 20,
        color: big ? "#ffd60a" : "#ffffff",
      });
    },
    [],
  );

  const addShake = useCallback((mag: number) => {
    shake.current.mag = Math.max(shake.current.mag, mag);
    shake.current.t = 430;
  }, []);

  // ------------------------------------------------------------------
  // Cascade resolution
  // ------------------------------------------------------------------
  const resolveCascadeStep = useCallback(() => {
    const bd = board.current;
    const cp = cell.current;
    const matches = findMatches(bd);
    if (matches.length === 0) return false;
    busy.current = true; // block input while clearing/re-falling

    // chain points
    let pts = 0;
    for (const m of matches) {
      const pal = PALETTE[bd[m.r][m.c].type];
      pts += 10;
      const cx = (m.c + 0.5) * cp;
      const cy = (m.r + 0.5) * cp;
      emit(cx, cy, 9, pal.main, true);
      ripples.current.push({ x: cx, y: cy, size: 4 });
      bd[m.r][m.c].type = EMPTY;
    }
    score.current += pts;
    onScoreRef.current(score.current);
    comboRef.current++;
    onComboRef.current(comboRef.current);
    const cx = (matches.reduce((s, m) => s + m.c, 0) / matches.length + 0.5) * cp;
    const cy = (matches.reduce((s, m) => s + m.r, 0) / matches.length + 0.5) * cp;
    floater(cx, cy, `+${pts}`, comboRef.current > 1);
    addShake(4 + Math.min(5, matches.length));
    gravityAndFill(bd, cp);
    return true;
  }, [emit, floater, addShake]);

  const comboRef = useRef(0);

  // While the board is idle (no falling, no active swap), detect and resolve
  // matches and cascades, and re-enable input when fully spent.
  const tickResolve = useCallback(() => {
    if (swapAnim.current) return;
    const bd = board.current;
    if (boardMoving(bd)) return; // wait for physics

    if (resolveCascadeStep()) {
      return; // triggered a clear, keep busy until pieces settle
    }

    if (gameOverFired.current) return;
    if (boardFull(bd) && !hasPossibleMove(bd)) {
      gameOverFired.current = true;
      running.current = false;
      onGameOverRef.current(score.current);
      return;
    }

    // board fully settled & no more matches -> release input
    busy.current = false;
  }, [resolveCascadeStep]);

  function boardMoving(bd: Board) {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (bd[r][c].y < r * cell.current - 0.5) return true;
    return false;
  }
  function boardFull(bd: Board) {
    return !bd.some((row) => row.some((cellData) => cellData.type === EMPTY));
  }

  // ------------------------------------------------------------------
  // Swap / input
  // ------------------------------------------------------------------
  const beginSwap = useCallback(
    (a: Pt, b: Pt) => {
      if (busy.current || swapAnim.current) return;
      const bd = board.current;
      swap(bd, a.r, a.c, b.r, b.c);
      const has = findMatches(bd).length > 0;
      swap(bd, a.r, a.c, b.r, b.c); // revert
      if (!has) {
        addShake(2);
        return;
      }
      onProgressRef.current();
      comboRef.current = 0; // a fresh move starts a fresh combo chain
      swapAnim.current = { a, b, t: 0 };
    },
    [addShake],
  );

  // finalize a swap that produced a match -> commit board and animate pending
  const finalizeSwap = useCallback(() => {
    const sa = swapAnim.current;
    if (!sa) return;
    const bd = board.current;
    swap(bd, sa.a.r, sa.a.c, sa.b.r, sa.b.c);
    swapAnim.current = null;
    // block input; the tick loop will detect a match and clear + cascade
    busy.current = true;
  }, []);

  const toGrid = useCallback(
    (clientX: number, clientY: number): Pt | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const cp = cell.current;
      const c = Math.floor((clientX - rect.left) / cp);
      const r = Math.floor((clientY - rect.top) / cp);
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
      return { r, c };
    },
    [],
  );

  const onDown = useCallback(
    (e: PointerEvent) => {
      if (screen !== "playing") return;
      const p = toGrid(e.clientX, e.clientY);
      if (!p) return;
      sel.current = p;
      hover.current = p;
    },
    [toGrid, screen],
  );

  const onMove = useCallback(
    (e: PointerEvent) => {
      if (screen !== "playing") return;
      const p = toGrid(e.clientX, e.clientY);
      if (p) hover.current = p;
      const s = sel.current;
      if (!s || !p || busy.current || swapAnim.current) return;
      if (Math.abs(s.r - p.r) + Math.abs(s.c - p.c) === 1) {
        sel.current = null;
        beginSwap(s, p);
      }
    },
    [toGrid, screen, beginSwap],
  );

  const onUp = useCallback(() => {
    sel.current = null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [onDown, onMove, onUp]);

  // keyboard
  const beginSwapRef = useRef(beginSwap);
  beginSwapRef.current = beginSwap;
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const swapAnimR = useRef(swapAnim);
  swapAnimR.current = swapAnim;

  useEffect(() => {
    if (screen !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      const cur = { ...kbdCursor.current };
      let dr = 0, dc = 0;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") dr = -1;
      else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") dr = 1;
      else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") dc = -1;
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") dc = 1;
      else return;
      e.preventDefault();
      const nr = cur.r + dr, nc = cur.c + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
      const np = { r: nr, c: nc };
      const grab = busyRef.current || swapAnimR.current;
      if (!grab) beginSwapRef.current(cur, np);
      kbdCursor.current = np;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen]);

  // ------------------------------------------------------------------
  // Update
  // ------------------------------------------------------------------
  const tick = useCallback(
    (dt: number) => {
      const bd = board.current;
      const cp = cell.current;
      const fallSpeed = (ROWS + 1) * cp;

      // swap animation progression
      if (swapAnim.current) {
        const sa = swapAnim.current;
        sa.t += dt / 0.22;
        if (sa.t >= 1) {
          finalizeSwap();
        }
      }

      // falling physics
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cellData = bd[r][c];
          if (cellData.type === EMPTY) continue;
          if (cellData.y < r * cp) {
            cellData.y += fallSpeed * dt;
            if (cellData.y > r * cp) cellData.y = r * cp;
          }
        }
      }

      // whenever the board is idle (no active swap), drive cascade resolution
      if (!swapAnim.current) {
        tickResolve();
      }
    },
    [finalizeSwap, tickResolve],
  );

  const tickRef = useRef(tick);
  tickRef.current = tick;

  // ------------------------------------------------------------------
  // Public controls
  // ------------------------------------------------------------------
  useImperativeHandle(
    ref,
    () => ({
      start() {
        const bd = guaranteedBoard();
        board.current = bd;
        score.current = 0;
        onScoreRef.current(0);
        comboRef.current = 0;
        busy.current = false;
        running.current = true;
        gameOverFired.current = false;
        swapAnim.current = null;
        particles.current = [];
        floaters.current = [];
        ripples.current = [];
        addShake(4);
      },
      pause() {
        running.current = false;
      },
      resume() {
        running.current = true;
      },
    }),
    [addShake],
  );

  // ------------------------------------------------------------------
  // Render loop
  // ------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (running.current) tickRef.current(dt);
      drawRef.current(ctx, now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ------------------------------------------------------------------
  // Draw
  // ------------------------------------------------------------------
  const drawCandy = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, t: CandyType, rad: number) => {
      const pal = PALETTE[t];
      // shadow
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(x + rad * 0.08, y + rad * 0.14, rad, rad * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      // body
      const g = ctx.createRadialGradient(x - rad * 0.3, y - rad * 0.4, rad * 0.1, x, y, rad * 1.25);
      g.addColorStop(0, pal.light);
      g.addColorStop(0.55, pal.main);
      g.addColorStop(1, pal.dark);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
      // glossy
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.ellipse(x - rad * 0.26, y - rad * 0.38, rad * 0.34, rad * 0.2, -0.7, 0, Math.PI * 2);
      ctx.fill();
      // emoji
      ctx.font = `${rad * 1.05}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(pal.emoji, x, y + rad * 0.08);
    },
    [],
  );

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, now: number) => {
      const { dpr, W, H } = layout.current;
      const cp = cell.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // board bg
      roundRect(ctx, 0, 0, W, H, 18);
      ctx.fillStyle = "rgba(20,12,40,0.45)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 2;
      ctx.stroke();
      // checker
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if ((r + c) % 2 === 0) {
            ctx.fillStyle = "rgba(255,255,255,0.05)";
            ctx.fillRect(c * cp, r * cp, cp, cp);
          }
        }
      }

      // shake
      const sh = shake.current;
      let sx = 0, sy = 0;
      if (sh.t > 0) {
        sh.t -= 16;
        const k = sh.mag * (sh.t / 430);
        sx = (Math.random() - 0.5) * 2 * k;
        sy = (Math.random() - 0.5) * 2 * k;
        if (sh.t <= 0) sh.mag = 0;
      }
      ctx.save();
      ctx.translate(sx, sy);

      // ripples
      const rl = ripples.current;
      for (let i = rl.length - 1; i >= 0; i--) {
        const p = rl[i];
        p.size += 3.2;
        if (p.size > cp * 0.9) {
          rl.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // candies
      const bd = board.current;
      const sa = swapAnim.current;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cellData = bd[r][c];
          if (cellData.type === EMPTY) continue;
          let xx = (c + 0.5) * cp;
          let yy = cellData.y + cp / 2 + (r * cp - r * cp) * 0; // y set by physics
          // note: cellData.y is absolute row*cell once settled
          yy = cellData.y + cp / 2;
          let rad = cp * 0.42;

          if (sa) {
            const t = easeInOut(sa.t);
            if (r === sa.a.r && c === sa.a.c) {
              // the piece currently at a slides to b
              xx = (sa.a.c + (sa.b.c - sa.a.c) * t + 0.5) * cp;
              yy = (sa.a.r + (sa.b.r - sa.a.r) * t) * cp + cp / 2 - (r * cp - cellData.y);
            } else if (r === sa.b.r && c === sa.b.c) {
              // the piece currently at b slides to a
              xx = (sa.b.c + (sa.a.c - sa.b.c) * t + 0.5) * cp;
              yy = (sa.b.r + (sa.a.r - sa.b.r) * t) * cp + cp / 2 - (r * cp - cellData.y);
            }
          }

          const wob = 1 + Math.sin(now / 260 + c * 0.8 + r) * 0.018;
          drawCandy(ctx, xx, yy, cellData.type, rad * wob);
        }
      }

      // selection / hover highlights
      if (hover.current && screen === "playing" && !sel.current) {
        const p = hover.current;
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 2;
        roundRect(ctx, p.c * cp + 3, p.r * cp + 3, cp - 6, cp - 6, cp * 0.16);
        ctx.stroke();
      }
      if (sel.current) {
        const p = sel.current;
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 3;
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 12;
        roundRect(ctx, p.c * cp + 3, p.r * cp + 3, cp - 6, cp - 6, cp * 0.16);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      // kbd cursor
      if (screen === "playing") {
        const p = kbdCursor.current;
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        roundRect(ctx, p.c * cp + 4, p.r * cp + 4, cp - 8, cp - 8, cp * 0.12);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // particles
      const parts = particles.current;
      ctx.globalCompositeOperation = "lighter";
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= 16;
        if (p.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        p.vy += 34;
        p.x += p.vx * 0.016;
        p.y += p.vy * 0.016;
        p.vx *= 0.98;
        p.r += p.vr;
        const a = Math.max(0, Math.min(1, p.life / 300));
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        if (p.shape === 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.r);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      // floaters
      const fl = floaters.current;
      for (let i = fl.length - 1; i >= 0; i--) {
        const f = fl[i];
        f.life -= 16;
        if (f.life <= 0) {
          fl.splice(i, 1);
          continue;
        }
        f.x += f.vx * 0.016;
        f.y += f.vy * 0.016;
        const k = 1 - f.life / f.max;
        const alpha = k < 0.1 ? k / 0.1 : 1;
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.font = `900 ${f.size}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    },
    [drawCandy, screen],
  );

  const drawRef = useRef(draw);
  drawRef.current = draw;

  return (
    <div ref={wrapRef} className="flex h-full w-full items-center justify-center">
      <canvas
        ref={canvasRef}
        className="block rounded-2xl"
        style={{ touchAction: "none", cursor: "pointer" }}
      />
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// eslint-disable-next-line no-unused-vars

export default forwardRef<CandyHandle, Props>(CandyCanvas);
