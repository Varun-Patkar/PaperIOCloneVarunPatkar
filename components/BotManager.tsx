import React, { useRef, useEffect } from "react";
import { GameEntityWithTrail } from "./GameEntity";
import * as THREE from "three";
import { useGameStore } from "../store"; // Import store
import { BotState, OtherEntityTrail } from "../types"; // Import types

// Bot manager props
interface BotManagerProps {
	gameStarted: boolean;
	isGameOver: boolean;
}

// Helper function to check if a point is in a polygon (can be moved to utils)
const isPointInPolygon = (
	point: [number, number],
	polygon: [number, number][]
): boolean => {
	if (!polygon || polygon.length < 3) return false;
	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const xi = polygon[i][0],
			yi = polygon[i][1];
		const xj = polygon[j][0],
			yj = polygon[j][1];
		const intersect =
			yi > point[1] !== yj > point[1] &&
			point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
		if (intersect) inside = !inside;
	}
	return inside;
};

export const BotManager: React.FC<BotManagerProps> = ({
	gameStarted,
	isGameOver,
}) => {
	// Get bots and actions from the store
	const bots = useGameStore((state) => state.bots);
	const player = useGameStore((state) => state.player); // Get player state for trail
	const updateBotState = useGameStore((state) => state.updateBotState);
	const addBotToTrail = useGameStore((state) => state.addBotToTrail);
	const resetBotTrail = useGameStore((state) => state.resetBotTrail);
	const conquerBotTerritory = useGameStore(
		(state) => state.conquerBotTerritory
	);
	const killBot = useGameStore((state) => state.killBot); // Action to kill a bot
	const setGameOver = useGameStore((state) => state.setGameOver); // Action for player death

	// Refs for each bot entity (optional, depends if direct manipulation is needed)
	const botRefs = useRef<(THREE.Group | null)[]>([]);
	useEffect(() => {
		// Adjust refs array size based on *alive* bots if filtering happens before mapping
		botRefs.current = bots.filter((b) => b.isAlive).map(() => null);
	}, [bots]); // Re-evaluate when bots array changes (e.g., a bot dies)

	// Bot update logic (decision making) - runs locally but updates store
	useEffect(() => {
		if (!gameStarted || isGameOver) return;

		const botUpdateInterval = setInterval(() => {
			bots.forEach((bot) => {
				// Simple AI: Change direction randomly sometimes or when near edge
				let newDirection = [...bot.direction] as [number, number];
				const changeDirection = Math.random() < 0.02; // 2% chance each interval

				// Check map boundary (adjust radius slightly)
				const nextPotentialX = bot.position[0] + bot.direction[0] * 0.5; // Look ahead slightly
				const nextPotentialZ = bot.position[1] + bot.direction[1] * 0.5;
				const distance = Math.sqrt(nextPotentialX ** 2 + nextPotentialZ ** 2);

				if (distance > 48 || changeDirection) {
					// Turn randomly (e.g., 90 degrees left or right)
					const turnRight = Math.random() > 0.5;
					if (turnRight) {
						newDirection = [bot.direction[1], -bot.direction[0]];
					} else {
						newDirection = [-bot.direction[1], bot.direction[0]];
					}
				}

				// Update direction in the store if it changed
				if (
					newDirection[0] !== bot.direction[0] ||
					newDirection[1] !== bot.direction[1]
				) {
					updateBotState(bot.id, { direction: newDirection });
				}

				// Note: Actual position update is handled by GameEntity via onPositionUpdate prop
				// which calls the updateBotState action below.
			});
		}, 200); // Update AI decision logic less frequently than movement

		return () => clearInterval(botUpdateInterval);
	}, [gameStarted, isGameOver, bots, updateBotState]); // Depend on bots array

	// Helper function to check if a point is in the bot's territory (uses store data)
	const isPointInBotTerritory = (
		botId: number,
		point: [number, number]
	): boolean => {
		// Find bot, ensuring it exists and is alive might be good practice
		const bot = bots.find((b) => b.id === botId && b.isAlive);
		return bot ? isPointInPolygon(point, bot.territory) : false;
	};

	// Update position function for bots (updates store)
	const handlePositionUpdate = (
		botId: number,
		newPosition: [number, number]
	) => {
		updateBotState(botId, { position: newPosition });
	};

	// Update direction function for bots (updates store)
	const handleDirectionUpdate = (
		botId: number,
		newDirection: [number, number]
	) => {
		updateBotState(botId, { direction: newDirection });
	};

	// Add to trail function for bots (updates store)
	const handleTrailUpdate = (botId: number, position: [number, number]) => {
		addBotToTrail(botId, position);
	};

	// Reset trail function for bots (updates store)
	const handleResetTrail = (botId: number) => {
		resetBotTrail(botId);
	};

	// "Conquer territory" function for bots (updates store)
	const handleConquerTerritory = (botId: number) => {
		conquerBotTerritory(botId);
	};

	// --- Collision Handlers for Bots ---

	// Bot hits its own trail
	const handleSelfIntersection = (botId: number) => {
		// console.log(`Bot ${botId} detected self-intersection via handler.`);
		killBot(botId, "self"); // Bot kills itself
	};

	// Bot hits player's trail
	const handlePlayerTrailCollision = (killerBotId: number) => {
		// console.log(`Bot ${killerBotId} hit player trail via handler.`);
		setGameOver(false, killerBotId); // Player dies, killed by this bot
	};

	// Bot hits another bot's trail
	const handleBotBotTrailCollision = (botId: number, killedBotId: number) => {
		// console.log(`Bot ${botId} hit bot ${killedBotId}'s trail via handler.`);
		killBot(killedBotId, botId); // Kill the other bot, this bot is the killer
	};

	// Prepare data for collision checks
	const aliveBots = bots.filter((b) => b.isAlive);
	const playerTrailData = player.trail;

	return (
		<>
			{aliveBots.map((bot, index) => {
				// Prepare trails of other alive bots for this specific bot
				const otherAliveBotsData: OtherEntityTrail[] = aliveBots
					.filter((otherBot) => otherBot.id !== bot.id) // Exclude self
					.map((otherBot) => ({ id: otherBot.id, trail: otherBot.trail }));

				return (
					<GameEntityWithTrail
						key={bot.id}
						ref={(el) => {
							if (el) botRefs.current[index] = el;
						}}
						// Entity Identification
						entityId={bot.id}
						isBot={true}
						// Basic Props
						name={bot.name}
						color={bot.color}
						position={bot.position}
						direction={bot.direction}
						territory={bot.territory}
						trail={bot.trail} // Pass trail for conquest logic & visualization
						active={gameStarted && !isGameOver && bot.isAlive} // Bot must be alive
						moveSpeed={6.0} // Bots slightly slower
						// State Update Callbacks
						onPositionUpdate={(pos) => handlePositionUpdate(bot.id, pos)}
						onDirectionUpdate={(dir) => handleDirectionUpdate(bot.id, dir)}
						onTrailUpdate={(pos) => handleTrailUpdate(bot.id, pos)} // For conquest logic
						onConquerTerritory={() => handleConquerTerritory(bot.id)}
						onResetTrail={() => handleResetTrail(bot.id)}
						insideTerritoryCheck={(pos) => isPointInBotTerritory(bot.id, pos)}
						// Collision Data Props
						playerTrail={playerTrailData}
						otherBots={otherAliveBotsData}
						// Collision Callback Props
						onSelfIntersection={() => handleSelfIntersection(bot.id)}
						onPlayerTrailCollision={handlePlayerTrailCollision} // Player dies
						onBotBotTrailCollision={(killedId) =>
							handleBotBotTrailCollision(bot.id, killedId)
						} // Another bot dies
						// onBotTrailCollision is not needed for bots (they don't kill bots by hitting their trail in this logic)
					/>
				);
			})}
		</>
	);
};
