export type TournamentFormat = '8-player' | '12-player';

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

export interface TeamStats {
  teamName: string;
  players: [string, string];
  wins: number;
  losses: number;
  pointsScored: number;
  pointsConceded: number;
  pointDifferential: number;
  pointsLost: number;
  gameScores: number[];
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

/**
 * Generates a round-robin schedule for 12 players (6 teams)
 * Players are randomly paired into teams at the start
 * Each team plays every other team exactly once (5 games per team)
 */
export function generate12PlayerSchedule(
  players: string[],
  customTeams?: Array<[string, string]>
): Round[] {
  if (players.length !== 12) {
    throw new Error('Exactly 12 players are required');
  }

  let teams: Array<[string, string]>;

  if (customTeams && customTeams.length === 6) {
    // Use custom teams if provided
    teams = customTeams;
  } else {
    // Randomly shuffle players and pair them into 6 teams
    const shuffledPlayers = shuffleArray(players);
    teams = [];
    for (let i = 0; i < 12; i += 2) {
      teams.push([shuffledPlayers[i], shuffledPlayers[i + 1]]);
    }
  }

  // Round-robin scheduling for 6 teams
  // Using the circle method: 5 rounds, 3 games per round
  const rounds: Round[] = [];
  let gameId = 1;

  // Circle method for round-robin with 6 teams
  // Fix team 0, rotate others
  const rotatingTeams = [1, 2, 3, 4, 5];

  for (let round = 0; round < 5; round++) {
    const games: Game[] = [];

    // Team 0 plays against rotatingTeams[0]
    games.push({
      id: gameId++,
      team1: teams[0],
      team2: teams[rotatingTeams[0]],
    });

    // Pair up the remaining teams
    for (let i = 1; i < 3; i++) {
      const team1Idx = rotatingTeams[i];
      const team2Idx = rotatingTeams[5 - i];
      games.push({
        id: gameId++,
        team1: teams[team1Idx],
        team2: teams[team2Idx],
      });
    }

    rounds.push({
      roundNumber: round + 1,
      games,
    });

    // Rotate teams for next round (keep first position, rotate others)
    rotatingTeams.unshift(rotatingTeams.pop()!);
  }

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

/**
 * Calculates team statistics for 12-player format
 * Returns stats for each team (identified by their two players)
 */
export function calculateTeamStats(rounds: Round[]): TeamStats[] {
  const teamMap = new Map<string, TeamStats>();
  const MAX_POINTS = 21;

  rounds.forEach((round) => {
    round.games.forEach((game) => {
      if (game.team1Score !== undefined && game.team2Score !== undefined) {
        const team1Key = [...game.team1].sort().join(' & ');
        const team2Key = [...game.team2].sort().join(' & ');

        // Initialize team1 if not exists
        if (!teamMap.has(team1Key)) {
          teamMap.set(team1Key, {
            teamName: team1Key,
            players: game.team1,
            wins: 0,
            losses: 0,
            pointsScored: 0,
            pointsConceded: 0,
            pointDifferential: 0,
            pointsLost: 0,
            gameScores: [],
          });
        }

        // Initialize team2 if not exists
        if (!teamMap.has(team2Key)) {
          teamMap.set(team2Key, {
            teamName: team2Key,
            players: game.team2,
            wins: 0,
            losses: 0,
            pointsScored: 0,
            pointsConceded: 0,
            pointDifferential: 0,
            pointsLost: 0,
            gameScores: [],
          });
        }

        const team1Stats = teamMap.get(team1Key)!;
        const team2Stats = teamMap.get(team2Key)!;

        // Update stats
        team1Stats.pointsScored += game.team1Score;
        team1Stats.pointsConceded += game.team2Score;
        team1Stats.pointsLost += (MAX_POINTS - game.team1Score);
        team1Stats.gameScores.push(game.team1Score);

        team2Stats.pointsScored += game.team2Score;
        team2Stats.pointsConceded += game.team1Score;
        team2Stats.pointsLost += (MAX_POINTS - game.team2Score);
        team2Stats.gameScores.push(game.team2Score);

        if (game.team1Score > game.team2Score) {
          team1Stats.wins++;
          team2Stats.losses++;
        } else if (game.team2Score > game.team1Score) {
          team2Stats.wins++;
          team1Stats.losses++;
        }

        team1Stats.pointDifferential = team1Stats.pointsScored - team1Stats.pointsConceded;
        team2Stats.pointDifferential = team2Stats.pointsScored - team2Stats.pointsConceded;
      }
    });
  });

  // Convert map to array and sort by wins (desc), then point differential (desc)
  return Array.from(teamMap.values()).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.pointDifferential - a.pointDifferential;
  });
}

/**
 * Calculates payouts for 12-player format
 * Entry fee: $2 per player
 * 1st place team: $6 each (total $12)
 * 2nd place team: $4 each (total $8)
 * 3rd place team: $2 each (total $4)
 * Total payout: $24, Total collected: $24
 */
export function calculate12PlayerPayouts(
  rounds: Round[],
  entryFee: number
): { [player: string]: number } {
  const teamStats = calculateTeamStats(rounds);
  const payouts: { [player: string]: number } = {};

  // Prize distribution for teams
  const teamPrizes = [6, 4, 2]; // Per player on 1st, 2nd, 3rd place teams

  // Initialize all players with negative entry fee
  teamStats.forEach((team) => {
    team.players.forEach((player) => {
      payouts[player] = -entryFee;
    });
  });

  // Add prizes to top 3 teams
  teamStats.slice(0, 3).forEach((team, index) => {
    team.players.forEach((player) => {
      payouts[player] += teamPrizes[index];
    });
  });

  return payouts;
}

/**
 * Calculates payouts for 12-player format including side bets
 */
export function calculate12PlayerPayoutsWithSideBets(
  rounds: Round[],
  entryFee: number,
  sideBets: SideBet[]
): { [player: string]: number } {
  // Start with tournament payouts
  const payouts = calculate12PlayerPayouts(rounds, entryFee);

  // Apply side bet wins/losses
  const sideBetTotals = calculateSideBetTotals(sideBets);
  Object.entries(sideBetTotals).forEach(([player, amount]) => {
    payouts[player] = (payouts[player] || 0) + amount;
  });

  return payouts;
}
