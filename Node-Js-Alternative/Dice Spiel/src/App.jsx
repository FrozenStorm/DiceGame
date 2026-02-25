// src/App.jsx
import React, { useState } from 'react';
import { Client } from 'boardgame.io/react';
import { P2P } from '@boardgame.io/p2p';
import { DiceGame } from './game';
import { Board } from './Board';

function createGameClient({ matchID, playerID, isHost }) {
  return Client({
    game: DiceGame,
    board: (props) => (
      <Board
        {...props}
        playerID={playerID}
        onBackToLobby={() => window.location.reload()}
      />
    ),
    debug: false,
    multiplayer: P2P({ isHost }),
  });
}

export function App() {
  const [matchID, setMatchID] = useState('');
  const [playerID, setPlayerID] = useState('0');
  const [isHost, setIsHost] = useState(true);
  const [started, setStarted] = useState(false);

  const [GameClient, setGameClient] = useState(null);

  const handleStart = () => {
    if (!matchID) {
      alert('Bitte eine Match-ID eingeben (z.B. zufälliger Code).');
      return;
    }
    const ClientImpl = createGameClient({ matchID, playerID, isHost });
    setGameClient(() => ClientImpl);
    setStarted(true);
  };

  if (!started || !GameClient) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <div style={{
          border: '1px solid #999',
          padding: 16,
          borderRadius: 4,
          backgroundColor: '#f8f8f8',
          minWidth: 320,
        }}>
          <h2>Lobby (P2P)</h2>
          <div style={{ marginBottom: 8 }}>
            <label>
              Match-ID:&nbsp;
              <input
                value={matchID}
                onChange={(e) => setMatchID(e.target.value)}
                placeholder="z.B. abc123"
              />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Spieler-ID:&nbsp;
              <select
                value={playerID}
                onChange={(e) => setPlayerID(e.target.value)}
              >
                <option value="0">Spieler 0 (unten)</option>
                <option value="1">Spieler 1 (oben)</option>
              </select>
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={isHost}
                onChange={(e) => setIsHost(e.target.checked)}
              />
              &nbsp;Ich bin der Host
            </label>
          </div>
          <p style={{ fontSize: '0.9em' }}>
            Host erstellt ein Match mit einer Match-ID und teilt diese
            dem Mitspieler mit. Dieser gibt dieselbe ID ein, wählt seine
            Spieler-ID und deaktiviert „Ich bin der Host“.
          </p>
          <button onClick={handleStart}>Spiel starten / beitreten</button>
        </div>
      </div>
    );
  }

  return <GameClient matchID={matchID} playerID={playerID} />;
}
