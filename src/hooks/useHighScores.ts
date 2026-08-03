import { useCallback, useState } from "react";
import { HighScore } from "../game/types";

const KEY = "candycrush.highscores.v1";
const MAX = 8;

function load(): HighScore[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((s) => typeof s?.score === "number")
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function useHighScores() {
  const [scores, setScores] = useState<HighScore[]>(load);

  const submit = useCallback((score: number, name: string): number => {
    let list = load();
    const entry: HighScore = { name: name.trim() || "YOU", score, date: Date.now() };
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    list = list.slice(0, MAX);
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* ignore quota errors */
    }
    setScores(list);
    return list.findIndex((s) => s === entry);
  }, []);

  const qualifies = useCallback(
    (score: number) => {
      if (score <= 0) return false;
      const list = load();
      if (list.length < MAX) return true;
      return score > list[list.length - 1].score;
    },
    [],
  );

  return { scores, submit, qualifies };
}
