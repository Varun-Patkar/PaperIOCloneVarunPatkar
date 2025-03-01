import { useGameStore } from "../store";

export const GameOverScreen = () => {
	const {
		isGameOver,
		isVictory,
		personalBest,
		getDisplayPercentage,
		resetGame,
		goHome,
		updatePlayerPosition,
	} = useGameStore();

	if (!isGameOver) return null;

	const currentPercentage = getDisplayPercentage().toFixed(1);
	const bestPercentage = personalBest.toFixed(1);
	const scaledBest = parseFloat(bestPercentage).toFixed(1);

	return (
		<div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
			<div className="bg-gray-900 rounded-xl p-8 max-w-md text-center border-4 border-indigo-600 shadow-2xl">
				{isVictory ? (
					<>
						<h1 className="text-4xl font-bold text-yellow-300 mb-4 animate-pulse">
							VICTORY!
						</h1>
						<p className="text-2xl text-green-400 mb-6">
							You are the 2D Circle Dimension Lord!
						</p>
						<div className="mb-8">
							<img
								src="https://media.giphy.com/media/3otPoS81loriI9sO8o/giphy.gif"
								alt="Victory celebration"
								className="mx-auto rounded-lg w-full"
							/>
						</div>
						<p className="text-white text-lg mb-6">
							You have conquered{" "}
							<span className="text-green-400 font-bold">100%</span> of the map!
						</p>
					</>
				) : (
					<>
						<h1 className="text-4xl font-bold text-red-500 mb-4">GAME OVER</h1>
						<p className="text-xl text-gray-300 mb-6">
							You crashed into your own trail! But you still managed to conquer{" "}
							{currentPercentage}% of the map.
						</p>
						<div className="mb-4 p-4 bg-gray-800 rounded-lg">
							<p className="text-lg text-gray-400">Final Territory</p>
							<p className="text-3xl font-bold text-blue-400">
								{currentPercentage}%
							</p>
						</div>
					</>
				)}

				<div className="mb-8 p-4 bg-gray-800 rounded-lg">
					<p className="text-lg text-gray-400">Personal Best</p>
					<p className="text-3xl font-bold text-yellow-400">
						{isNaN(personalBest) ? currentPercentage : scaledBest}%
					</p>
				</div>

				<div className="flex flex-col space-y-4">
					<button
						onClick={resetGame}
						className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-full text-lg transform transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400"
					>
						Play Again
					</button>
					<button
						onClick={goHome}
						className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full text-lg transform transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400"
					>
						Go Home
					</button>
				</div>
			</div>
		</div>
	);
};
