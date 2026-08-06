import React from "react";

/**
 * Renders a small deterministic grid of squares derived from a byte array
 * (see fingerprintFromJwk in cryptoUtils.js). Two users only ever get
 * matching identicons if their public keys match — which is exactly the
 * property a key-fingerprint check should have (see Recommendation 3 in
 * the proposal: Signal-style "safety numbers").
 */
export default function Identicon({ bytes, size = 40 }) {
  if (!bytes || bytes.length === 0) {
    return (
      <div
        className="rounded-full bg-surface-raised animate-pulse"
        style={{ width: size, height: size }}
      />
    );
  }

  const grid = 5;
  const cell = size / grid;
  const hue = bytes[0] % 360;
  const cells = [];

  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < Math.ceil(grid / 2); col++) {
      const idx = row * Math.ceil(grid / 2) + col;
      const on = bytes[idx % bytes.length] % 2 === 0;
      if (!on) continue;
      const mirrorCol = grid - 1 - col;
      cells.push(
        <rect
          key={`${row}-${col}`}
          x={col * cell}
          y={row * cell}
          width={cell}
          height={cell}
        />
      );
      if (mirrorCol !== col) {
        cells.push(
          <rect
            key={`${row}-${mirrorCol}`}
            x={mirrorCol * cell}
            y={row * cell}
            width={cell}
            height={cell}
          />
        );
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="rounded-lg shrink-0"
      style={{ backgroundColor: "#1D1F2E" }}
    >
      <g fill={`hsl(${hue}, 55%, 62%)`}>{cells}</g>
    </svg>
  );
}
