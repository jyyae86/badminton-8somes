import type { Round, SideBet, TournamentFormat } from './scheduler';

export interface TournamentState {
  stage: 'input' | 'playing' | 'results';
  format?: TournamentFormat;
  playerNames: string[];
  rounds: Round[];
  currentRound: number;
  sideBets: SideBet[];
  customPairing?: boolean;
  customTeams?: Array<[string, string]>;
}

/**
 * Serializes tournament state to URL-safe string
 */
export function serializeState(state: TournamentState): string {
  try {
    const json = JSON.stringify(state);
    // Use base64 encoding to make it URL-safe
    return btoa(encodeURIComponent(json));
  } catch (error) {
    console.error('Failed to serialize state:', error);
    return '';
  }
}

/**
 * Deserializes tournament state from URL string
 */
export function deserializeState(encoded: string): TournamentState | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    const state = JSON.parse(json);

    // Validate the state structure
    if (
      state &&
      typeof state.stage === 'string' &&
      Array.isArray(state.playerNames) &&
      Array.isArray(state.rounds) &&
      typeof state.currentRound === 'number' &&
      Array.isArray(state.sideBets)
    ) {
      return state as TournamentState;
    }

    return null;
  } catch (error) {
    console.error('Failed to deserialize state:', error);
    return null;
  }
}

/**
 * Updates the URL with current tournament state
 */
export function updateURL(state: TournamentState): void {
  const encoded = serializeState(state);
  if (encoded) {
    const url = new URL(window.location.href);
    url.searchParams.set('state', encoded);
    window.history.replaceState({}, '', url.toString());
  }
}

/**
 * Gets tournament state from URL
 */
export function getStateFromURL(): TournamentState | null {
  const url = new URL(window.location.href);
  const encoded = url.searchParams.get('state');

  if (encoded) {
    return deserializeState(encoded);
  }

  return null;
}

/**
 * Clears tournament state from URL
 */
export function clearURLState(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('state');
  window.history.replaceState({}, '', url.toString());
}
