export interface Game {
  id: number;
  team1: [string, string];
  team2: [string, string];
  team1Score?: number;
  team2Score?: number;
}

export interface Round {
  roundNumber: number;
  games: Game[];
}

export interface SideBet {
  id: number;
  team1: [string, string];
  team2: [string, string];
  amount: number;
  winner: 1 | 2 | null; // 1 for team1, 2 for team2, null if not yet determined
}

/**
 * Shuffles an array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generates a social doubles round-robin schedule for 8 players
 * where each player partners with every other player exactly once
 * Players are randomly shuffled before scheduling
 */
export function generateRoundRobinSchedule(players: string[]): Round[] {
  if (players.length !== 8) {
    throw new Error('Exactly 8 players are required');
  }

  // Randomly shuffle players for varied team combinations
  const shuffledPlayers = shuffleArray(players);

  // Social doubles round-robin pattern for 8 players
  // Each player partners with every other player exactly once
  const rounds: Round[] = [];
  let gameId = 1;

  // Corrected schedule that ensures each player plays exactly 7 games
  // and each player partners with every other player exactly once
  // This is a Resolvable Balanced Incomplete Block Design (RBIBD) that
  // guarantees all 28 possible partnerships (C(8,2)) occur exactly once
  const schedule = [
    // Round 1
    [[0, 1, 2, 3], [4, 5, 6, 7]],
    // Round 2
    [[0, 2, 4, 6], [1, 3, 5, 7]],
    // Round 3
    [[0, 3, 5, 6], [1, 2, 4, 7]],
    // Round 4
    [[0, 4, 3, 7], [1, 5, 2, 6]],
    // Round 5
    [[0, 5, 1, 4], [2, 7, 3, 6]],
    // Round 6
    [[0, 6, 1, 7], [2, 4, 3, 5]],
    // Round 7
    [[0, 7, 1, 6], [2, 5, 3, 4]],
  ];

  schedule.forEach((roundGames, roundIndex) => {
    const games: Game[] = roundGames.map((gameIndices) => ({
      id: gameId++,
      team1: [shuffledPlayers[gameIndices[0]], shuffledPlayers[gameIndices[1]]],
      team2: [shuffledPlayers[gameIndices[2]], shuffledPlayers[gameIndices[3]]],
    }));

    rounds.push({
      roundNumber: roundIndex + 1,
      games,
    });
  });

  return rounds;
}

const MAX_POINTS_PER_GAME = 21;

/**
 * Calculates player statistics from completed games
 */
export function calculatePlayerStats(rounds: Round[]) {
  const stats: {
    [player: string]: {
      totalPoints: number;
      pointsLost: number;
      gamesPlayed: number;
      wins: number;
      losses: number;
      gameScores: number[];
    };
  } = {};

  rounds.forEach((round) => {
    round.games.forEach((game) => {
      if (game.team1Score !== undefined && game.team2Score !== undefined) {
        const team1Score = game.team1Score;
        const team2Score = game.team2Score;
        const team1Won = team1Score > team2Score;

        // Add points for team 1 players
        game.team1.forEach((player) => {
          if (!stats[player]) {
            stats[player] = { totalPoints: 0, pointsLost: 0, gamesPlayed: 0, wins: 0, losses: 0, gameScores: [] };
          }
          stats[player].totalPoints += team1Score;
          stats[player].pointsLost += (MAX_POINTS_PER_GAME - team1Score);
          stats[player].gameScores.push(team1Score);
          stats[player].gamesPlayed++;
          if (team1Won) {
            stats[player].wins++;
          } else {
            stats[player].losses++;
          }
        });

        // Add points for team 2 players
        game.team2.forEach((player) => {
          if (!stats[player]) {
            stats[player] = { totalPoints: 0, pointsLost: 0, gamesPlayed: 0, wins: 0, losses: 0, gameScores: [] };
          }
          stats[player].totalPoints += team2Score;
          stats[player].pointsLost += (MAX_POINTS_PER_GAME - team2Score);
          stats[player].gameScores.push(team2Score);
          stats[player].gamesPlayed++;
          if (!team1Won) {
            stats[player].wins++;
          } else {
            stats[player].losses++;
          }
        });
      }
    });
  });

  return stats;
}

/**
 * Calculates payouts based on prize pool system
 * Entry fee: $2 per player
 * 1st place: $8, 2nd place: $6, 3rd place: $2
 * Winner determined by fewest points lost
 */
export function calculatePayouts(
  rounds: Round[],
  entryFee: number
): { [player: string]: number } {
  const stats = calculatePlayerStats(rounds);
  const payouts: { [player: string]: number } = {};

  // Sort players by points lost (ascending - fewest points lost wins)
  const sortedPlayers = Object.entries(stats).sort(
    ([, a], [, b]) => a.pointsLost - b.pointsLost
  );

  // Prize distribution
  const prizes = [8, 6, 2]; // 1st, 2nd, 3rd place prizes

  // Initialize all players with negative entry fee
  sortedPlayers.forEach(([player]) => {
    payouts[player] = -entryFee;
  });

  // Add prizes to top 3 players
  sortedPlayers.forEach(([player], index) => {
    if (index < prizes.length) {
      payouts[player] += prizes[index];
    }
  });

  return payouts;
}

/**
 * Calculates side bet gains/losses per player
 */
export function calculateSideBetTotals(
  sideBets: SideBet[]
): { [player: string]: number } {
  const totals: { [player: string]: number } = {};

  sideBets.forEach((sideBet) => {
    if (sideBet.winner === 1) {
      // Team 1 won
      sideBet.team1.forEach((player) => {
        totals[player] = (totals[player] || 0) + sideBet.amount;
      });
      sideBet.team2.forEach((player) => {
        totals[player] = (totals[player] || 0) - sideBet.amount;
      });
    } else if (sideBet.winner === 2) {
      // Team 2 won
      sideBet.team2.forEach((player) => {
        totals[player] = (totals[player] || 0) + sideBet.amount;
      });
      sideBet.team1.forEach((player) => {
        totals[player] = (totals[player] || 0) - sideBet.amount;
      });
    }
  });

  return totals;
}

/**
 * Calculates payouts including side bets
 */
export function calculatePayoutsWithSideBets(
  rounds: Round[],
  entryFee: number,
  sideBets: SideBet[]
): { [player: string]: number } {
  // Start with tournament payouts
  const payouts = calculatePayouts(rounds, entryFee);

  // Apply side bet wins/losses
  const sideBetTotals = calculateSideBetTotals(sideBets);
  Object.entries(sideBetTotals).forEach(([player, amount]) => {
    payouts[player] = (payouts[player] || 0) + amount;
  });

  return payouts;
}
