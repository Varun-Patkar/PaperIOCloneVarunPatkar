import React from "react";
import { useGameStore } from "../store";

export function Minimap() {
	const { player } = useGameStore();

	return (
		<div className="absolute bottom-4 left-4 bg-white/80 rounded-lg p-2 shadow-lg">
			<div className="relative w-32 h-32 sm:w-48 sm:h-48 md:w-80 md:h-80 lg:w-96 lg:h-96 border-2 border-gray-400 rounded-full overflow-hidden">
				{/* Map background */}
				<div className="absolute inset-0 bg-white-200 rounded-full" />

				{/* Trail */}
				{player.trail.map(([x, z], index) => (
					<div
						key={index}
						className="absolute w-1.5 h-1.5 rounded-full opacity-70"
						style={{
							left: `${((x + 50) / 100) * 100}%`,
							top: `${((z + 50) / 100) * 100}%`,
							backgroundColor: player.color,
							transform: "translate(-50%, -50%)",
						}}
					/>
				))}

				{/* Player dot (larger and more opaque) */}
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
