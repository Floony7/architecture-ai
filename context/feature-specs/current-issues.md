# Canvas interaction fixes

## Reported issues

- The palette stores six node types, but the canvas renderer displays every node as a rectangle.
- The canvas has no visible delete action and only recognizes Backspace for keyboard deletion.
- Nodes have connection handles but no resize controls.

## Expected behavior

- The dotted canvas supports unbounded panning, wheel or pinch zoom, zoom controls, fit view, and minimap navigation.
- Each palette item drops its matching shape at the canvas coordinates under the pointer. Existing shapes can be dragged to new positions.
- Selected shapes show resize handles. Position and dimensions sync to collaborators.
- Delete, Backspace, and the canvas Delete selection button remove selected items and any incident edges through the existing collaboration flow.
