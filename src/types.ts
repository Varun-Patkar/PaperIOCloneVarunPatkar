export interface PlayerState {
  name: string;
  color: string;
  position: [number, number];
  direction: [number, number];
  territory: [number, number][];
  trail: [number, number][];
}

export interface GameState {
  player: PlayerState;
  gameStarted: boolean;
  isGameOver: boolean;
  isVictory: boolean;
  personalBest: number;
  getTerritoryArea: () => number;
  getDisplayPercentage: () => number; // Returns scaled percentage (97% actual = 100% display)
  setGameOver: (isVictory?: boolean) => void;
  resetGame: () => void;
  setPlayerName: (name: string) => void;
  setPlayerColor: (color: string) => void;
  startGame: () => void;
  goHome: () => void;
  updatePlayerPosition: (position: [number, number]) => void;
  updatePlayerDirection: (direction: [number, number]) => void;
  addToTrail: (position: [number, number]) => void;
  resetTrail: () => void;
  conquerTerritory: () => void;
}