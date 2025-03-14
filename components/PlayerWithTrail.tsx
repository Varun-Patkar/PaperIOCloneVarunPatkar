import React, { forwardRef, useMemo } from "react";
import * as THREE from "three";
import { useGameStore } from "../store";
import { Player } from "./Player";

export const PlayerWithTrail = forwardRef<THREE.Group, {}>((props, ref) => {
	const { player } = useGameStore();

	// Create territory shape geometry
	const territoryGeometry = useMemo(() => {
		if (player.territory.length < 3) return null;

		// Create shape from territory points
		const shape = new THREE.Shape();
		// Note: We're negating the second coordinate to flip the territory
		shape.moveTo(player.territory[0][0], -player.territory[0][1]);

		// Add the remaining points
		for (let i = 1; i < player.territory.length; i++) {
			shape.lineTo(player.territory[i][0], -player.territory[i][1]);
		}

		shape.closePath();
		return new THREE.ShapeGeometry(shape);
	}, [player.territory]);

	// Create trail geometry using TubeGeometry for smooth trail
	const trailGeometry = useMemo(() => {
		if (player.trail.length < 2) return null;

		// Convert trail points to Vector3 with consistent small Y value
		const trailPoints = player.trail.map(
			([x, z]) => new THREE.Vector3(x, 0.02, z)
		);

		// Create a smooth curve through all points
		const curve = new THREE.CatmullRomCurve3(trailPoints);
		curve.curveType = "centripetal"; // Better for sharp corners

		// Create a custom flat elliptical tube cross-section
		const tubeRadius = 0.5;
		const tubeHeight = 0.08;
		const tubularSegments = Math.max(64, trailPoints.length * 4);
		const radialSegments = 8;

		// Custom function to create a flat, elliptical shape instead of a circle
		const createFlatEllipse = (t: number) => {
			const circle = new THREE.Shape();
			for (let i = 0; i < radialSegments; i++) {
				const angle = (i / radialSegments) * Math.PI * 2;
				// Create ellipse (wider than tall)
				const x = Math.cos(angle) * tubeRadius;
				const y = Math.sin(angle) * tubeHeight;
				if (i === 0) {
					circle.moveTo(x, y);
				} else {
					circle.lineTo(x, y);
				}
			}
			circle.closePath();
			return circle;
		};

		// Use layers to ensure flat orientation
		const frames = curve.computeFrenetFrames(tubularSegments, false);

		// Override normal vectors to always point up
		for (let i = 0; i < frames.normals.length; i++) {
			frames.normals[i].set(0, 1, 0);
			frames.binormals[i].crossVectors(frames.tangents[i], frames.normals[i]);
		}

		// Create custom buffer geometry
		const geometry = new THREE.BufferGeometry();
		const positions = [];
		const indices = [];
		const uvs = [];

		// Generate vertices based on the curve
		for (let i = 0; i <= tubularSegments; i++) {
			const t = i / tubularSegments;
			const point = curve.getPointAt(t);
			const tangent = curve.getTangentAt(t).normalize();

			// Force tangents to stay in XZ plane
			tangent.y = 0;
			tangent.normalize();

			// Use custom frame
			const normal = frames.normals[Math.min(i, frames.normals.length - 1)];
			const binormal = new THREE.Vector3()
				.crossVectors(normal, tangent)
				.normalize();

			// Generate circle vertices
			for (let j = 0; j <= radialSegments; j++) {
				const angle = (j / radialSegments) * Math.PI * 2;
				const sin = Math.sin(angle);
				const cos = Math.cos(angle);

				// Make elliptical (wider than taller)
				const x = cos * tubeRadius;
				const y = sin * tubeHeight;

				// Position in 3D space using our custom frame
				const vertex = new THREE.Vector3();
				vertex.x = point.x + x * binormal.x;
				vertex.y = Math.max(0.01, point.y + y * normal.y); // Keep Y values positive but small
				vertex.z = point.z + x * binormal.z;

				positions.push(vertex.x, vertex.y, vertex.z);

				// Add UVs
				uvs.push(t, j / radialSegments);
			}
		}

		// Create faces (triangles)
		const vertsPerRow = radialSegments + 1;
		for (let i = 0; i < tubularSegments; i++) {
			for (let j = 0; j < radialSegments; j++) {
				const a = i * vertsPerRow + j;
				const b = (i + 1) * vertsPerRow + j;
				const c = (i + 1) * vertsPerRow + (j + 1);
				const d = i * vertsPerRow + (j + 1);

				// Two triangles per face
				indices.push(a, b, d);
				indices.push(b, c, d);
			}
		}

		geometry.setAttribute(
			"position",
			new THREE.Float32BufferAttribute(positions, 3)
		);
		geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
		geometry.setIndex(indices);
		geometry.computeVertexNormals();

		return geometry;
	}, [player.trail]);

	return (
		<>
			<Player ref={ref} />

			{/* Territory visualization */}
			{territoryGeometry && (
				<mesh
					geometry={territoryGeometry}
					position={[0, 0.005, 0]} // Slightly above ground to avoid z-fighting
					rotation={[-Math.PI / 2, 0, 0]} // Rotate to lie flat on XZ plane
				>
					<meshStandardMaterial
						color={player.color}
						transparent={true}
						opacity={0.6}
						side={THREE.DoubleSide}
						roughness={0.7}
						metalness={0.2}
					/>
				</mesh>
			)}

			{/* Trail visualization */}
			{trailGeometry && (
				<mesh geometry={trailGeometry}>
					<meshStandardMaterial
						color={player.color}
						side={THREE.DoubleSide}
						roughness={0.3}
						metalness={0.1}
						envMapIntensity={0.8}
					/>
				</mesh>
			)}
		</>
	);
});
