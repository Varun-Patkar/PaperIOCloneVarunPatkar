import React from "react";

export function GameMap() {
	return (
		<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
			<circleGeometry args={[50, 128]} /> {/* Increased the segments to 128 */}
			<meshToonMaterial color="#cccccc" />
		</mesh>
	);
}
