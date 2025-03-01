import React from "react";
import { useGameStore } from "../store";

export function Minimap() {
	const { player } = useGameStore();

	// Create an SVG polygon points string from territory coordinates
	const territoryPoints = player.territory
		.map(([x, z]) => {
			// Convert game coordinates to percentage in the minimap
			// Note: For territory, we need to use x and z coordinates consistently
			const percentX = ((x + 50) / 100) * 100;
			const percentZ = ((z + 50) / 100) * 100;
			return `${percentX},${percentZ}`;
		})
		.join(" ");

	return (
		<div className="absolute bottom-4 left-4 bg-white/80 rounded-lg p-2 shadow-lg">
			<div className="relative w-48 h-48 border-2 border-gray-400 rounded-full overflow-hidden">
				{/* Map background */}
				<div className="absolute inset-0 bg-gray-100 rounded-full" />

				{/* Territory visualization */}
				<svg
					className="absolute inset-0 w-full h-full"
					viewBox="0 0 100 100"
					preserveAspectRatio="none"
				>
					<polygon
						points={territoryPoints}
						fill={player.color}
						fillOpacity={0.4}
						stroke={player.color}
						strokeWidth="1"
					/>
				</svg>

				{/* Trail - made lighter with opacity */}
				{player.trail.map(([x, z], index) => (
					<div
						key={index}
						className="absolute w-1.5 h-1.5 rounded-full"
						style={{
							left: `${((x + 50) / 100) * 100}%`,
							top: `${((z + 50) / 100) * 100}%`,
							backgroundColor: player.color,
							opacity: 0.5, // Make trail lighter
							transform: "translate(-50%, -50%)",
						}}
					/>
				))}

				{/* Player dot (larger and full opacity) */}
				<div
					className="absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-md z-10"
					style={{
						left: `${((player.position[0] + 50) / 100) * 100}%`,
						top: `${((player.position[1] + 50) / 100) * 100}%`,
						backgroundColor: player.color,
					}}
				/>
			</div>
		</div>
	);
}
