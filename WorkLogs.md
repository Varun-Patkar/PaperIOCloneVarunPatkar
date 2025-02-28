# Work Log

This document tracks the progress, challenges, and insights throughout the development of the Paper.IO Clone project. It serves as a reference for future improvements and for newcomers interested in the project's evolution.

---

## 22nd Feb 2025

- **Initial Setup:**
  - Used [bolt.new](https://bolt.new/) to scaffold the project framework, integrating Tailwind CSS for styling.
  - Created an engaging start screen.
  - Set up a basic game scene with a cube placed on a circular map.

---

## 23rd Feb 2025

- **Feature Refinement:**
  - Refined the start screen with manual adjustments, assisted by Github Copilot and Codium.
  - Implemented traversal logic for the cube:
    - Ensured the cube stays within the circular map.
    - Added tangential movement at the borders, maintaining the initial movement direction unless changed.
  - Worked on cube rotation to face the movement direction:
    - Noted non-uniform movement due to a lerp timing issue (currently set to 0.5s for all movements rather than 0.5s per 45° rotation).
    - Identified the need for a smoother, more granular rotation mechanism.
  - Developed a basic skeleton for the trail system by storing an array of points.
  - Added a placeholder for territory capture:
    - The initial territory is a circle at the player's spawn point.
    - The trail, composed of curvy and non-uniform lines, defines the new territory.
    - Considering storing the territory as an array of outer edges that auto-updates when a trail loop is completed.

---

## 24th Feb 2025

- **Camera and Movement Improvements:**
  - Adjusted camera angle to provide an isometric-like view:
    - Added slight tilt to show cube sides and depth
    - Maintained consistent height and angle during movement
    - Improved visual clarity of game elements
  - Enhanced rotation mechanics:
    - Fixed inconsistent rotation timing
    - Now takes 0.5s per 45° rotation uniformly
    - U-turns now show proper transitional movement
  - Implemented smooth direction changes:
    - Added gradual rotation between direction changes
    - Eliminated abrupt direction switches
    - Maintained constant movement speed during transitions

## 25th Feb 2025

- **Boundary and Trail Enhancements:**
  - Improved boundary handling:
    - Prevented the box from glitching out of borders by considering the box size.
    - Ensured the player direction becomes tangential at the border to hug the border if intended.
  - Added a favicon for the project.
  - Implemented an infinite trail system:
    - The trail continuously follows the player's movement.
    - Need to add functionality to reset the trail when it intersects itself, similar to the classic snake game mechanic. Have added function in store to reset.

---

## 26th Feb 2025

- **UI and Trail Logic Improvements:**
  - Added responsiveness to the play button for better user interaction.
  - Adjusted the minimap to be more accessible on smaller devices.
  - Enhanced trail logic:
    - Implemented functionality to reset the trail upon intersection, triggering a game over state.

## 28th Feb 2025

- **Territory and Trail System Integration:**
  - Implemented territory visualization:
    - Added display of player's territory as a colored shape on the map.
    - Applied proper transparency and rendering attributes for visual clarity.
    - Ensured territory appears directly on the map plane with correct orientation.
  - Enhanced trail mechanics:
    - Modified trail system to only track and display when player moves outside territory.
    - Implemented ray casting algorithm to accurately detect when player enters or exits territory.
    - Ensured trail automatically resets when re-entering territory after creating a loop.
  - Added territory expansion logic:
    - Integrated martinez-polygon-clipping library to calculate union of territory and trail loop.
    - Implemented territory conquering when player successfully returns to their territory.
    - Noted current implementation has precision issues with complex polygon merging.
  - Technical challenges:
    - Trail visualization required special handling to maintain flat orientation on XZ plane.
    - Identified need for more robust polygon clipping solution for complex territory shapes.
    - Currently monitoring performance impact of frequent territory recalculation.

![VarunPaperIO - 28-02-2025](media/VarunPaperIO-28-02-2025.gif)

---

_More updates will be logged as development continues._
