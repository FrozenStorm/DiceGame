// src/game.js
import { INVALID_MOVE } from 'boardgame.io/core';

const BOARD_SIZE = 7;
const MAX_POINTS = 10;
const DICE_PER_PLAYER = 15;

export const CellTypes = {
  NEUTRAL: 'neutral',
  CASTLE: 'castle',
  CAMP: 'camp',
  RED_PORTAL: 'redPortal',
  BLUE_PORTAL: 'bluePortal',
  DEMON: 'demon',
};

const cellTypeOrder = [
  CellTypes.NEUTRAL,
  CellTypes.CASTLE,
  CellTypes.CAMP,
  CellTypes.RED_PORTAL,
  CellTypes.BLUE_PORTAL,
  CellTypes.DEMON,
];

function safeG(G) {
  if (!G || !G.board || !G.players || !G.dice) {
    return null;
  }
  return G;
}

function createEmptyBoard() {
  const board = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      row.push({ type: CellTypes.NEUTRAL, dieId: null });
    }
    board.push(row);
  }
  return board;
}

function createInitialState(ctx) {
  const dice = {};
  const players = {
    '0': {
      reserve: [],
      exile: [],
      triggerPoints: 0,
      victoryPoints: 0,
    },
    '1': {
      reserve: [],
      exile: [],
      triggerPoints: 0,
      victoryPoints: 0,
    },
  };

  // 15 Würfel pro Spieler, Wert initial 1
  ['0', '1'].forEach((pid) => {
    for (let i = 0; i < DICE_PER_PLAYER; i++) {
      const id = `${pid}-${i}`;
      dice[id] = { id, owner: pid, value: 1 };
      players[pid].reserve.push(id);
    }
  });

  return {
    board: createEmptyBoard(),
    dice,
    players,
    // Auswahl-Status
    selected: null, // { source: 'board' | 'reserve' | 'exile', playerID, row?, col?, dieId }
  };
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// Hilfsfunktionen für Auswahl / Verschieben
function clearSelection(G) {
  G.selected = null;
}

function selectDieFromReserve(G, playerID) {
  const p = G.players[playerID];
  if (!p || p.reserve.length === 0) {
    return;
  }
  const dieId = p.reserve[0]; // Einfachstes: immer ersten Würfel nehmen
  G.selected = {
    source: 'reserve',
    playerID,
    dieId,
  };
}

function selectDieFromExile(G, playerID) {
  const p = G.players[playerID];
  if (!p || p.exile.length === 0) {
    return;
  }
  const dieId = p.exile[0];
  G.selected = {
    source: 'exile',
    playerID,
    dieId,
  };
}

function selectDieOnBoard(G, row, col) {
  const cell = G.board[row][col];
  if (!cell.dieId) {
    return;
  }
  const die = G.dice[cell.dieId];
  G.selected = {
    source: 'board',
    playerID: die.owner,
    row,
    col,
    dieId: die.id,
  };
}

// Board: Klick-Logik
function handleClickBoard(G, ctx, row, col) {
  const cell = G.board[row][col];

  // 1. Wenn Feld leer: Feldtyp umschalten
  if (!cell.dieId) {
    // Feldtyp ändern
    const idx = cellTypeOrder.indexOf(cell.type);
    const nextIdx = (idx + 1) % cellTypeOrder.length;
    cell.type = cellTypeOrder[nextIdx];
    // Auswahl bleibt wie sie ist
    return;
  }

  // 2. Feld hat einen Würfel
  const dieId = cell.dieId;
  const die = G.dice[dieId];

  // a) Wenn bereits dieses Feld selektiert ist: abwählen
  if (
    G.selected &&
    G.selected.source === 'board' &&
    G.selected.row === row &&
    G.selected.col === col
  ) {
    clearSelection(G);
    return;
  }

  // b) Wenn kein Würfel selektiert: diesen anwählen
  if (!G.selected) {
    selectDieOnBoard(G, row, col);
    return;
  }

  // c) Ein anderer Würfel ist selektiert:
  const sel = G.selected;

  // Wenn selektierter Würfel von irgendwoher kommt und Ziel frei sein soll,
  // hier aber belegt: kein Zug
  if (cell.dieId && (sel.source === 'reserve' || sel.source === 'exile')) {
    return INVALID_MOVE;
  }

  // Falls selektierter Würfel auch auf Board steht => Verschieben
  if (sel.source === 'board') {
    const fromCell = G.board[sel.row][sel.col];
    if (!fromCell || fromCell.dieId !== sel.dieId) return INVALID_MOVE;

    // Ziel muss frei sein
    if (cell.dieId) return INVALID_MOVE;

    cell.dieId = sel.dieId;
    fromCell.dieId = null;
    clearSelection(G);
    return;
  }

  // Andere Fälle (Reserve/Exil -> belegtes Feld) ignorieren wir hier
}

// Reserve / Exil Klicks
function handleClickReserve(G, ctx, playerID) {
  const sel = G.selected;

  // Kein Selektierter: Würfel aus Reserve auswählen
  if (!sel) {
    selectDieFromReserve(G, playerID);
    return;
  }

  // Selektierter Würfel auf Reserve legen
  if (sel.playerID !== playerID) return INVALID_MOVE;

  const p = G.players[playerID];

  if (sel.source === 'board') {
    const fromCell = G.board[sel.row][sel.col];
    if (!fromCell || fromCell.dieId !== sel.dieId) return INVALID_MOVE;
    fromCell.dieId = null;
    p.reserve.push(sel.dieId);
    clearSelection(G);
    return;
  }

  if (sel.source === 'exile') {
    // aus Exil in Reserve
    const idx = p.exile.indexOf(sel.dieId);
    if (idx >= 0) {
      p.exile.splice(idx, 1);
      p.reserve.push(sel.dieId);
      clearSelection(G);
    }
    return;
  }

  if (sel.source === 'reserve') {
    // Reserve-Klick während Reserve-Auswahl => abwählen
    clearSelection(G);
    return;
  }
}

function handleClickExile(G, ctx, playerID) {
  const sel = G.selected;
  const p = G.players[playerID];

  // Kein Selektierter: Würfel aus Exil auswählen
  if (!sel) {
    selectDieFromExile(G, playerID);
    return;
  }

  if (sel.playerID !== playerID) return INVALID_MOVE;

  if (sel.source === 'board') {
    const fromCell = G.board[sel.row][sel.col];
    if (!fromCell || fromCell.dieId !== sel.dieId) return INVALID_MOVE;
    fromCell.dieId = null;
    p.exile.push(sel.dieId);
    clearSelection(G);
    return;
  }

  if (sel.source === 'reserve') {
    // Reserve -> Exil
    const idx = p.reserve.indexOf(sel.dieId);
    if (idx >= 0) {
      p.reserve.splice(idx, 1);
      p.exile.push(sel.dieId);
      clearSelection(G);
    }
    return;
  }

  if (sel.source === 'exile') {
    // Exil-Klick während Exil-Auswahl => abwählen
    clearSelection(G);
    return;
  }
}

// Platzieren von Reserve/Exil auf Board
function placeSelectedOnBoard(G, ctx, row, col) {
  const cell = G.board[row][col];
  if (cell.dieId) return INVALID_MOVE;
  const sel = G.selected;
  if (!sel) return INVALID_MOVE;

  const p = G.players[sel.playerID];

  if (sel.source === 'reserve') {
    const idx = p.reserve.indexOf(sel.dieId);
    if (idx >= 0) {
      p.reserve.splice(idx, 1);
      cell.dieId = sel.dieId;
      clearSelection(G);
      return;
    }
  }

  if (sel.source === 'exile') {
    const idx = p.exile.indexOf(sel.dieId);
    if (idx >= 0) {
      p.exile.splice(idx, 1);
      cell.dieId = sel.dieId;
      clearSelection(G);
      return;
    }
  }

  if (sel.source === 'board') {
    // Verschieben: von handleClickBoard bereits abgedeckt
    return INVALID_MOVE;
  }
}

// Würfelwert drehen
function rotateSelectedDie(G, delta) {
  if (!G.selected) return;
  const die = G.dice[G.selected.dieId];
  if (!die) return;
  let v = die.value + delta;
  if (v < 1) v = 6;
  if (v > 6) v = 1;
  die.value = v;
}

// Punkte ändern
function changePoints(G, playerID, kind, delta) {
  const p = G.players[playerID];
  if (!p) return;
  if (kind === 'trigger') {
    p.triggerPoints = clamp(p.triggerPoints + delta, 0, MAX_POINTS);
  } else if (kind === 'victory') {
    p.victoryPoints = clamp(p.victoryPoints + delta, 0, MAX_POINTS);
  }
}

export const DiceGame = {
  name: 'dice-game',

  setup: (ctx) => createInitialState(ctx),

  moves: {
    clickBoard(G, ctx, row, col) {
	  G = safeG(G);
	  if (!G) return INVALID_MOVE;
      const cell = G.board[row][col];

      // Wenn ein Würfel selektiert ist und Ziel leer: platzieren / verschieben
      if (G.selected && !cell.dieId) {
        // Reserve/Exil -> Board
        if (G.selected.source === 'reserve' || G.selected.source === 'exile') {
          return placeSelectedOnBoard(G, ctx, row, col);
        }
        // Board -> Board
        if (G.selected.source === 'board') {
          const fromCell = G.board[G.selected.row][G.selected.col];
          if (!fromCell || fromCell.dieId !== G.selected.dieId) return INVALID_MOVE;
          fromCell.dieId = null;
          cell.dieId = G.selected.dieId;
          clearSelection(G);
          return;
        }
      }

      // Sonst normale Klick-Logik
      return handleClickBoard(G, ctx, row, col);
    },

    clickReserve(G, ctx, playerID) {
	  G = safeG(G);
	  if (!G) return INVALID_MOVE;
      return handleClickReserve(G, ctx, playerID);
    },

    clickExile(G, ctx, playerID) {
	  G = safeG(G);
	  if (!G) return INVALID_MOVE;
      return handleClickExile(G, ctx, playerID);
    },

    rotatePlus(G, ctx) {
	  G = safeG(G);
	  if (!G) return INVALID_MOVE;
      rotateSelectedDie(G, +1);
    },

    rotateMinus(G, ctx) {
	  G = safeG(G);
	  if (!G) return INVALID_MOVE;
      rotateSelectedDie(G, -1);
    },

    incTrigger(G, ctx, playerID) {
	  G = safeG(G);
	  if (!G) return INVALID_MOVE;
      changePoints(G, playerID, 'trigger', +1);
    },

    decTrigger(G, ctx, playerID) {
	  G = safeG(G);
	  if (!G) return INVALID_MOVE;
      changePoints(G, playerID, 'trigger', -1);
    },

    incVictory(G, ctx, playerID) {
	  G = safeG(G);
	  if (!G) return INVALID_MOVE;
      changePoints(G, playerID, 'victory', +1);
    },

    decVictory(G, ctx, playerID) {
	  G = safeG(G);
	  if (!G) return INVALID_MOVE;
      changePoints(G, playerID, 'victory', -1);
    },

    endTurn(G, ctx) {
	  G = safeG(G);
	  if (!G) return INVALID_MOVE;
      ctx.events.endTurn();
    },
  },

  endIf: (G, ctx) => {
  const p0 = G.players?.['0'];
  const p1 = G.players?.['1'];
  
  if (p0?.victoryPoints >= MAX_POINTS) {
    return { winner: '0' };
  }
  if (p1?.victoryPoints >= MAX_POINTS) {
    return { winner: '1' };
  }
  return undefined;  // Spiel läuft weiter
  },
};
