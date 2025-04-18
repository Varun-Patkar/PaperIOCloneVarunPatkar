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
  updatePersonalBest: () => void;
  setPlayerColor: (color: string) => void;
  startGame: () => void;
  goHome: () => void;
  updatePlayerPosition: (position: [number, number]) => void;
  updatePlayerDirection: (direction: [number, number]) => void;
  addToTrail: (position: [number, number]) => void;
  resetTrail: () => void;
  conquerTerritory: () => void;
  updatePersonalBestScore: (percentage: number) => void;
}

// GameEntity types moved from GameEntity.tsx
export interface GameEntityProps {
  name: string;
  color: string;
  position: [number, number];
  direction: [number, number];
  moveSpeed?: number;
  active?: boolean;
  onPositionUpdate?: (newPosition: [number, number]) => void;
  onDirectionUpdate?: (newDirection: [number, number]) => void;
  onTrailUpdate?: (position: [number, number]) => void;
  insideTerritoryCheck?: (position: [number, number]) => boolean;
}

export interface GameEntityWithTrailProps extends GameEntityProps {
  territory: [number, number][];
  trail: [number, number][];
  onConquerTerritory?: () => void;
  onResetTrail?: () => void;
  onSelfIntersection?: () => void; // Add this callback for handling self-intersection
}