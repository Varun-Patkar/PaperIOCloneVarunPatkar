import React from "react";
import { useGameStore } from "../store";

export function Minimap() {
	const { player } = useGameStore();

	return (
		<div className="absolute bottom-4 left-4 bg-white/80 rounded-lg p-2 shadow-lg">
			<div className="relative w-48 h-48 border-2 border-gray-400 rounded-full overflow-hidden">
				{/* Map background */}
				<div className="absolute inset-0 bg-white-200 rounded-full" />

				{/* Player dot */}
				<div
					className="absolute w-2 h-2 rounded-full transform -translate-x-1/2 -translate-y-1/2"
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
