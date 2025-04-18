import React, { useRef, useState, useEffect } from "react";
import { GameEntityWithTrail } from "./GameEntity";
import * as THREE from "three";

// Define bot state interface
interface BotState {
	id: number;
	name: string;
	color: string;
	position: [number, number];
	direction: [number, number];
	territory: [number, number][];
	trail: [number, number][];
}

// Define bot territory interface
interface BotTerritory {
	center: [number, number];
	color: string;
	name: string;
}

// Helper to create a circle territory with explicit center
const createCircleTerritory = (
	center: [number, number],
	radius: number,
	numPoints: number = 128
): [number, number][] => {
	const points: [number, number][] = [];
	for (let i = 0; i < numPoints; i++) {
		const angle = (i / numPoints) * Math.PI * 2;
		points.push([
			center[0] + Math.cos(angle) * radius, // X coordinate with center offset
			center[1] + Math.sin(angle) * radius, // Z coordinate with center offset
		]);
	}
	return points;
};

// Bot manager props
interface BotManagerProps {
	gameStarted: boolean;
	isGameOver: boolean;
}

export const BotManager: React.FC<BotManagerProps> = ({
	gameStarted,
	isGameOver,
}) => {
	// Bot territories defined by center positions with explicit typing
	const botTerritories: BotTerritory[] = [
		{
			center: [20, 20] as [number, number],
			color: "#3498db",
			name: "Blue Bot",
		},
		{
			center: [-20, -20] as [number, number],
			color: "#2ecc71",
			name: "Green Bot",
		},
	];

	// Reset bots whenever game starts
	useEffect(() => {
		if (gameStarted && !isGameOver) {
			// Reset bots to their initial positions when game starts
			setBots(
				botTerritories.map((bot, index) => ({
					id: index + 1,
					name: bot.name,
					color: bot.color,
					position: bot.center, // Make sure position matches center
					direction: [1, 0],
					territory: createCircleTerritory(bot.center, 5),
					trail: [] as [number, number][],
				}))
			);
		}
	}, [gameStarted, isGameOver]);

	// Initialize bots with starting positions at their territory centers
	const [bots, setBots] = useState<BotState[]>(
		botTerritories.map((bot, index) => ({
			id: index + 1,
			name: bot.name,
			color: bot.color,
			position: bot.center, // Set position to match territory center
			direction: [1, 0],
			territory: createCircleTerritory(bot.center, 5),
			trail: [] as [number, number][],
		}))
	);

	// Refs for each bot entity
	const botRefs = useRef<(THREE.Group | null)[]>([]);

	// Initialize refs array
	useEffect(() => {
		botRefs.current = bots.map(() => null);
	}, []);

	// Bot update logic
	useEffect(() => {
		if (!gameStarted || isGameOver) return;

		const botUpdateInterval = setInterval(() => {
			setBots((prevBots) => {
				return prevBots.map((bot) => {
					// Calculate new position based on direction
					const newPosition: [number, number] = [
						bot.position[0] + bot.direction[0] * 0.2, // Slower than player
						bot.position[1] + bot.direction[1] * 0.2,
					];

					// Check if we're at the edge of the map (radius 50)
					const distance = Math.sqrt(newPosition[0] ** 2 + newPosition[1] ** 2);
					if (distance > 48) {
						// Change to perpendicular direction (turn right)
						const newDir: [number, number] = [
							bot.direction[1],
							-bot.direction[0],
						];

						return {
							...bot,
							direction: newDir,
						};
					}

					// Update position
					return {
						...bot,
						position: newPosition,
					};
				});
			});
		}, 100); // Update every 100ms

		return () => clearInterval(botUpdateInterval);
	}, [gameStarted, isGameOver]);

	// Helper function to check if a point is in the bot's territory
	const isPointInTerritory = (
		botId: number,
		point: [number, number]
	): boolean => {
		const bot = bots.find((b) => b.id === botId);
		if (!bot || bot.territory.length < 3) return false;

		let inside = false;
		for (
			let i = 0, j = bot.territory.length - 1;
			i < bot.territory.length;
			j = i++
		) {
			const xi = bot.territory[i][0],
				yi = bot.territory[i][1];
			const xj = bot.territory[j][0],
				yj = bot.territory[j][1];

			const intersect =
				yi > point[1] !== yj > point[1] &&
				point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;

			if (intersect) inside = !inside;
		}
		return inside;
	};

	// Update position function for bots
	const updateBotPosition = (botId: number, newPosition: [number, number]) => {
		setBots((prevBots) =>
			prevBots.map((bot) =>
				bot.id === botId ? { ...bot, position: newPosition } : bot
			)
		);
	};

	// Update direction function for bots
	const updateBotDirection = (
		botId: number,
		newDirection: [number, number]
	) => {
		setBots((prevBots) =>
			prevBots.map((bot) =>
				bot.id === botId ? { ...bot, direction: newDirection } : bot
			)
		);
	};

	// Add to trail function for bots
	const addToTrail = (botId: number, position: [number, number]) => {
		setBots((prevBots) =>
			prevBots.map((bot) =>
				bot.id === botId ? { ...bot, trail: [...bot.trail, position] } : bot
			)
		);
	};

	// Reset trail function for bots
	const resetTrail = (botId: number) => {
		setBots((prevBots) =>
			prevBots.map((bot) => {
				if (bot.id !== botId) return bot;
				return {
					...bot,
					trail: bot.trail.length > 0 ? [bot.trail[bot.trail.length - 1]] : [],
				};
			})
		);
	};

	// "Conquer territory" function - a simplified version for bots
	const conquerTerritory = (botId: number) => {
		// For now, just reset the trail when a bot would conquer territory
		resetTrail(botId);
	};

	// Add a hidden div with bot data for minimap to pick up
	useEffect(() => {
		// Create hidden elements with bot data for the minimap
		const cleanup = () => {
			// Remove any existing bot data elements
			document.querySelectorAll("[data-bot-id]").forEach((el) => el.remove());
		};

		// Only create elements if game is active
		if (gameStarted && !isGameOver) {
			cleanup();
			// Create a hidden element for each bot with its data
			bots.forEach((bot) => {
				const el = document.createElement("div");
				el.style.display = "none";
				el.setAttribute("data-bot-id", bot.id.toString());
				el.setAttribute(
					"data-bot-data",
					JSON.stringify({
						position: bot.position,
						color: bot.color,
						territory: bot.territory,
						trail: bot.trail,
					})
				);
				document.body.appendChild(el);
			});
		}

		return cleanup;
	}, [bots, gameStarted, isGameOver]);

	return (
		<>
			{bots.map((bot, index) => (
				<GameEntityWithTrail
					key={bot.id}
					ref={(el) => {
						if (el) botRefs.current[index] = el;
					}}
					name={bot.name}
					color={bot.color}
					position={bot.position}
					direction={bot.direction}
					territory={bot.territory}
					trail={bot.trail}
					active={gameStarted && !isGameOver}
					onPositionUpdate={(pos) => updateBotPosition(bot.id, pos)}
					onDirectionUpdate={(dir) => updateBotDirection(bot.id, dir)}
					onTrailUpdate={(pos) => addToTrail(bot.id, pos)}
					onConquerTerritory={() => conquerTerritory(bot.id)}
					onResetTrail={() => resetTrail(bot.id)}
					insideTerritoryCheck={(pos) => isPointInTerritory(bot.id, pos)}
					moveSpeed={5.0} // Slightly slower than player
					onSelfIntersection={() => resetTrail(bot.id)} // Simple handling for now
				/>
			))}
		</>
	);
};
