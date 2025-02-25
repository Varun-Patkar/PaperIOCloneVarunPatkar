import React, { forwardRef, useMemo } from "react";
import * as THREE from "three";
import { useGameStore } from "../store";
import { Player } from "./Player";

export const PlayerWithTrail = forwardRef<THREE.Group, {}>((props, ref) => {
	const { player } = useGameStore();

	// Convert trail points [x,z] into Vector3 (Y=0)
	const trailPoints = useMemo(
		() => player.trail.map(([x, z]) => new THREE.Vector3(x, 0.0, z)),
		[player.trail]
	);

	const extrudeGeom = useMemo(() => {
		if (trailPoints.length < 2) return null;

		// 1) Create a Catmull-Rom spline from the XZ points
		const curve = new THREE.CatmullRomCurve3(trailPoints);

		// 2) Define a small rectangle in XZ plane:
		//    The shape lies around (0,0) in "XZ" space
		//    We'll extrude it along the curve
		const shape = new THREE.Shape();
		// This draws a rectangle 1 wide x 0.1 high in the X direction
		shape.moveTo(-0.1, -0.5); // left edge
		shape.lineTo(0.1, -0.5); // right edge
		shape.lineTo(0.1, 0.5); // move "up" in shape space
		shape.lineTo(-0.1, 0.5);
		shape.closePath();

		// If you want the ribbon “thickness” in the Z direction instead, change how you define shape.

		// 3) Extrude the shape along the curve
		const extrudeSettings: THREE.ExtrudeGeometryOptions = {
			steps: 750,
			bevelEnabled: false,
			extrudePath: curve, // moves shape along XZ plane
		};

		return new THREE.ExtrudeGeometry(shape, extrudeSettings);
	}, [trailPoints]);

	return (
		<>
			<Player ref={ref} />
			{extrudeGeom && (
				<mesh
					geometry={extrudeGeom}
					position={[0, 0.01, 0]} // Slight Y-lift to avoid z-fighting
					// No rotation: keep [0, 0, 0] so it remains on XZ
					rotation={[0, 0, 0]}
				>
					<meshStandardMaterial color={player.color} />
				</mesh>
			)}
		</>
	);
});
