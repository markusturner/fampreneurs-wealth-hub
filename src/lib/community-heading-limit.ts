/** Preserve the first heading and convert any additional headings to body text. */
export function extraHeadingPositions(positions: readonly number[]): number[] {
  return positions.slice(1)
}