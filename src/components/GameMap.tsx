import React from "react";
import * as THREE from "three";

export function GameMap() {
	return (
		<>
			{/* Main white circle */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
				<circleGeometry args={[50, 128]} />
				<meshToonMaterial color="#ffffff" />
			</mesh>

			{/* Black border ring */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
				<ringGeometry args={[49.7, 50, 128]} />
				<meshToonMaterial color="#000000" />
			</mesh>
		</>
	);
}
