export interface PlayerState {
  name: string;
  color: string;
  position: [number, number];
  direction: [number, number];
  territory: [number, number][];
  trail: [number, number][];
  killCount: number; // Added
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
  isAlive: boolean; // Added: Tracks if the bot is active
  killCount: number; // Added
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
  setGameOver: (isVictory?: boolean, killerId?: number | 'self') => void; // Added killerId
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
  killBot: (botId: number, killerId: number | 'player' | 'self') => void; // Added killBot action
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
  killCount: number; // Added
}

// Structure for passing trail info for collision checks
export interface OtherEntityTrail {
  id: number | 'player';
  trail: [number, number][];
}

// GameEntity types moved from GameEntity.tsx
export interface GameEntityProps {
  entityId: number | 'player'; // Added: Unique ID for collision logic
  isBot: boolean; // Added: Flag to differentiate player/bot behavior
  name: string;
  color: string;
  position: [number, number];
  direction: [number, number];
  moveSpeed?: number;
  active?: boolean;
  trail: [number, number][]; // Added: Pass trail for self-intersection check
  playerTrail?: [number, number][]; // Added: Player's trail (for bots)
  otherBots?: OtherEntityTrail[]; // Added: Other bots' trails
  onPositionUpdate?: (newPosition: [number, number]) => void;
  onDirectionUpdate?: (newDirection: [number, number]) => void;
  onTrailUpdate?: (position: [number, number]) => void; // For adding points to trail state
  insideTerritoryCheck?: (position: [number, number]) => boolean;
  // Collision Callbacks
  onSelfIntersection?: () => void; // Renamed for clarity
  onPlayerTrailCollision?: (killerBotId: number) => void; // Bot hits player trail
  onBotTrailCollision?: (killedBotId: number) => void; // Player hits bot trail
  onBotBotTrailCollision?: (killedBotId: number) => void; // Bot hits other bot trail
}

export interface GameEntityWithTrailProps extends Omit<GameEntityProps, 'trail'> { // Omit trail as it's passed down
  territory: [number, number][];
  trail: [number, number][]; // Keep trail here for territory/conquest logic
  onConquerTerritory?: () => void;
  onResetTrail?: () => void;
  // onSelfIntersection is now handled by GameEntity directly via props
}