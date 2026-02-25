// src/Board.jsx
import React from 'react';
import { CellTypes } from './game';

function cellLabel(cell) {
  switch (cell.type) {
    case CellTypes.NEUTRAL: return '';
    case CellTypes.CASTLE: return '🏰';
    case CellTypes.CAMP: return '⛺';
    case CellTypes.RED_PORTAL: return '🔴';
    case CellTypes.BLUE_PORTAL: return '🔵';
    case CellTypes.DEMON: return '😈';
    default: return '';
  }
}

export function Board({ G, ctx, moves, playerID, onBackToLobby }) {
  const currentPlayer = playerID ?? ctx.currentPlayer;
  const winner = ctx.gameover ? ctx.gameover.winner : null;

  const renderCell = (row, col) => {
    const cell = G.board[row][col];
    const isSelected =
      G.selected &&
      G.selected.source === 'board' &&
      G.selected.row === row &&
      G.selected.col === col;

    let content = cellLabel(cell);
    if (cell.dieId) {
      const die = G.dice[cell.dieId];
      content = `${die.value}`;
    }

    return (
      <div
        key={`${row}-${col}`}
        onClick={() => moves.clickBoard(row, col)}
        style={{
          width: 40,
          height: 40,
          border: '1px solid #666',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isSelected ? '#ffd' : '#eee',
          cursor: 'pointer',
          fontWeight: cell.dieId ? 'bold' : 'normal',
        }}
      >
        {content}
      </div>
    );
  };

  const renderRow = (row) => (
    <div key={row} style={{ display: 'flex' }}>
      {Array.from({ length: 7 }, (_, col) => renderCell(row, col))}
    </div>
  );

  const renderPlayerZone = (pid, position) => {
    const p = G.players[pid];
    const isBottom = position === 'bottom';

    const zoneStyle = {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: '8px',
      borderTop: isBottom ? '1px solid #999' : 'none',
      borderBottom: !isBottom ? '1px solid #999' : 'none',
      backgroundColor: pid === currentPlayer ? '#f0f8ff' : '#f8f8f8',
    };

    const badge = (label, value, onDec, onInc) => (
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <button onClick={onDec} style={{ marginRight: 4 }}>-</button>
        <div style={{
          minWidth: 80,
          textAlign: 'center',
          padding: '2px 6px',
          border: '1px solid #ccc',
          backgroundColor: '#fff',
        }}>
          {label}: {value}
        </div>
        <button onClick={onInc} style={{ marginLeft: 4 }}>+</button>
      </div>
    );

    return (
      <div style={zoneStyle}>
        {/* Reserve */}
        <div
          onClick={() => moves.clickReserve(pid)}
          style={{
            border: '1px solid #666',
            padding: '4px 8px',
            cursor: 'pointer',
            backgroundColor: '#eef',
          }}
        >
          Reserve ({p.reserve.length})
        </div>

        {/* Punkte */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {badge(
            'Trigger',
            p.triggerPoints,
            () => moves.decTrigger(pid),
            () => moves.incTrigger(pid)
          )}
          {badge(
            'Siege',
            p.victoryPoints,
            () => moves.decVictory(pid),
            () => moves.incVictory(pid)
          )}
        </div>

        {/* Exil */}
        <div
          onClick={() => moves.clickExile(pid)}
          style={{
            border: '1px solid #666',
            padding: '4px 8px',
            cursor: 'pointer',
            backgroundColor: '#fee',
          }}
        >
          Exil ({p.exile.length})
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Spielerzone 2 oben */}
      {renderPlayerZone('1', 'top')}

      <div style={{ flex: 1, display: 'flex' }}>
        {/* Linke Seite */}
        <div style={{
          width: 140,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 8,
          borderRight: '1px solid #999',
        }}>
          <button onClick={onBackToLobby}>Zurück zur Lobby</button>
          <div style={{
            border: '1px solid #666',
            padding: 8,
            textAlign: 'center',
            minHeight: 40,
          }}>
            {winner != null
              ? `Gewinner: Spieler ${winner}`
              : `Am Zug: Spieler ${ctx.currentPlayer}`}
          </div>
          <button onClick={() => moves.endTurn()}>Zug beenden</button>
        </div>

        {/* Spielfeld in der Mitte */}
        <div style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <div>
            {Array.from({ length: 7 }, (_, row) => renderRow(row))}
          </div>
        </div>

        {/* Rechte Seite: Würfel drehen */}
        <div style={{
          width: 140,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 8,
          borderLeft: '1px solid #999',
        }}>
          <button onClick={() => moves.rotatePlus()}>+</button>
          <div style={{
            border: '1px solid #666',
            padding: 8,
            minHeight: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {G.selected
              ? `Würfel ${G.dice[G.selected.dieId]?.value ?? '?'}`
              : 'kein Würfel gewählt'}
          </div>
          <button onClick={() => moves.rotateMinus()}>-</button>
        </div>
      </div>

      {/* Spielerzone 1 unten */}
      {renderPlayerZone('0', 'bottom')}
    </div>
  );
}
