import { useState } from "react";
import { HighScore } from "../game/types";

interface StartProps {
  onStart: () => void;
  scores: HighScore[];
}
export function StartScreen({ onStart, scores }: StartProps) {
  return (
    <Modal layer={false}>
      <Logo />
      <p className="mt-2 text-center text-fuchsia-100/80">
        Swap candies to match 3+ in a row. Chain cascades for big combos!
      </p>
      <button onClick={onStart} className="btn-primary mt-6">
        ▶ Play
      </button>
      <div className="mt-6 w-full">
        <ScoreTable scores={scores} highlight={-1} />
      </div>
      <div className="mt-4 flex gap-5 text-xs text-fuchsia-100/70">
        <span>🖱️ Drag or click</span>
        <span>⌨️ Arrows / WASD</span>
        <span>P = Pause</span>
      </div>
    </Modal>
  );
}

export function PauseScreen({
  score,
  onResume,
  onRestart,
  onMenu,
}: {
  score: number;
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}) {
  return (
    <Modal layer>
      <h2 className="text-4xl font-black text-white drop-shadow">Paused</h2>
      <p className="mt-2 text-white/80">Score: {score.toLocaleString()}</p>
      <div className="mt-6 flex flex-col gap-3">
        <button onClick={onResume} className="btn-primary">
          ▶ Resume
        </button>
        <button onClick={onRestart} className="btn-ghost">
          ↻ Restart
        </button>
        <button onClick={onMenu} className="btn-ghost">
          ✕ Main Menu
        </button>
      </div>
    </Modal>
  );
}

interface GameOverProps {
  score: number;
  newBest: boolean;
  saved: boolean;
  scores: HighScore[];
  highlight: number;
  onSaveName: (name: string) => void;
  onRestart: () => void;
  onMenu: () => void;
}
export function GameOverScreen({
  score,
  newBest,
  saved,
  scores,
  highlight,
  onSaveName,
  onRestart,
  onMenu,
}: GameOverProps) {
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem("candycrush.name") || "";
    } catch {
      return "";
    }
  });

  return (
    <Modal layer>
      <h2 className="text-5xl font-black text-white drop-shadow">Game Over</h2>
      {newBest && !saved && (
        <div className="mt-2 animate-bounce rounded-full bg-fuchsia-500/30 px-4 py-1 text-sm font-bold text-fuchsia-200">
          ✨ New High Score! ✨
        </div>
      )}
      <p className="mt-2 text-3xl font-black text-amber-300">
        {score.toLocaleString()}
      </p>
      <div className="mt-4 flex flex-col items-center gap-3">
        {newBest && !saved && (
          <div className="flex items-center gap-2">
            <input
              autoFocus={false}
              value={name}
              maxLength={10}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveName(name || "YOU");
              }}
              placeholder="Your name"
              className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-center text-white outline-none placeholder:text-white/40 focus:border-fuchsia-300"
            />
            <button
              onClick={() => onSaveName(name || "YOU")}
              className="btn-primary !py-2"
            >
              Save
            </button>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onRestart} className="btn-primary">
            ↻ Play Again
          </button>
          <button onClick={onMenu} className="btn-ghost">
            ✕ Menu
          </button>
        </div>
      </div>
      <div className="mt-5 w-full">
        <ScoreTable scores={scores} highlight={highlight} />
      </div>
    </Modal>
  );
}

function Logo() {
  const fruits = ["🍓", "🍊", "🍋", "🍏", "🫐", "🍇"];
  return (
    <div className="select-none text-center">
      <div className="text-7xl leading-none drop-shadow-lg">
        {fruits.map((f, i) => (
          <span
            key={i}
            className="mr-1 inline-block animate-bounce"
            style={{
              animationDelay: `${i * 90}ms`,
              transform: `rotate(${i % 2 ? -8 : 8}deg)`,
            }}
          >
            {f}
          </span>
        ))}
      </div>
      <h1 className="mt-2 bg-gradient-to-b from-amber-200 via-pink-300 to-fuchsia-500 bg-clip-text text-5xl font-black italic tracking-tight text-transparent drop-shadow">
        Sugar Rush
      </h1>
    </div>
  );
}

function ScoreTable({
  scores,
  highlight,
}: {
  scores: HighScore[];
  highlight: number;
}) {
  return (
    <div className="w-full max-w-xs">
      <div className="mb-1 flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-widest text-fuchsia-200/70">
        <span>High Scores</span>
        <span>{scores.length}/8</span>
      </div>
      {scores.length === 0 ? (
        <p className="text-center text-sm text-white/50">No scores yet — be first!</p>
      ) : (
        <ul className="space-y-1">
          {scores.map((s, i) => (
            <li
              key={i}
              className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${
                i === highlight
                  ? "bg-amber-400/30 font-bold text-amber-200 ring-1 ring-amber-300/60"
                  : "bg-white/5 text-white/85"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-5 text-fuchsia-200/70">{i + 1}.</span>
                <span className="font-semibold">{s.name}</span>
              </span>
              <span className="font-mono font-bold text-amber-200">
                {s.score.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Modal({
  children,
  layer,
}: {
  children: React.ReactNode;
  layer?: boolean;
}) {
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-y-auto rounded-2xl px-6 py-8"
      style={{
        background: layer
          ? "rgba(20,10,40,0.72)"
          : "radial-gradient(circle at 50% 20%, rgba(240,80,180,0.35), rgba(20,10,40,0.9))",
        backdropFilter: layer ? "blur(4px)" : "none",
      }}
    >
      {children}
    </div>
  );
}
