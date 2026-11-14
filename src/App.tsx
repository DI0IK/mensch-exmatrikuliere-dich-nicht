import { GAME_COLLECTION } from './games/registry';
import { GameCollection } from './shared/collection/GameCollection';

export function App() {
  return <GameCollection games={GAME_COLLECTION} />;
}

export default App;
