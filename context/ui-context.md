# UI Context

## Theme

Dark only. No light mode. The active alternative palette uses midnight navy backgrounds, layered blue surfaces, warm amber interactive accents, cool blue-gray text, and periwinkle AI accents.

All colors are defined as CSS custom properties in `globals.css` and mapped to Tailwind tokens via `@theme inline`. Components must use these tokens — no hardcoded hex values or raw Tailwind color classes like `zinc-*`.

| Role             | CSS Variable           | Hex / Value               |
| ---------------- | ---------------------- | ------------------------- |
| Page background  | `--bg-base`            | `#0c111b`                 |
| Surface          | `--bg-surface`         | `#141c2a`                 |
| Elevated surface | `--bg-elevated`        | `#1c2738`                 |
| Subtle surface   | `--bg-subtle`          | `#243247`                 |
| Default border   | `--border-default`     | `#34445c`                 |
| Subtle border    | `--border-subtle`      | `#465b78`                 |
| Primary text     | `--text-primary`       | `#e8edf5`                 |
| Secondary text   | `--text-secondary`     | `#b9c5d6`                 |
| Muted text       | `--text-muted`         | `#8b9ab0`                 |
| Faint text       | `--text-faint`         | `#607189`                 |
| Brand accent     | `--accent-primary`     | `#e8b86d` (amber)          |
| Brand dim        | `--accent-primary-dim` | `rgba(232, 184, 109, 0.12)` |
| AI accent        | `--accent-ai`          | `#9daeff` (periwinkle) |
| AI text          | `--accent-ai-text`     | `#bdc9ff`                 |
| Error            | `--state-error`        | `#f08080`                 |
| Success          | `--state-success`      | `#7dc9a1`                 |
| Warning          | `--state-warning`      | `#f2cf82`                 |

Tailwind utility names map to these variables. Use `bg-base`, `bg-surface`, `text-copy-primary`, `text-copy-muted`, `border-surface-border`, `text-brand`, `bg-accent-dim`, etc.

## Typography

| Role      | Font       | CSS Variable        |
| --------- | ---------- | ------------------- |
| UI text   | Geist Sans | `--font-geist-sans` |
| Code/mono | Geist Mono | `--font-geist-mono` |

Both fonts are loaded via `next/font/google` and applied as CSS variables on the `<html>` element. The base `body` uses Geist Sans with `antialiased`.

## Border Radius

Radius increases with surface depth — smaller for inner elements, larger for outer containers.

| Context           | Class         |
| ----------------- | ------------- |
| Inline / small UI | `rounded-xl`  |
| Cards / panels    | `rounded-2xl` |
| Modal / overlay   | `rounded-3xl` |

## Canvas

### Node Color Palette

8 defined color pairs. Each pair specifies a dark node fill and a vivid contrasting text color tuned for readability on the dark canvas. Defined in `src/types/canvas.ts` as `NODE_COLORS`.

| Node fill | Text color | Character              |
| --------- | ---------- | ---------------------- |
| `#1F1F1F` | `#EDEDED`  | Neutral dark (default) |
| `#10233D` | `#52A8FF`  | Blue                   |
| `#2E1938` | `#BF7AF0`  | Purple                 |
| `#331B00` | `#FF990A`  | Orange                 |
| `#3C1618` | `#FF6166`  | Red                    |
| `#3A1726` | `#F75F8F`  | Pink                   |
| `#0F2E18` | `#62C073`  | Green                  |
| `#062822` | `#0AC7B4`  | Teal                   |

Default node color: `#1F1F1F` with `#EDEDED` text. The default stored fill is `DEFAULT_NODE_COLOR` in `src/types/canvas.ts`; `--canvas-node-text` and `--canvas-handle` define the basic renderer label and handle colors.

Selected nodes show a floating row of eight swatches above the node. Each swatch shows its background and text colors. The active swatch has a matching border, and hover adds a small glow in its text color.

### Edge Style

Smooth-step path with an arrow marker. Default edge color: `#f8fafc`. Stroke width is thin — edges are visually secondary to nodes.

### Node Shapes

6 supported shapes, defined in `types/canvas.ts` as `NODE_SHAPES`. Complex shapes (diamond, hexagon, cylinder) are rendered as inline SVGs rather than CSS borders.

- `rectangle` — default general-purpose node
- `diamond` — decision / gateway
- `circle` — event / endpoint
- `pill` — service / process
- `cylinder` — database / storage
- `hexagon` — external system / boundary

### Connection Handles

Small white circular handles, hidden by default, revealed on node hover. Appear at all four sides of a node.

### Shape Panel (12)

A floating pill toolbar sits at the bottom center of the canvas with six draggable Lucide icon buttons. It uses surface, border, and text tokens. Default shape sizes live in `SHAPE_SIZES` in `src/types/canvas.ts`. Nodes display the geometry of their stored shape with a centered label. On narrow canvases, a container query stacks the minimap and canvas controls above the toolbar, including when a sidebar narrows a desktop workspace.

### Canvas Editing and Navigation

Dragging a shape shows its outline and neutral fill at the default node size, centered on the pointer. The preview disappears on drop or cancellation.

Selected nodes have an amber outline and corner resize handles. Circles keep their aspect ratio during resize. The lower-left canvas controls provide zoom in, zoom out, fit view, and Delete selection. The minimap supports panning and zooming. Drag the background to pan or use the wheel or a pinch gesture to zoom.

Labels are centered inside their nodes. Empty labels display “Add label.” Double-clicking the label area opens an inline textarea in the same position. Edits are shared as users type, and clicking away or pressing Escape closes the editor.

### Canvas Background

React Flow `<Background>` component. Canvas sits on the base background color.

## Component Library

shadcn/ui on top of Tailwind. No custom design system. Components live in `components/ui/`. Use the `shadcn` CLI to add new components rather than writing them from scratch.

## Layout Patterns

- Editor workspace: full-viewport layout — floating sidebar overlay on the left, center canvas, slide-over AI sidebar on the right.
- Sidebars: floating overlay with dark semi-transparent background and subtle border.
- Modals and dialogs: centered overlay, `rounded-3xl`, dark background with backdrop blur.
- Navbar: top bar with dark background and bottom border.

## Icons

Lucide React. Stroke-based icons only — no filled variants. Icon sizes: `h-4 w-4` for inline, `h-5 w-5` for buttons, `h-8 w-8` for feature icons in empty states.
