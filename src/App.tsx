import Reac, { useEffect } from "react";
import { Game } from "./components/Game";
import { StartScreen } from "./components/StartScreen";
import { useGameStore } from "./store";

function App() {
	const gameStarted = useGameStore((state) => state.gameStarted);
	useEffect(() => {
		// Prevent scrolling, especially important on mobile
		document.body.classList.add("overflow-hidden", "touch-none");
		document.documentElement.classList.add("overflow-hidden", "h-full");

		// Cleanup when component unmounts
		return () => {
			document.body.classList.remove("overflow-hidden", "touch-none");
			document.documentElement.classList.remove("overflow-hidden", "h-full");
		};
	}, []);
	return (
		<div className="w-full h-screen">
			{gameStarted ? <Game /> : <StartScreen />}
		</div>
	);
}

export default App;
