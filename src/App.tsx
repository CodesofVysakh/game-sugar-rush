import { useCallback, useEffect, useRef, useState } from "react";
import CandyCanvas, { CandyHandle } from "./game/CandyCanvas";
import {
  StartScreen,
  PauseScreen,
  GameOverScreen,
} from "./components/Overlays";
import { useHighScores } from "./hooks/useHighScores";
import { Screen } from "./game/types";

export default function App() {
  const gameRef = useRef<CandyHandle>(null);
  const [screen, setScreen] = useState<Screen>("menu");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboKey, setComboKey] = useState(0);
  const [moves, setMoves] = useState(0);

  const [highlight, setHighlight] = useState(-1);
  const [saved, setSaved] = useState(false);

  const { scores, submit, qualifies } = useHighScores();

  const startGame = useCallback(() => {
    setCombo(0);
    setMoves(0);
    setScore(0);
    setScreen("playing");
    setSaved(false);
    setTimeout(() => gameRef.current?.start(), 30);
  }, []);

  const pauseGame = useCallback(() => {
    gameRef.current?.pause();
    setScreen("paused");
  }, []);

  const resumeGame = useCallback(() => {
    gameRef.current?.resume();
    setScreen("playing");
  }, []);

  const restartFromPause = useCallback(() => {
    startGame();
  }, [startGame]);

  const goMenu = useCallback(() => {
    gameRef.current?.pause();
    setScreen("menu");
    setCombo(0);
  }, []);

  // Escape / P toggles pause
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (screen === "playing" && (e.key === "p" || e.key === "P" || e.key === "Escape")) {
        pauseGame();
      } else if (screen === "paused" && (e.key === "p" || e.key === "P" || e.key === "Escape" || e.key === "Enter")) {
        resumeGame();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, pauseGame, resumeGame]);

  const onScore = useCallback((s: number) => setScore(s), []);
  const onCombo = useCallback((c: number) => {
    setCombo(c);
    setComboKey((k) => k + 1);
  }, []);
  const onProgress = useCallback(() => setMoves((m) => m + 1), []);

  const onGameOver = useCallback(
    (finalScore: number) => {
      // sync state to the authoritative canvas score before showing game over
      setScore(finalScore);
      scoreRef.current = finalScore;
      const q = qualifies(finalScore);
      setHighlight(-1);
      setSaved(false);
      setScreen("gameover");
      void q;
    },
    [qualifies],
  );

  // keep a fresh score ref for the game-over save
  const scoreRef = useRef(0);
  scoreRef.current = score;

  const saveName = useCallback(
    (name: string) => {
      try {
        localStorage.setItem("candycrush.name", name);
      } catch {}
      const idx = submit(scoreRef.current, name);
      setHighlight(idx);
      setSaved(true);
    },
    [submit],
  );

  const canEnterScore = qualifies(score) && score > 0;

  // combo pop timer
  const [comboVisible, setComboVisible] = useState(false);
  useEffect(() => {
    if (combo === 0) {
      setComboVisible(false);
      return;
    }
    setComboVisible(true);
    const t = setTimeout(() => setComboVisible(false), 600);
    return () => clearTimeout(t);
  }, [comboKey, combo]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1a0b2e] p-3 sm:p-5">
      {/* background decor */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-fuchsia-600/25 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-purple-600/25 blur-3xl" />
        <div className="absolute top-1/3 -left-20 h-64 w-64 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="absolute top-0 right-0 text-[34px] leading-none opacity-20"
          style={{
            background:
              "repeating-linear-gradient(45deg, transparent 0 18px, rgba(255,255,255,0.08) 18px 20px)",
            WebkitBackgroundClip: "text",
          }}
        />
      </div>

      <div className="relative flex w-full max-w-md flex-col items-center gap-3">
        {/* HUD */}
        <div className="flex w-full items-center justify-between rounded-2xl bg-white/10 px-4 py-2.5 backdrop-blur-sm ring-1 ring-white/15">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-200/70">
              Score
            </span>
            <span className="text-2xl font-black tabular-nums text-white">
              {score.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-200/70">
              Moves
            </span>
            <span className="text-2xl font-black tabular-nums text-white">{moves}</span>
          </div>
          <div className="flex items-center gap-2">
            {screen !== "menu" && screen !== "gameover" ? (
              <button
                onClick={screen === "playing" ? pauseGame : resumeGame}
                className="rounded-xl bg-white/15 px-3 py-2 text-lg text-white ring-1 ring-white/20 transition hover:bg-white/25 active:scale-95"
                aria-label="Pause / resume"
              >
                {screen === "paused" ? "▶" : "⏸"}
              </button>
            ) : (
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-200/80">
                  Best
                </span>
                <span className="text-xl font-black tabular-nums text-amber-300">
                  {(scores[0]?.score ?? 0).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Game board + overlays */}
        <div className="relative h-auto w-full max-w-[420px]">
          <CandyCanvas
            ref={gameRef}
            screen={screen}
            onScore={onScore}
            onCombo={onCombo}
            onGameOver={onGameOver}
            onProgress={onProgress}
          />

          {/* combo popup */}
          {comboVisible && screen === "playing" && combo > 1 && (
            <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 animate-combo-pop text-center">
              <div className="rounded-full bg-gradient-to-r from-amber-400 to-pink-500 px-4 py-1 text-sm font-black uppercase text-white shadow-lg shadow-pink-500/40">
                Combo x{combo}!
              </div>
            </div>
          )}

          {screen === "menu" && <StartScreen onStart={startGame} scores={scores} />}
          {screen === "paused" && (
            <PauseScreen
              score={score}
              onResume={resumeGame}
              onRestart={restartFromPause}
              onMenu={goMenu}
            />
          )}
          {screen === "gameover" && (
            <GameOverScreen
              score={score}
              newBest={canEnterScore}
              saved={saved}
              scores={scores}
              highlight={highlight}
              onSaveName={saveName}
              onRestart={startGame}
              onMenu={goMenu}
            />
          )}
        </div>

        <p className="text-center text-xs text-fuchsia-100/40">
          Match 3+ • Chain combos • Made with React + Canvas
        </p>
      </div>
    </div>
  );
}
