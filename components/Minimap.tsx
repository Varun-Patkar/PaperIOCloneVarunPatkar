import React from "react"; // Removed useEffect, useState
import { useGameStore } from "../store";
import { LeaderboardEntry } from "../types"; // Use LeaderboardEntry or define a simpler type if needed

// Interface for entities displayed on the minimap
interface MinimapDisplayEntity {
	position: [number, number];
	color: string;
	territory: [number, number][];
	trail: [number, number][];
}

export function Minimap() {
	// Fetch player and bots directly from the store
	const player = useGameStore((state) => state.player);
	const bots = useGameStore((state) => state.bots);
	const gameStarted = useGameStore((state) => state.gameStarted);

	// Combine player and bots into a single list for rendering
	const entities: MinimapDisplayEntity[] = [];
	if (gameStarted) {
		// Add player
		entities.push({
			position: player.position,
			color: player.color,
			territory: player.territory,
			trail: player.trail,
		});
		// Add bots
		bots.forEach((bot) => {
			entities.push({
				position: bot.position,
				color: bot.color,
				territory: bot.territory,
				trail: bot.trail,
			});
		});
	}

	return (
		<div className="absolute bottom-4 left-4 bg-white/80 rounded-lg p-2 shadow-lg z-10">
			{" "}
			{/* Added z-index */}
			<div className="relative w-48 h-48 border-2 border-gray-400 rounded-full overflow-hidden">
				{/* Map background */}
				<div className="absolute inset-0 bg-gray-100 rounded-full" />

				{/* Render all entities (player + bots) */}
				{entities.map((entity, entityIndex) => (
					<React.Fragment key={entityIndex}>
						{/* Territory visualization */}
						<svg
							className="absolute inset-0 w-full h-full"
							viewBox="0 0 100 100"
							preserveAspectRatio="none"
						>
							<polygon
								points={entity.territory
									.map(([x, z]) => {
										const percentX = ((x + 50) / 100) * 100;
										const percentZ = ((z + 50) / 100) * 100;
										return `${percentX},${percentZ}`;
									})
									.join(" ")}
								fill={entity.color}
								fillOpacity={0.4}
								stroke={entity.color}
								strokeWidth="1"
							/>
						</svg>

						{/* Trail */}
						{entity.trail.map(([x, z], index) => (
							<div
								key={`${entityIndex}-trail-${index}`}
								className="absolute w-1.5 h-1.5 rounded-full"
								style={{
									left: `${((x + 50) / 100) * 100}%`,
									top: `${((z + 50) / 100) * 100}%`,
									backgroundColor: entity.color,
									opacity: 0.5,
									transform: "translate(-50%, -50%)",
								}}
							/>
						))}

						{/* Entity dot */}
						<div
							className="absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-md z-10"
							style={{
								left: `${((entity.position[0] + 50) / 100) * 100}%`,
								top: `${((entity.position[1] + 50) / 100) * 100}%`,
								backgroundColor: entity.color,
							}}
						/>
					</React.Fragment>
				))}
			</div>
		</div>
	);
}
