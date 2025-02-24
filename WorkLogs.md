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

---

_More updates will be logged as development continues._
