import React, { useEffect, useState } from "react";
import { useGameStore } from "../store";

// Add a new type for entities to display on minimap
interface MinimapEntity {
	position: [number, number];
	color: string;
	territory: [number, number][];
	trail: [number, number][];
}

export function Minimap() {
	const { player, gameStarted } = useGameStore();
	// State to store the player and bot entities for the minimap
	const [entities, setEntities] = useState<MinimapEntity[]>([]);

	// Effect to fetch bot information when game starts
	useEffect(() => {
		// Always include the player
		const updatedEntities: MinimapEntity[] = [player];

		// Try to get bot data from the DOM
		if (gameStarted) {
			// Look for bot data elements created by BotManager
			const botElements = document.querySelectorAll("[data-bot-data]");
			botElements.forEach((el) => {
				try {
					const botData = JSON.parse(el.getAttribute("data-bot-data") || "{}");
					if (botData.position && botData.color) {
						updatedEntities.push(botData as MinimapEntity);
					}
				} catch (e) {
					console.error("Error parsing bot data", e);
				}
			});
		}

		setEntities(updatedEntities);
	}, [player, gameStarted, player.position, player.trail, player.territory]);

	return (
		<div className="absolute bottom-4 left-4 bg-white/80 rounded-lg p-2 shadow-lg">
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
