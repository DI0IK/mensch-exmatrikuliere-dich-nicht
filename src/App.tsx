import { useState } from 'react';
import { MednApp } from './games/medn/MednApp';
import MonopolyApp from './games/monopoly/MonopolyApp';

type ActiveGame = 'medn' | 'monopoly';

export function App() {
  const [activeGame, setActiveGame] = useState<ActiveGame>('medn');

  const gameSwitcher = (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        padding: '8px 12px 0',
        flexWrap: 'wrap',
      }}
    >
      <button
        type="button"
        className={`tactile-btn ${activeGame === 'medn' ? 'primary' : ''}`}
        onClick={() => setActiveGame('medn')}
        style={{ padding: '6px 14px', fontSize: '0.82rem' }}
      >
        🎲 Mensch exmatrikuliere dich nicht
      </button>
      <button
        type="button"
        className={`tactile-btn ${activeGame === 'monopoly' ? 'primary' : ''}`}
        onClick={() => setActiveGame('monopoly')}
        style={{ padding: '6px 14px', fontSize: '0.82rem' }}
      >
        🏛️ DHBW Karlsruhe Monopoly
      </button>
    </div>
  );

  if (activeGame === 'monopoly') {
    return <MonopolyApp gameSwitcher={gameSwitcher} />;
  }

  return <MednApp gameSwitcher={gameSwitcher} />;
}

export default App;
