// app/layout.tsx
import "./index.css"; // global styles, including Tailwind directives

export const metadata = {
	title: "Paper.Io Clone",
	description:
		"A 3D game inspired by Paper.IO using React and 3JS. Control a cube on a circular map, expand your territory, and avoid crossing trails. Future enhancements include enemies, bots, multiplayer, leaderboards, and more.",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<head>
				<link rel="icon" href="favicon.svg" type="image/svg+xml" />
			</head>
			<body>{children}</body>
		</html>
	);
}
