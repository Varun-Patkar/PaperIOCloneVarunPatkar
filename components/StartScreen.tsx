import React, { useState, useEffect, useRef } from "react";
import { useGameStore } from "../store";
import { Gamepad2, Play, Github, LogOut } from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

interface UserData {
	id: string;
	username: string;
	name?: string;
	avatarUrl?: string;
	personalBest: number;
	preferredColor: string;
}

export function StartScreen() {
	const { setPlayerName, setPlayerColor, startGame, updatePersonalBestScore } =
		useGameStore();
	const [color, setColor] = useState("#ff0000");
	const [name, setName] = useState("");
	const nameRef = useRef(name);
	const [user, setUser] = useState<UserData | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchUser = async () => {
			try {
				setIsLoading(true);
				const response = await axios.get("/api/user");
				if (response.data.isLoggedIn && response.data.user) {
					setUser(response.data.user);

					// Set player data from user
					let displayName =
						response.data.user.name || response.data.user.username;
					if (displayName.includes(" ")) {
						displayName = displayName.split(" ")[0]; // Get the first name
					}
					setName(displayName);
					nameRef.current = displayName;
					setPlayerName(displayName);
					updatePersonalBestScore(response.data.user.personalBest ?? 1);

					// Set color from user preferences
					if (response.data.user.preferredColor) {
						setColor(response.data.user.preferredColor);
						setPlayerColor(response.data.user.preferredColor);
					}
				}
			} catch (error: any) {
				// Only log unexpected errors, not 401 auth errors which are expected
				if (error.response?.status !== 401) {
					console.error("Unexpected error fetching user:", error);
				}
				// For 401, we just silently handle it as a not logged in case
			} finally {
				setIsLoading(false);
			}
		};

		fetchUser();
	}, [setPlayerColor, setPlayerName]);

	const handleStartGame = () => {
		if (!nameRef.current) {
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

		// Save color preference if logged in
		if (user && color !== user.preferredColor) {
			axios
				.post("/api/user/score", { color })
				.catch((err) => console.error("Error saving color preference:", err));
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
		nameRef.current = newName;
		setPlayerName(newName);
	};

	const handleKeyPress = (e: KeyboardEvent) => {
		if (e.key === "Enter") {
			handleStartGame();
		}
	};

	const handleLogout = async () => {
		try {
			await axios.post("/api/auth/logout");
			setUser(null);
			// Reset to default values
			setName("");
			nameRef.current = "";
			setColor("#ff0000");
			setPlayerColor("#ff0000");
			updatePersonalBestScore(1);
			toast.success("Logged out successfully");
		} catch (error) {
			console.error("Logout error:", error);
			toast.error("Logout failed");
		}
	};

	useEffect(() => {
		window.addEventListener("keypress", handleKeyPress);
		return () => {
			window.removeEventListener("keypress", handleKeyPress);
		};
	}, []);

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
					{isLoading ? (
						<div className="flex justify-center py-4">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
						</div>
					) : (
						<>
							{user ? (
								<div className="flex items-center space-x-4 mb-6 bg-indigo-50 p-3 rounded-lg">
									{user.avatarUrl && (
										<img
											src={user.avatarUrl}
											alt={user.name || user.username}
											className="w-10 h-10 rounded-full"
										/>
									)}
									<div className="flex-1">
										<p className="font-medium text-indigo-800">
											Welcome, {user.name || user.username}!
										</p>
										<p className="text-sm text-gray-600">
											Personal Best: {user.personalBest.toFixed(1)}%
										</p>
									</div>
									<button
										onClick={handleLogout}
										className="p-2 text-red-600 hover:bg-red-50 rounded-full"
										title="Logout"
									>
										<LogOut size={18} />
									</button>
								</div>
							) : (
								<a
									href="/api/auth/github"
									className="flex items-center justify-center space-x-2 bg-gray-800 hover:bg-gray-900 text-white py-3 px-4 rounded-lg transition duration-200 w-full"
								>
									<Github size={24} />
									<span>Login with GitHub</span>
								</a>
							)}

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
									<mesh
										rotation={[Math.PI / 4, Math.PI / 4, 0]}
										scale={[2, 2, 2]}
									>
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
									value={color}
									onChange={handleColorChange}
									className="w-full h-12 p-1 border border-gray-300 rounded-md cursor-pointer"
								/>
							</div>
							<div className="flex justify-center mt-4">
								<button
									onClick={handleStartGame}
									className={`w-16 h-16 md:w-32 md:h-12 rounded-full md:rounded-lg flex items-center justify-center font-medium transition-colors ${
										name
											? "bg-indigo-600 text-white hover:bg-indigo-700"
											: "bg-gray-400 text-gray-700"
									}`}
								>
									<Play className="w-8 h-8 block md:hidden" />
									<span className="hidden md:block">Play Game</span>
								</button>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
