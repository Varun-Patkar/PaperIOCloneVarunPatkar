export interface PlayerState {
  name: string;
  color: string;
  position: [number, number];
  direction: [number, number];
  territory: [number, number][];
  trail: [number, number][];
}

// Define BotState
export interface BotState {
  id: number;
  name: string;
  color: string;
  position: [number, number];
  direction: [number, number];
  territory: [number, number][];
  trail: [number, number][];
  territoryArea: number; // Add area for leaderboard calculation
}

export interface GameState {
  player: PlayerState;
  bots: BotState[]; // Add bots array
  gameStarted: boolean;
  isGameOver: boolean;
  isVictory: boolean;
  personalBest: number;
  getTerritoryArea: (entityId?: number | 'player') => number; // Modify to accept ID
  getDisplayPercentage: (entityId?: number | 'player') => number; // Modify to accept ID
  getLeaderboardData: () => LeaderboardEntry[]; // Add leaderboard selector
  setGameOver: (isVictory?: boolean) => void;
  resetGame: () => void;
  setPlayerName: (name: string) => void;
  updatePersonalBest: () => void;
  setPlayerColor: (color: string) => void;
  startGame: () => void;
  goHome: () => void;
  // Player specific actions
  updatePlayerPosition: (position: [number, number]) => void;
  updatePlayerDirection: (direction: [number, number]) => void;
  addPlayerToTrail: (position: [number, number]) => void;
  resetPlayerTrail: () => void;
  conquerPlayerTerritory: () => void;
  // Bot specific actions
  initializeBots: (botConfigs: { center: [number, number] }[]) => void; // Color removed from config
  updateBotState: (botId: number, updates: Partial<BotState>) => void;
  resetBots: () => void;
  addBotToTrail: (botId: number, position: [number, number]) => void;
  resetBotTrail: (botId: number) => void;
  conquerBotTerritory: (botId: number) => void; // Simplified conquer for bots
  // Generic actions (if needed, or keep specific)
  // updateEntityPosition: (id: number | 'player', position: [number, number]) => void;
  // updateEntityDirection: (id: number | 'player', direction: [number, number]) => void;
  // addToTrail: (id: number | 'player', position: [number, number]) => void;
  // resetTrail: (id: number | 'player') => void;
  // conquerTerritory: (id: number | 'player') => void;

  updatePersonalBestScore: (percentage: number) => void; // Keep this if used externally
}

// Leaderboard Entry Type
export interface LeaderboardEntry {
  id: number | 'player';
  name: string;
  color: string;
  percentage: number;
  isPlayer: boolean;
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