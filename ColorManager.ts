import gameConfig from './config.json';

class ColorManager {
	private availableColors: string[];
	private assignedColors: Set<string> = new Set();
	private playerColor: string = gameConfig.colors.playerDefault;

	constructor() {
		this.availableColors = [...gameConfig.colors.palette];
	}

	setPlayerColor(color: string): void {
		// If the player's color was previously assigned to a bot, make it available again
		if (this.assignedColors.has(this.playerColor)) {
			this.assignedColors.delete(this.playerColor);
			if (!this.availableColors.includes(this.playerColor)) {
				this.availableColors.push(this.playerColor);
			}
		}

		this.playerColor = color;

		// Remove player color from available pool if it's there
		const playerColorIndex = this.availableColors.indexOf(this.playerColor);
		if (playerColorIndex > -1) {
			this.availableColors.splice(playerColorIndex, 1);
		}
		// Ensure it's not marked as assigned to a bot
		this.assignedColors.delete(this.playerColor);
	}

	getBotColor(): string | null {
		// Filter out the current player color just in case
		const validColors = this.availableColors.filter(c => c !== this.playerColor);

		if (validColors.length === 0) {
			console.warn("ColorManager: No unique colors left in the palette!");
			// Fallback: maybe reuse colors or return a default?
			return gameConfig.colors.palette[Math.floor(Math.random() * gameConfig.colors.palette.length)];
		}

		// Simple strategy: pick a random available color
		const colorIndex = Math.floor(Math.random() * validColors.length);
		const assignedColor = validColors[colorIndex];

		// Remove from available and add to assigned
		this.availableColors.splice(this.availableColors.indexOf(assignedColor), 1);
		this.assignedColors.add(assignedColor);

		return assignedColor;
	}

	releaseBotColor(color: string): void {
		if (this.assignedColors.has(color)) {
			this.assignedColors.delete(color);
			// Add back to available only if it's not the player's color
			if (color !== this.playerColor && !this.availableColors.includes(color)) {
				this.availableColors.push(color);
			}
		}
	}

	reset(): void {
		this.assignedColors.clear();
		this.availableColors = [...gameConfig.colors.palette];
		// Ensure player color constraint is reapplied after reset
		this.setPlayerColor(this.playerColor);
	}
}

// Export a singleton instance
export const colorManager = new ColorManager();
