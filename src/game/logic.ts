import { CandyType, COLS, ROWS } from "./types";

export type Cell = { type: CandyType; y: number };
export type Board = Cell[][];

export function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ type: (0 as CandyType), y: 0 })),
  );
}

export function randType(): CandyType {
  return Math.floor(Math.random() * 6) as CandyType;
}

// Build a fresh board with no initial matches.
export function freshBoard(): Board {
  const b: Board = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ type: (0 as CandyType), y: 0 })),
  );
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let t: CandyType;
      do {
        t = randType();
      } while (
        (c >= 2 && b[r][c - 1].type === t && b[r][c - 2].type === t) ||
        (r >= 2 && b[r - 1][c].type === t && b[r - 2][c].type === t)
      );
      b[r][c].type = t;
      // start pieces high, staggered above the board for a drop-in intro
      b[r][c].y = -((ROWS - r) * 22);
    }
  }
  return b;
}

// A starting board guaranteed to contain at least one possible move.
export function guaranteedBoard(): Board {
  const b = freshBoard();
  if (hasPossibleMove(b)) return b;
  // Reshuffle types until a move exists (cheap since already match-free).
  for (let guard = 0; guard < 30; guard++) {
    const types: CandyType[] = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) types.push(b[r][c].type);
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    let k = 0;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        // avoid accidental initial matches while reshuffling
        let t = types[k++];
        while (
          (c >= 2 && b[r][c - 1].type === t && b[r][c - 2].type === t) ||
          (r >= 2 && b[r - 1][c].type === t && b[r - 2][c].type === t)
        )
          t = randType();
        b[r][c].type = t;
        b[r][c].y = -((ROWS - r) * 22);
      }
    if (hasPossibleMove(b)) return b;
  }
  return b;
}

// Find all matching groups (rows/cols of length >= 3).
export function findMatches(b: Board): { r: number; c: number }[] {
  const cells = new Set<string>();
  // horizontal
  for (let r = 0; r < ROWS; r++) {
    let run = 1;
    for (let c = 1; c <= COLS; c++) {
      const same =
        c < COLS &&
        b[r][c].type !== EMPTY &&
        b[r][c].type === b[r][c - 1].type;
      if (same) {
        run++;
      } else {
        if (run >= 3) {
          for (let k = c - run; k < c; k++) cells.add(`${r},${k}`);
        }
        run = 1;
      }
    }
  }
  // vertical
  for (let c = 0; c < COLS; c++) {
    let run = 1;
    for (let r = 1; r <= ROWS; r++) {
      const same =
        r < ROWS &&
        b[r][c].type !== EMPTY &&
        b[r][c].type === b[r - 1][c].type;
      if (same) {
        run++;
      } else {
        if (run >= 3) {
          for (let k = r - run; k < r; k++) cells.add(`${k},${c}`);
        }
        run = 1;
      }
    }
  }
  return [...cells].map((s) => {
    const [r, c] = s.split(",").map(Number);
    return { r, c };
  });
}

export const EMPTY = -1 as CandyType;

// After removals, apply gravity and refill columns with new falling candies.
// `cp` is the cell size in px used to position each candy for falling animation.
export function gravityAndFill(b: Board, cp: number): {
  hadMovement: boolean;
  moved: { r: number; c: number; fromY: number }[];
} {
  const moved: { r: number; c: number; fromY: number }[] = [];
  for (let c = 0; c < COLS; c++) {
    let write = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (b[r][c].type !== EMPTY) {
        if (write !== r) {
          b[write][c].type = b[r][c].type;
          b[r][c].type = EMPTY;
          // start the moved candy where it was so it visibly falls to its target
          b[write][c].y = r * cp;
        }
        moved.push({ r: write, c, fromY: r });
        write--;
      }
    }
    // fill above with brand-new pieces which drop in from above the board
    const toSpawn = write + 1;
    for (let i = 0; i < toSpawn; i++) {
      b[i][c].type = randType();
      b[i][c].y = -(toSpawn - i) * cp - cp;
      moved.push({ r: i, c, fromY: i - toSpawn - 1 });
    }
  }
  return {
    hadMovement: moved.length > 0,
    moved,
  };
}

// Does the board contain at least one possible move?
export function hasPossibleMove(b: Board): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // try swap right
      if (c + 1 < COLS) {
        swap(b, r, c, r, c + 1);
        if (findMatches(b).length > 0) {
          swap(b, r, c, r, c + 1);
          return true;
        }
        swap(b, r, c, r, c + 1);
      }
      // try swap down
      if (r + 1 < ROWS) {
        swap(b, r, c, r + 1, c);
        if (findMatches(b).length > 0) {
          swap(b, r, c, r + 1, c);
          return true;
        }
        swap(b, r, c, r + 1, c);
      }
    }
  }
  return false;
}

export function swap(
  b: Board,
  r1: number,
  c1: number,
  r2: number,
  c2: number,
) {
  const t = b[r1][c1].type;
  b[r1][c1].type = b[r2][c2].type;
  b[r2][c2].type = t;
}

export function cloneBoard(b: Board): Board {
  return b.map((row) => row.map((cell) => ({ ...cell })));
}
