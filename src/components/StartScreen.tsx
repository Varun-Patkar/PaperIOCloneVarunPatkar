import React, { useState } from "react";
import { useGameStore } from "../store";
import { Gamepad2 } from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export function StartScreen() {
	const { setPlayerName, setPlayerColor, startGame } = useGameStore();
	const [color, setColor] = useState("#ff0000");
	const [name, setName] = useState("");

	const handleStartGame = () => {
		if (!name) {
			toast.error("Please fill the name field", {
				position: "bottom-right",
				autoClose: 3000,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
				progress: undefined,
			});
			return;
		}
		startGame();
	};
	const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newColor = e.target.value;
		setColor(newColor);
		setPlayerColor(newColor);
	};

	const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newName = e.target.value;
		setName(newName);
		setPlayerName(newName);
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
			<ToastContainer />
			<div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
				<div className="flex items-center justify-center mb-8">
					<Gamepad2 className="w-12 h-12 text-indigo-600" />
					<h1 className="text-4xl font-bold text-gray-800 ml-4">
						Paper.Io Clone
					</h1>
				</div>

				<div className="space-y-6">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Player Name
						</label>
						<input
							type="text"
							value={name}
							onChange={handleNameChange}
							className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							placeholder="Enter your name"
							required
						/>
					</div>
					<div className="w-full h-48">
						<Canvas>
							<ambientLight intensity={2} />
							<mesh rotation={[Math.PI / 4, Math.PI / 4, 0]} scale={[2, 2, 2]}>
								<boxGeometry args={[1, 1, 1]} />
								<meshStandardMaterial color={color} />
							</mesh>
							<OrbitControls enableZoom={false} autoRotate />
						</Canvas>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Player Color
						</label>
						<input
							type="color"
							defaultValue="#ff0000"
							onChange={handleColorChange}
							className="w-full h-12 p-1 border border-gray-300 rounded-md cursor-pointer"
						/>
						<button
							onClick={handleStartGame}
							className={`w-full py-3 rounded-md font-medium transition-colors mt-3 ${
								name
									? "bg-indigo-600 text-white hover:bg-indigo-700"
									: "bg-gray-400 text-gray-700"
							}`}
						>
							Start Game
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
