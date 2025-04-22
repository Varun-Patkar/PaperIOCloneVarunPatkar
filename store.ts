import { create } from 'zustand';
import { GameState, PlayerState, BotState, LeaderboardEntry } from './types';
import * as martinez from 'martinez-polygon-clipping';
import gameConfig from './config.json'; // Import config
import { colorManager } from './ColorManager'; // Import color manager

const MAX_TERRITORY_PERCENTAGE = 97;
const MAP_RADIUS = 50;
const TOTAL_GAME_AREA = Math.PI * MAP_RADIUS * MAP_RADIUS;

// List of common names for bots
const BOT_NAMES = [
  "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Skyler",
  "Quinn", "Drew", "Cameron", "Avery", "Dakota", "Kai", "Remi", "Rowan",
  "Charlie", "Finley", "Emerson", "Sawyer", "Harper", "Parker", "Reese", "Sage",
  "Blake", "Peyton", "River", "Phoenix", "Logan", "Elliot", "Hayden", "Ashton"
];

// Helper to get a random subset of names
const getRandomNames = (count: number): string[] => {
  const shuffled = [...BOT_NAMES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};


// Helper function to create a circle of points
const createCircleTerritory = (
  radius: number,
  center: [number, number] = [0, 0],
  numPoints: number = 128
): [number, number][] => {
  const points: [number, number][] = [];
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    points.push([
      center[0] + Math.cos(angle) * radius, // X coordinate with center offset
      center[1] + Math.sin(angle) * radius  // Z coordinate with center offset
    ]);
  }
  return points;
};

// Helper function to ensure polygon is closed (first point = last point)
const closePolygon = (points: [number, number][]): [number, number][] => {
  if (points.length < 3) return points;

  const first = points[0];
  const last = points[points.length - 1];

  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...points, [first[0], first[1]]];
  }
  return points;
};

// Helper function to compute centroid of a polygon
const computeCentroid = (points: [number, number][]): [number, number] => {
  let x = 0, y = 0;
  for (const [px, py] of points) {
    x += px;
    y += py;
  }
  return [x / points.length, y / points.length];
};

// Point-in-polygon test using ray casting
const pointInPolygon = (point: [number, number], polygon: [number, number][]): boolean => {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

// Add this helper function for area calculation
const calculatePolygonArea = (points: [number, number][]): number => {
  if (points.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][0] * points[j][1];
    area -= points[j][0] * points[i][1];
  }

  return Math.abs(area) / 2;
};

// Add distance squared helper
const distanceSq = (p1: [number, number], p2: [number, number]): number => {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return dx * dx + dy * dy;
};

// Polygon simplification helper
const SIMPLIFICATION_THRESHOLD_SQ = 0.1 * 0.1; // Square of the distance threshold (adjust as needed)

const simplifyPolygon = (points: [number, number][]): [number, number][] => {
  if (points.length < 4) return points; // Need at least 3 points + closing point

  const simplified: [number, number][] = [points[0]]; // Start with the first point

  for (let i = 1; i < points.length - 1; i++) { // Iterate up to the second-to-last point
    const lastAdded = simplified[simplified.length - 1];
    const current = points[i];

    if (distanceSq(lastAdded, current) > SIMPLIFICATION_THRESHOLD_SQ) {
      simplified.push(current);
    }
    // Else: Skip the current point as it's too close to the last added one
  }

  // Handle the closing point: Check distance between the last added point and the original first point
  const lastAdded = simplified[simplified.length - 1];
  const firstPoint = points[0];
  if (distanceSq(lastAdded, firstPoint) > SIMPLIFICATION_THRESHOLD_SQ) {
    // If the last added point is far from the first point, add the first point to close it
    simplified.push(firstPoint);
  } else {
    // If the last added point is close to the first point, replace the last added point with the first point
    // This ensures exact closure without a tiny segment
    simplified[simplified.length - 1] = firstPoint;
  }

  // Final check: Ensure at least 3 unique points remain for a valid polygon
  if (simplified.length < 4 && simplified.length > 0) { // Check for < 4 because of closing point
    // If simplification resulted in too few points, return original (or handle differently)
    console.warn("Simplification resulted in too few points, returning original polygon.");
    return closePolygon(points); // Return original, ensuring it's closed
  }


  return simplified;
};

// Chaikin's corner-cutting algorithm for smoothing
const smoothPolygon = (points: [number, number][], iterations: number = 1): [number, number][] => {
  if (points.length < 3 || iterations < 1) return points;

  let currentPoints = points;

  for (let iter = 0; iter < iterations; iter++) {
    const newPoints: [number, number][] = [];
    if (currentPoints.length < 3) break; // Stop if polygon degenerates

    // Ensure the polygon is explicitly closed for iteration logic
    const closedPoints = closePolygon(currentPoints);

    for (let i = 0; i < closedPoints.length - 1; i++) { // Iterate up to the second-to-last point
      const p1 = closedPoints[i];
      const p2 = closedPoints[i + 1];

      // Calculate the two new points for the segment (p1, p2)
      // Q = 3/4 p1 + 1/4 p2
      const q: [number, number] = [
        0.75 * p1[0] + 0.25 * p2[0],
        0.75 * p1[1] + 0.25 * p2[1],
      ];
      // R = 1/4 p1 + 3/4 p2
      const r: [number, number] = [
        0.25 * p1[0] + 0.75 * p2[0],
        0.25 * p1[1] + 0.75 * p2[1],
      ];

      newPoints.push(q, r);
    }
    currentPoints = newPoints; // Update points for the next iteration
  }

  return closePolygon(currentPoints); // Ensure the final result is closed
};

const initialPlayerState: PlayerState = {
  name: '',
  color: gameConfig.colors.playerDefault, // Use default from config
  position: [0, 0], // Initial center position
  direction: [1, 0],
  territory: createCircleTerritory(5, [0, 0]), // Create territory at center
  trail: [],
  killCount: 0, // Added
};

// Define the initial bot configurations outside so it can be reused
// Remove color here, it will be assigned by ColorManager
const initialBotConfigs = [
  { center: [25, 25] as [number, number] },
  { center: [-25, -25] as [number, number] },
  { center: [25, -25] as [number, number] },
  { center: [-25, 25] as [number, number] },
];


export const useGameStore = create<GameState>((set, get) => ({
  player: initialPlayerState,
  bots: [], // Initialize bots array
  gameStarted: false,
  isGameOver: false,
  isVictory: false,
  personalBest: 0,

  // Modified to handle player or bot ID
  getTerritoryArea: (entityId: number | 'player' = 'player') => {
    const state = get();
    let territory: [number, number][] = [];
    if (entityId === 'player') {
      territory = state.player.territory;
    } else {
      const bot = state.bots.find(b => b.id === entityId);
      territory = bot ? bot.territory : [];
    }
    const closedTerritory = closePolygon([...territory]);
    return calculatePolygonArea(closedTerritory);
  },

  // Modified to handle player or bot ID
  getDisplayPercentage: (entityId: number | 'player' = 'player') => {
    const state = get();
    const area = state.getTerritoryArea(entityId);
    const actualPercentage = (area / TOTAL_GAME_AREA) * 100;
    const scaledPercentage = (actualPercentage / MAX_TERRITORY_PERCENTAGE) * 100;
    const displayPercentage = Math.min(100, scaledPercentage);
    return displayPercentage;
  },

  // Leaderboard Data Selector
  getLeaderboardData: () => {
    const state = get();
    const leaderboard: LeaderboardEntry[] = [];

    // Add player
    leaderboard.push({
      id: 'player',
      name: state.player.name || "You",
      color: state.player.color,
      percentage: state.getDisplayPercentage('player'),
      isPlayer: true,
      killCount: state.player.killCount, // Added
    });

    // Add ALIVE bots
    state.bots.forEach(bot => {
      if (bot.isAlive) { // Only include alive bots
        leaderboard.push({
          id: bot.id,
          name: bot.name,
          color: bot.color,
          percentage: state.getDisplayPercentage(bot.id),
          isPlayer: false,
          killCount: bot.killCount, // Added
        });
      }
    });

    // Sort: Descending percentage, player first in case of tie
    leaderboard.sort((a, b) => {
      if (b.percentage !== a.percentage) {
        return b.percentage - a.percentage;
      }
      // If percentages are equal, player comes first
      return a.isPlayer ? -1 : b.isPlayer ? 1 : 0;
    });

    return leaderboard;
  },


  // Add a separate method to update personal best
  updatePersonalBest: () => {
    const state = get();
    const currentPercentage = state.getDisplayPercentage('player');

    if (currentPercentage > state.personalBest) {
      set({ personalBest: currentPercentage });
    }
  },

  updatePersonalBestScore: (percentage: number) => {
    const state = get();

    set({ personalBest: percentage });
  },

  // Fix the goHome method
  goHome: () => {
    set({ gameStarted: false, isGameOver: false });
    get().resetGame(); // Use get() to access the method properly
  },
  // Game over function - accepts killer ID
  setGameOver: (isVictory = false, killerId: number | 'self' | undefined = undefined) =>
    set(state => {
      // Update personal best based on player's final percentage
      const playerPercentage = state.getDisplayPercentage('player');
      const newPersonalBest = Math.max(state.personalBest, playerPercentage);

      // If player was killed by a bot, increment that bot's kill count
      if (!isVictory && typeof killerId === 'number') {
        const killerBotIndex = state.bots.findIndex(b => b.id === killerId);
        if (killerBotIndex !== -1) {
          const bots = [...state.bots];
          bots[killerBotIndex] = {
            ...bots[killerBotIndex],
            killCount: bots[killerBotIndex].killCount + 1,
          };
          return {
            isGameOver: true,
            isVictory: false, // Ensure victory is false if killed
            personalBest: newPersonalBest,
            bots: bots, // Update bots state with incremented kill count
          };
        }
      }

      // Handle self-kill or victory
      return {
        isGameOver: true,
        isVictory,
        personalBest: newPersonalBest // Update PB on game over
      };
    }),
  // Reset game function
  resetGame: () =>
    set(state => {
      const centerPosition: [number, number] = [0, 0];
      // Preserve PB across resets
      const currentPersonalBest = state.personalBest;
      colorManager.reset(); // Reset color assignments
      colorManager.setPlayerColor(state.player.color); // Re-apply player color constraint

      // Re-initialize bots using configs without color
      get().initializeBots(initialBotConfigs.map(cfg => ({ center: cfg.center })));

      return {
        player: {
          ...initialPlayerState,
          name: state.player.name,
          color: state.player.color, // Keep player's chosen color
          direction: [1, 0],
          trail: [],
          position: centerPosition,
          territory: createCircleTerritory(5, centerPosition),
          killCount: 0, // Reset kill count
        },
        // Bots are handled by initializeBots above (which resets their state including killCount and isAlive)
        isGameOver: false,
        isVictory: false,
        personalBest: currentPersonalBest, // Keep the existing personal best
      };
    }),
  setPlayerName: (name) =>
    set((state) => ({ player: { ...state.player, name } })),
  setPlayerColor: (color) => {
    colorManager.setPlayerColor(color); // Inform color manager
    set((state) => ({ player: { ...state.player, color } }));
    // Optional: If bots are already initialized, check if any bot has the new player color and reassign
    // This adds complexity, might be simpler to rely on reset/start game for color changes.
  },
  startGame: () => {
    colorManager.reset(); // Reset colors on new game start
    colorManager.setPlayerColor(get().player.color); // Set player color constraint
    // Initialize bots using configs without color
    get().initializeBots(initialBotConfigs.map(cfg => ({ center: cfg.center })));
    set({ gameStarted: true, isGameOver: false, isVictory: false });
  },

  // Player Actions
  updatePlayerPosition: (position) =>
    set((state) => ({ player: { ...state.player, position } })),
  updatePlayerDirection: (direction) =>
    set((state) => ({ player: { ...state.player, direction } })),
  addPlayerToTrail: (position) =>
    set((state) => ({
      player: { ...state.player, trail: [...state.player.trail, position] },
    })),

  // Update resetPlayerTrail to clear completely
  resetPlayerTrail: () => {
    set((state) => ({
      player: {
        ...state.player,
        trail: [], // Clear the trail completely
      },
    }));
  },

  // Updated conquerPlayerTerritory logic with area check and smoothing
  conquerPlayerTerritory: () => {
    set((state) => {
      if (state.player.trail.length < 3) {
        console.log("Player trail too short to conquer.");
        return { player: { ...state.player, trail: [] } };
      }

      try {
        const currentTerritory = closePolygon([...state.player.territory]);
        const currentArea = calculatePolygonArea(currentTerritory); // Calculate current area

        const trailPoints = [...state.player.trail];
        const closedTrailPoints = [...trailPoints, trailPoints[0]];

        // Correct type: MultiPolygon (Polygon[]) which is Position[][][]
        const territoryMultiPolygon: martinez.MultiPolygon = [[currentTerritory.map(p => [Number(p[0]), Number(p[1])])]];
        if (closedTrailPoints.some(p => p === undefined || p.length !== 2 || isNaN(p[0]) || isNaN(p[1]))) {
          console.warn("Invalid points in player trail:", trailPoints);
          return { player: { ...state.player, trail: [] } };
        }
        // Correct type: MultiPolygon (Polygon[]) which is Position[][][]
        const trailMultiPolygon: martinez.MultiPolygon = [[closedTrailPoints.map(p => [Number(p[0]), Number(p[1])])]];

        const unionResult = martinez.union(territoryMultiPolygon, trailMultiPolygon);

        let rawMergedPolygon: [number, number][] = currentTerritory; // Default

        if (unionResult && unionResult.length > 0 && unionResult[0].length > 0) {
          let largestArea = 0;
          let largestPolygon: martinez.Position[] | null = null;
          unionResult.forEach(polygon => {
            polygon.forEach((ring, ringIndex) => {
              if (ringIndex === 0) {
                const area = calculatePolygonArea(ring);
                if (area > largestArea) {
                  largestArea = area;
                  largestPolygon = ring;
                }
              }
            });
          });

          if (largestPolygon) {
            rawMergedPolygon = largestPolygon.map(p => [p[0], p[1]]);
          } else {
            console.warn("Martinez union resulted in valid structure but no largest polygon found for player?", unionResult);
            rawMergedPolygon = currentTerritory; // Fallback
          }
        } else {
          console.warn("Martinez union failed or returned empty result for player. Trail:", trailPoints);
          rawMergedPolygon = currentTerritory; // Fallback
        }

        const closedRawPolygon = closePolygon(rawMergedPolygon);
        const simplifiedMergedPolygon = simplifyPolygon(closedRawPolygon);
        const SMOOTHING_ITERATIONS = 2;
        const smoothedPolygon = smoothPolygon(simplifiedMergedPolygon, SMOOTHING_ITERATIONS);

        const finalTerritory = smoothedPolygon;
        const newArea = calculatePolygonArea(finalTerritory);

        // --- Area Check ---
        if (newArea > currentArea) {
          // console.log(`Player conquered new area: ${newArea.toFixed(1)} (was ${currentArea.toFixed(1)})`);
          // Check for victory
          const actualPercentage = (newArea / TOTAL_GAME_AREA) * 100;
          if (actualPercentage >= MAX_TERRITORY_PERCENTAGE) {
            get().setGameOver(true); // Player wins
          }

          return {
            player: {
              ...state.player,
              territory: finalTerritory, // Update with the new, larger territory
              trail: [],
            },
          };
        } else {
          // console.log(`Player conquest resulted in smaller/equal area (${newArea.toFixed(1)} <= ${currentArea.toFixed(1)}). Resetting trail.`);
          // Area did not increase, just reset the trail
          return {
            player: {
              ...state.player,
              trail: [],
            },
          };
        }
      } catch (error) {
        console.error("Error during player territory conquest:", error);
        return {
          player: {
            ...state.player,
            trail: [],
          }
        };
      }
    });
    get().updatePersonalBest(); // Update PB regardless of whether territory grew (might have reached 100%)
  },

  // Bot Actions
  initializeBots: (botConfigs) => { // Config now only expects 'center'
    const botNames = getRandomNames(botConfigs.length);
    const bots = botConfigs.map((config, index) => {
      const territory = createCircleTerritory(5, config.center);
      const botColor = colorManager.getBotColor() || '#888888'; // Get unique color or fallback gray

      return {
        id: index + 1,
        name: botNames[index] || `Bot ${index + 1}`,
        color: botColor, // Use assigned unique color
        position: [...config.center] as [number, number],
        direction: [Math.random() > 0.5 ? 1 : -1, Math.random() > 0.5 ? 1 : -1].map(d => d * (Math.random() * 0.5 + 0.5)) as [number, number],
        territory: territory,
        trail: [],
        territoryArea: calculatePolygonArea(territory),
        isAlive: true, // Initialize as alive
        killCount: 0, // Initialize kill count
      };
    });
    set({ bots });
  },

  updateBotState: (botId, updates) => {
    set((state) => ({
      bots: state.bots.map(bot =>
        bot.id === botId ? { ...bot, ...updates } : bot
      ),
    }));
  },

  // This function is no longer called by resetGame, but kept for potential other uses
  resetBots: () => {
    console.log("resetBots called - full reset handled by initializeBots via resetGame");
    // If needed, could implement logic to release colors via colorManager.releaseBotColor(bot.color)
    // before resetting state, but initializeBots is cleaner for full reset.
    set({ bots: [] }); // Simple clear if called directly
  },

  addBotToTrail: (botId, position) => {
    set((state) => ({
      bots: state.bots.map(bot =>
        // Correctly spread the bot object and update the trail
        bot.id === botId ? { ...bot, trail: [...bot.trail, position] } : bot
      ),
    }));
  },

  // Update resetBotTrail to clear completely
  resetBotTrail: (botId) => {
    set((state) => ({
      bots: state.bots.map(bot => {
        if (bot.id !== botId) return bot;
        // Clear the trail completely
        return { ...bot, trail: [] };
      }),
    }));
  },

  // Updated conquerBotTerritory with full logic and area check
  conquerBotTerritory: (botId) => {
    set((state) => {
      const botIndex = state.bots.findIndex(b => b.id === botId);
      if (botIndex === -1 || !state.bots[botIndex].isAlive) {
        return {}; // Bot not found or dead
      }

      const bot = state.bots[botIndex];
      if (bot.trail.length < 3) {
        // console.log(`Bot ${botId} trail too short to conquer.`);
        // Reset trail only
        const updatedBots = [...state.bots];
        updatedBots[botIndex] = { ...bot, trail: [] };
        return { bots: updatedBots };
      }

      try {
        const currentTerritory = closePolygon([...bot.territory]);
        const currentArea = calculatePolygonArea(currentTerritory); // Calculate current area

        const trailPoints = [...bot.trail];
        const closedTrailPoints = [...trailPoints, trailPoints[0]];

        const territoryMultiPolygon: martinez.MultiPolygon = [[currentTerritory.map(p => [Number(p[0]), Number(p[1])])]];
        if (closedTrailPoints.some(p => p === undefined || p.length !== 2 || isNaN(p[0]) || isNaN(p[1]))) {
          console.warn(`Invalid points in bot ${botId} trail:`, trailPoints);
          // Reset trail only
          const updatedBots = [...state.bots];
          updatedBots[botIndex] = { ...bot, trail: [] };
          return { bots: updatedBots };
        }
        const trailMultiPolygon: martinez.MultiPolygon = [[closedTrailPoints.map(p => [Number(p[0]), Number(p[1])])]];

        const unionResult = martinez.union(territoryMultiPolygon, trailMultiPolygon);

        let rawMergedPolygon: [number, number][] = currentTerritory; // Default

        if (unionResult && unionResult.length > 0 && unionResult[0].length > 0) {
          let largestArea = 0;
          let largestPolygon: martinez.Position[] | null = null;
          unionResult.forEach(polygon => {
            polygon.forEach((ring, ringIndex) => {
              if (ringIndex === 0) {
                const area = calculatePolygonArea(ring);
                if (area > largestArea) {
                  largestArea = area;
                  largestPolygon = ring;
                }
              }
            });
          });

          if (largestPolygon) {
            rawMergedPolygon = largestPolygon.map(p => [p[0], p[1]]);
          } else {
            console.warn(`Martinez union resulted in valid structure but no largest polygon found for bot ${botId}?`, unionResult);
            rawMergedPolygon = currentTerritory; // Fallback
          }
        } else {
          console.warn(`Martinez union failed or returned empty result for bot ${botId}. Trail:`, trailPoints);
          rawMergedPolygon = currentTerritory; // Fallback
        }

        const closedRawPolygon = closePolygon(rawMergedPolygon);
        const simplifiedMergedPolygon = simplifyPolygon(closedRawPolygon);
        const SMOOTHING_ITERATIONS = 2;
        const smoothedPolygon = smoothPolygon(simplifiedMergedPolygon, SMOOTHING_ITERATIONS);

        const finalTerritory = smoothedPolygon;
        const newArea = calculatePolygonArea(finalTerritory);

        const updatedBots = [...state.bots];

        // --- Area Check ---
        if (newArea > currentArea) {
          // console.log(`Bot ${botId} conquered new area: ${newArea.toFixed(1)} (was ${currentArea.toFixed(1)})`);
          // Check for bot victory (unlikely but possible)
          const actualPercentage = (newArea / TOTAL_GAME_AREA) * 100;
          if (actualPercentage >= MAX_TERRITORY_PERCENTAGE) {
            console.log(`Bot ${botId} achieved victory condition!`);
            // Decide how to handle bot victory (e.g., end game? declare bot winner?)
            // For now, just log it. A full implementation might need more state.
          }

          updatedBots[botIndex] = {
            ...bot,
            territory: finalTerritory, // Update territory
            territoryArea: newArea, // Update stored area
            trail: [], // Reset trail
          };
        } else {
          // console.log(`Bot ${botId} conquest resulted in smaller/equal area (${newArea.toFixed(1)} <= ${currentArea.toFixed(1)}). Resetting trail.`);
          // Area did not increase, just reset the trail
          updatedBots[botIndex] = { ...bot, trail: [] };
        }

        return { bots: updatedBots };

      } catch (error) {
        console.error(`Error during bot ${botId} territory conquest:`, error);
        // Reset trail only on error
        const updatedBots = [...state.bots];
        updatedBots[botIndex] = { ...bot, trail: [] };
        return { bots: updatedBots };
      }
    });
  },

  // New Action: Kill Bot
  killBot: (botId, killerId) => {
    set((state) => {
      const botIndex = state.bots.findIndex(b => b.id === botId);
      if (botIndex === -1 || !state.bots[botIndex].isAlive) {
        return {}; // Bot already dead or not found
      }

      const killedBot = state.bots[botIndex];
      colorManager.releaseBotColor(killedBot.color); // Release color

      const updatedBots = [...state.bots];
      updatedBots[botIndex] = { ...killedBot, isAlive: false, trail: [] }; // Mark as dead, clear trail

      let updatedPlayer = state.player;

      // Increment killer's score
      if (killerId === 'player') {
        updatedPlayer = { ...state.player, killCount: state.player.killCount + 1 };
      } else if (killerId !== 'self') { // Another bot killed this bot
        const killerBotIndex = updatedBots.findIndex(b => b.id === killerId && b.isAlive);
        if (killerBotIndex !== -1) {
          updatedBots[killerBotIndex] = {
            ...updatedBots[killerBotIndex],
            killCount: updatedBots[killerBotIndex].killCount + 1,
          };
        }
      }

      return { bots: updatedBots, player: updatedPlayer };
    });
  },

}));