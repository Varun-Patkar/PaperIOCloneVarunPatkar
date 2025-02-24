import React from 'react';
import { Game } from './components/Game';
import { StartScreen } from './components/StartScreen';
import { useGameStore } from './store';

function App() {
  const gameStarted = useGameStore((state) => state.gameStarted);

  return (
    <div className="w-full h-screen">
      {gameStarted ? <Game /> : <StartScreen />}
    </div>
  );
}

export default App;