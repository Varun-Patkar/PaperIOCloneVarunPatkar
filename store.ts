import { create } from 'zustand';
import { GameState, PlayerState } from './types';
import * as martinez from 'martinez-polygon-clipping';
const MAX_TERRITORY_PERCENTAGE = 97;
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

const initialPlayerState: PlayerState = {
  name: '',
  color: '#ff0000',
  position: [0, 0], // Initial center position
  direction: [1, 0],
  territory: createCircleTerritory(5, [0, 0]), // Create territory at center
  trail: [],
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
export const useGameStore = create<GameState>((set, get) => ({
  player: initialPlayerState,
  gameStarted: false,
  isGameOver: false,
  isVictory: false,      // Add this
  personalBest: 0,       // Add this
  getTerritoryArea: () => {
    const state = get();
    const closedTerritory = closePolygon([...state.player.territory]);
    return calculatePolygonArea(closedTerritory);
  },

  getDisplayPercentage: () => {
    const state = get();
    const totalGameArea = Math.PI * 50 * 50;
    const actualPercentage = (state.getTerritoryArea() / totalGameArea) * 100;

    // Scale so that 97% actual = 100% display
    const scaledPercentage = (actualPercentage / MAX_TERRITORY_PERCENTAGE) * 100;
    const displayPercentage = Math.min(100, scaledPercentage);

    return displayPercentage;
  },

  // Add a separate method to update personal best
  updatePersonalBest: () => {
    const state = get();
    const currentPercentage = state.getDisplayPercentage();

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
  // Game over function
  setGameOver: (isVictory = false) =>
    set(state => {
      const totalGameArea = Math.PI * 50 * 50;
      const actualPercentage = (state.getTerritoryArea() / totalGameArea) * 100;

      return {
        isGameOver: true,
        isVictory,
        personalBest: Math.max(state.personalBest, actualPercentage)
      };
    }),
  // Reset game function  
  resetGame: () =>
    set(state => {
      // Define the center position (for the player, this is always [0,0])
      const centerPosition: [number, number] = [0, 0];

      return {
        player: {
          ...initialPlayerState,
          name: state.player.name,  // Preserve player name
          color: state.player.color,
          direction: [1, 0],
          trail: [],
          position: centerPosition, // Set position to center
          territory: createCircleTerritory(5, centerPosition) // Create territory at center
        },
        isGameOver: false,
        isVictory: false,
        personalBest: state.personalBest,
      };
    }),
  setPlayerName: (name) =>
    set((state) => ({ player: { ...state.player, name } })),
  setPlayerColor: (color) =>
    set((state) => ({ player: { ...state.player, color } })),
  startGame: () => set({ gameStarted: true }),
  updatePlayerPosition: (position) =>
    set((state) => ({ player: { ...state.player, position } })),
  updatePlayerDirection: (direction) =>
    set((state) => ({ player: { ...state.player, direction } })),
  addToTrail: (position) =>
    set((state) => ({
      player: { ...state.player, trail: [...state.player.trail, position] },
    })),
  resetTrail: () => {
    set((state) => ({
      player: {
        ...state.player,
        trail: state.player.trail.length > 0 ? [state.player.trail[state.player.trail.length - 1]] : [],
      },
    }));
  },
  conquerTerritory: () => {
    set((state) => {
      // If trail is too short, don't do anything
      if (state.player.trail.length <= 1) {
        return state;
      }

      try {
        // Get the territory and make sure it's closed
        const closedTerritory = closePolygon([...state.player.territory]);

        // Get the trail points
        const trail = [...state.player.trail];

        // Find insertion points in the territory for the trail endpoints
        const firstTrailPoint = trail[0];
        const lastTrailPoint = trail[trail.length - 1];

        // Find the closest territory points to trail endpoints
        // Without using KD-tree (which is causing issues)
        let startIdx = 0;
        let endIdx = 0;
        let minStartDist = Infinity;
        let minEndDist = Infinity;

        // Find closest points by simple loop
        for (let i = 0; i < closedTerritory.length; i++) {
          const tPoint = closedTerritory[i];

          // Distance to first trail point
          const distToStart = Math.pow(tPoint[0] - firstTrailPoint[0], 2) +
            Math.pow(tPoint[1] - firstTrailPoint[1], 2);
          if (distToStart < minStartDist) {
            minStartDist = distToStart;
            startIdx = i;
          }

          // Distance to last trail point
          const distToEnd = Math.pow(tPoint[0] - lastTrailPoint[0], 2) +
            Math.pow(tPoint[1] - lastTrailPoint[1], 2);
          if (distToEnd < minEndDist) {
            minEndDist = distToEnd;
            endIdx = i;
          }
        }

        // Ensure proper ordering
        if (startIdx > endIdx) {
          // Swap if needed
          [startIdx, endIdx] = [endIdx, startIdx];
        }

        // Create a new boundary by taking:
        // - territory points from 0 to startIdx
        // - then the entire trail
        // - then territory points from endIdx to end
        const newBoundary = [
          ...closedTerritory.slice(0, startIdx + 1),
          ...trail,
          ...closedTerritory.slice(endIdx)
        ];

        const closedNewBoundary = closePolygon(newBoundary);

        // Compute union of original territory and new boundary
        // Convert to martinez format (array of arrays for polygons with holes)
        const territoryPolygon = [closedTerritory];
        const newBoundaryPolygon = [closedNewBoundary];

        const unionResult = martinez.union(territoryPolygon, newBoundaryPolygon);

        // Handle the result
        // Fix for the mergedPolygon assignment and type issues

        // In the conquerTerritory function where you handle unionResult:
        let mergedPolygon: [number, number][] = [];

        if (!unionResult || unionResult.length === 0) {
          // Fallback to new boundary if union fails
          mergedPolygon = closedNewBoundary;
        } else if (unionResult.length === 1 && unionResult[0].length === 1) {
          // Single polygon without holes
          // Ensure proper type conversion for each point
          mergedPolygon = unionResult[0][0].map((point: any): [number, number] => {
            // Ensure point is in the correct format [number, number]
            if (Array.isArray(point) && point.length >= 2) {
              return [point[0], point[1]];
            }
            // Handle unexpected format - return a safe default
            console.warn('Unexpected point format in polygon result', point);
            return [0, 0];
          });
        } else {
          // For multi-polygons, choose the one containing the original centroid
          const centroid = computeCentroid(closedTerritory);
          let foundPolygon = false;

          for (const poly of unionResult) {
            // Each poly may be an array (outer ring + holes)
            if (poly[0]) {
              const outerRing = poly[0].map((point: any): [number, number] => {
                if (Array.isArray(point) && point.length >= 2) {
                  return [point[0], point[1]];
                }
                return [0, 0];
              });

              if (pointInPolygon(centroid, outerRing)) {
                mergedPolygon = outerRing;
                foundPolygon = true;
                break;
              }
            }
          }

          if (!foundPolygon) {
            // Just take the first polygon if we can't find one with the centroid
            if (unionResult[0]?.[0]) {
              mergedPolygon = unionResult[0][0].map((point: any): [number, number] => {
                if (Array.isArray(point) && point.length >= 2) {
                  return [point[0], point[1]];
                }
                return [0, 0];
              });
            } else {
              // Ultimate fallback
              mergedPolygon = closedTerritory;
            }
          }
        }

        // Return the updated state with new territory
        return {
          player: {
            ...state.player,
            territory: mergedPolygon || closedTerritory, // Fallback to original if all else fails
            trail: [], // Clear the trail after conquest
          },
        };
      } catch (error) {
        console.error("Error conquering territory:", error);
        return state;
      }
    });
  }
}));