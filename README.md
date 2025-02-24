# Paper.IO Clone

Paper.IO Clone is a project inspired by the popular [Paper.IO](http://paper.io/) game. It combines classic elements from Snake and area-capture genres into a 3D experience using 3JS and React. The core gameplay involves controlling a cube on a circular map: you start with a territory, leave a trail as you move, and by reconnecting with your territory you capture new areas. Crossing another player's trail eliminates them, while crossing your own trail results in self-destruction.

## Overview

This project began as a personal challenge to break out of tutorial hell and create a portfolio piece that showcases both game development and 3JS skills. The initial goal is to build a Minimum Viable Product (MVP) that includes:

- A cube moving on a circular map.
- A trail system that expands your territory when you reconnect with your starting area.
- Intelligent traversal logic to keep the cube on the map.

Future enhancements include adding enemies, bots, multiplayer functionality, leaderboards, and additional game modes.

## Tech Stack and Dependencies

The project leverages modern web development tools and libraries:

- **Framework & Libraries:** React, 3JS, Vite, and 3D utilities.
- **Tailwind CSS:** For rapid and responsive UI styling.
- **State Management:** zustand.
- **Additional Packages:**
  - "@react-three/drei": "^9.99.7"
  - "@react-three/fiber": "^8.15.19"
  - "@types/three": "^0.162.0"
  - "lucide-react": "^0.263.1"
  - "react": "^18.3.1"
  - "react-dom": "^18.3.1"
  - "react-toastify": "^11.0.3"
  - "three": "^0.162.0"
  - "zustand": "^4.5.2"

These tools were scaffolded using [bolt.new](https://bolt.new/), a platform that agentificates the web development process.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- Git

### Installation

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/Varun-Patkar/PaperIOCloneVarunPatkar.git
   cd PaperIOCloneVarunPatkar
   ```

2. **Install Dependencies:**

   ```bash
   npm install
   ```

3. **Run the Development Server:**

   ```bash
   npm run dev
   ```

4. **Play the Game:**
   Open your browser and navigate to `http://localhost:5173` to start the game.

## Contributing

Contributions are welcome! If you have suggestions, bug fixes, or new features, please fork the repository and open a pull request. For significant changes, please open an issue first to discuss your ideas.

## License

This project is licensed under the MIT License.

## Acknowledgments

- [Paper.IO](http://paper.io/) for the inspiration.
- The 3JS and React communities for excellent resources and tutorials.
- Tools like Github Copilot and Codium for code assistance.
- [bolt.new](https://bolt.new/) for streamlining the development setup.
