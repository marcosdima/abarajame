---
name: alambre-kinetics-dnd
description: Physics-driven animations, gestures, drag-and-drop, spatial flights, carousels, decks, and animated SVG icons in alambre. Use when implementing Reanimated press kinetics (usePressKinetics, kinetics), staggered/wavefront entrances (useStagger, useWavefront), collapsible views (useCollapsible), swipeable rows/cards (useSwipeableRow, useKineticSwipe, useDeck), drag-and-drop (DndProvider, Draggable, Droppable, SortableRow), spatial flights (SpatialSpace, useFlightTrajectory, useCascadeFlight), or stroke-drawn icons (AlambreIcons).
---

# `alambre` Kinetics, Gestures, Drag-and-Drop & Icons

`alambre` provides UI-thread Reanimated hooks, physics presets, drag-and-drop primitives, and animated SVG icons.

---

## 1. `kinetics` Presets & Reanimated Guardrail

Import standardized spring, timing, and analytical curve tokens from `alambre` instead of inventing arbitrary spring numbers:

```tsx
import { kinetics } from 'alambre';
import { withSpring, withTiming } from 'react-native-reanimated';

// Physical & Apple-style duration-bounded springs:
withSpring(target, kinetics.spring.snappy);     // { damping: 20, mass: 1, stiffness: 250 }
withSpring(target, kinetics.spring.bouncy);     // { damping: 14, mass: 1, stiffness: 150 }
withSpring(target, kinetics.spring.gentle);     // { damping: 25, mass: 1, stiffness: 100 }
withSpring(target, kinetics.spring.stiff);      // { damping: 20, mass: 1, stiffness: 300 }
withSpring(target, kinetics.spring.settled);    // { duration: 350, dampingRatio: 1, overshootClamping: true }
withSpring(target, kinetics.spring.snap);       // { duration: 300, dampingRatio: 0.85 }
withSpring(target, kinetics.spring.sheet);      // { duration: 300, dampingRatio: 0.82, overshootClamping: true }
withSpring(target, kinetics.spring.responsive); // { duration: 220, dampingRatio: 0.95, overshootClamping: true }
withSpring(target, kinetics.spring.budgeted);   // frame-budgeted rest thresholds

// Timing presets:
withTiming(target, kinetics.timing.fast);  // 150ms
withTiming(target, kinetics.timing.base);  // 250ms
withTiming(target, kinetics.timing.slow);  // 350ms
withTiming(target, kinetics.timing.sheet); // 300ms
```

**CRITICAL REANIMATED GUARDRAIL:**
Never pass `withSpring(...)` or `withTiming(...)` directly inside `interpolate(...)` — they return animation descriptors, not numbers, resulting in `NaN` and invisible UI. Either assign them to a style property directly or derive a shared value first:
```tsx
const progress = useDerivedValue(() => withSpring(active ? 1 : 0, kinetics.spring.snappy));
const style = useAnimatedStyle(() => ({
  opacity: interpolate(progress.value, [0, 1], [0.4, 1]),
}));
```

---

## 2. Tactile Interaction Hooks

### Press Feedback (`usePressKinetics`)
```tsx
import { usePressKinetics } from 'alambre';

const { animatedStyle, onPressIn, onPressOut } = usePressKinetics({
  scaleTo: 0.96,
});
```

### Collapsible Containers (`useCollapsible`)
```tsx
import { useCollapsible } from 'alambre';

const { animatedStyle, onContentLayout, isExpanded, toggle } = useCollapsible({
  expanded: open,
  transition: 'spring',
});
```

### Staggered & Wavefront Lists (`useStagger`, `useWavefront`)
- Single-clock traveling wavefront across $N$ items on the UI thread:
```tsx
import { WavefrontProvider, useWavefrontItem } from 'alambre';

<WavefrontProvider itemCount={items.length} staggerMs={40} preset="spring">
  {items.map((item, index) => (
    <RowItem key={item.id} index={index} />
  ))}
</WavefrontProvider>
```

### Swipeable Rows, Carousels & Card Decks
- `useSwipeableRow({ threshold, onSwipeLeft, onSwipeRight })`: Action-revealing or dismissible list rows.
- `useCarousel({ itemCount, itemWidth, gap })` / `useKineticCarousel`: Snap-interval horizontal carousels with 3D/scale transforms.
- `useDeck({ count, onSwipe })` / `useKineticSwipe`: Stack of swipeable cards with tilt and velocity projection.

---

## 3. Drag-and-Drop (`DndProvider`, `Draggable`, `Droppable`, `SortableRow`)

Wrap the interactive surface in `<DndProvider>`:

```tsx
import { DndProvider, Draggable, Droppable, SortableRow } from 'alambre';

<DndProvider onDrop={(event) => handleDrop(event.draggableId, event.droppableId)}>
  <Draggable id="card-1" data={{ value: 10 }}>
    {({ isDragging }) => <CardView active={isDragging} />}
  </Draggable>

  <Droppable id="zone-a">
    {({ isOver }) => <DropTarget highlighted={isOver} />}
  </Droppable>
</DndProvider>

// Horizontal/vertical reorderable list:
<SortableRow
  items={items} // Array of { id: string, ... }
  onReorder={setItems}
  renderItem={(item, { isDragging }) => <ChipView item={item} active={isDragging} />}
/>
```

---

## 4. Spatial Coordinates & Flights (`SpatialSpace`, `useFlightTrajectory`, `useDealCascade`)

Coordinate cross-container animations (e.g., dealing items from a source pile to target slots):
- `<SpatialSpace>` + `useSpatialTarget(id)`: Registers named coordinate anchors and computes live 2D vectors between them (`useSpatialVector(fromId, toId)`).
- `useFlightTrajectory({ from, to, trajectory: 'parabolic' | 'arc' | 'linear' })`: Animates an element along a 2D curve with altitude scaling.
- `useDealCascade` / `useCascadeFlight`: Multi-item staggered flight choreography.
- `useInteractiveHand`: Fanned card hand layout with drag-to-reorder and toss-to-play physics (`useCardToss`).

---

## 5. Animated Stroke Icons (`AlambreIcons`)

All `AlambreIcons` support animated SVG stroke drawing via `drawIt`:

```tsx
import { AlambreIcons } from 'alambre';

<AlambreIcons.Arrow
  drawIt={true}
  color={theme.primary}
  lineWidth={16}
  rotation={180} // optional degrees
  style={{ width: 20, height: 14 }}
/>
```
Available icons include: `Arrow`, `Sun`, `Moon`, `Coffee`, `Documents`, `Refresh`, `Check`, `Close`, `Plus`, `Minus`, `Search`, `SettingsIcon`, `HomeIcon`, and custom icon creation via `createAnimatedIcon` / `MorphIcon`.
