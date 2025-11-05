import { describe, it, expect } from 'vitest';
import {
  generateRoundRobinSchedule,
  calculatePlayerStats,
  calculatePayouts,
  type Round,
} from './scheduler';

describe('generateRoundRobinSchedule', () => {
  const players = ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace', 'Henry'];

  it('should generate exactly 7 rounds', () => {
    const rounds = generateRoundRobinSchedule(players);
    expect(rounds).toHaveLength(7);
  });

  it('should have exactly 2 games per round', () => {
    const rounds = generateRoundRobinSchedule(players);
    rounds.forEach((round) => {
      expect(round.games).toHaveLength(2);
    });
  });

  it('should ensure each player plays exactly 7 games', () => {
    const rounds = generateRoundRobinSchedule(players);
    const playerGameCounts: { [player: string]: number } = {};

    rounds.forEach((round) => {
      round.games.forEach((game) => {
        game.team1.forEach((player) => {
          playerGameCounts[player] = (playerGameCounts[player] || 0) + 1;
        });
        game.team2.forEach((player) => {
          playerGameCounts[player] = (playerGameCounts[player] || 0) + 1;
        });
      });
    });

    // Each player should play exactly 7 games
    Object.values(playerGameCounts).forEach((count) => {
      expect(count).toBe(7);
    });

    // All 8 players should be counted
    expect(Object.keys(playerGameCounts)).toHaveLength(8);
  });

  it('should ensure each player partners with every other player exactly once', () => {
    const rounds = generateRoundRobinSchedule(players);
    const partnerships: Map<string, number> = new Map();

    rounds.forEach((round) => {
      round.games.forEach((game) => {
        // Record team1 partnership
        const team1Partner = [game.team1[0], game.team1[1]].sort().join('-');
        partnerships.set(team1Partner, (partnerships.get(team1Partner) || 0) + 1);

        // Record team2 partnership
        const team2Partner = [game.team2[0], game.team2[1]].sort().join('-');
        partnerships.set(team2Partner, (partnerships.get(team2Partner) || 0) + 1);
      });
    });

    // With 8 players, there should be exactly C(8,2) = 28 unique partnerships
    expect(partnerships.size).toBe(28);

    // Each partnership should occur exactly once
    partnerships.forEach((count, partnership) => {
      expect(count, `Partnership ${partnership} should occur exactly once`).toBe(1);
    });
  });

  it('should throw error if not exactly 8 players', () => {
    expect(() => generateRoundRobinSchedule(['Alice', 'Bob'])).toThrow(
      'Exactly 8 players are required'
    );
    expect(() => generateRoundRobinSchedule([...players, 'Extra'])).toThrow(
      'Exactly 8 players are required'
    );
  });
});

describe('calculatePlayerStats', () => {
  const createMockRounds = (): Round[] => {
    return [
      {
        roundNumber: 1,
        games: [
          {
            id: 1,
            team1: ['Alice', 'Bob'],
            team2: ['Charlie', 'David'],
            team1Score: 21,
            team2Score: 15,
          },
          {
            id: 2,
            team1: ['Eve', 'Frank'],
            team2: ['Grace', 'Henry'],
            team1Score: 18,
            team2Score: 21,
          },
        ],
      },
      {
        roundNumber: 2,
        games: [
          {
            id: 3,
            team1: ['Alice', 'Charlie'],
            team2: ['Bob', 'David'],
            team1Score: 19,
            team2Score: 17,
          },
          {
            id: 4,
            team1: ['Eve', 'Grace'],
            team2: ['Frank', 'Henry'],
            team1Score: 21,
            team2Score: 14,
          },
        ],
      },
    ];
  };

  it('should calculate total points correctly', () => {
    const rounds = createMockRounds();
    const stats = calculatePlayerStats(rounds);

    expect(stats['Alice'].totalPoints).toBe(21 + 19);
    expect(stats['Bob'].totalPoints).toBe(21 + 17);
    expect(stats['Charlie'].totalPoints).toBe(15 + 19);
    expect(stats['Grace'].totalPoints).toBe(21 + 21);
  });

  it('should calculate points lost correctly (max 21 per game)', () => {
    const rounds = createMockRounds();
    const stats = calculatePlayerStats(rounds);

    // Alice: Game 1 = 21 (lost 0), Game 2 = 19 (lost 2) => total lost 2
    expect(stats['Alice'].pointsLost).toBe(0 + 2);

    // Charlie: Game 1 = 15 (lost 6), Game 2 = 19 (lost 2) => total lost 8
    expect(stats['Charlie'].pointsLost).toBe(6 + 2);

    // Grace: Game 1 = 21 (lost 0), Game 2 = 21 (lost 0) => total lost 0
    expect(stats['Grace'].pointsLost).toBe(0 + 0);

    // Henry: Game 1 = 21 (lost 0), Game 2 = 14 (lost 7) => total lost 7
    expect(stats['Henry'].pointsLost).toBe(0 + 7);
  });

  it('should track wins and losses correctly', () => {
    const rounds = createMockRounds();
    const stats = calculatePlayerStats(rounds);

    // Alice: won both games (Game 1: 21-15, Game 2: 19-17)
    expect(stats['Alice'].wins).toBe(2);
    expect(stats['Alice'].losses).toBe(0);

    // David: lost both games (Game 1: 15-21, Game 2: 17-19)
    expect(stats['David'].wins).toBe(0);
    expect(stats['David'].losses).toBe(2);

    // Grace: won 1 (Game 1: 21-18), lost 1 (Game 2: 21-14, so Eve/Grace won)
    // Actually, Grace WON Game 1 (21-18) and WON Game 2 (21-14)
    expect(stats['Grace'].wins).toBe(2);
    expect(stats['Grace'].losses).toBe(0);
  });

  it('should track games played correctly', () => {
    const rounds = createMockRounds();
    const stats = calculatePlayerStats(rounds);

    Object.values(stats).forEach((playerStats) => {
      expect(playerStats.gamesPlayed).toBe(2);
    });
  });

  it('should store game scores array correctly', () => {
    const rounds = createMockRounds();
    const stats = calculatePlayerStats(rounds);

    expect(stats['Alice'].gameScores).toEqual([21, 19]);
    expect(stats['Bob'].gameScores).toEqual([21, 17]);
    expect(stats['Eve'].gameScores).toEqual([18, 21]);
  });
});

describe('calculatePayouts', () => {
  const createFullTournamentRounds = (): Round[] => {
    // Simplified tournament with 8 players, 7 games each
    const players = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
    const rounds: Round[] = [];

    // Create 7 rounds with different scores
    for (let i = 0; i < 7; i++) {
      rounds.push({
        roundNumber: i + 1,
        games: [
          {
            id: i * 2 + 1,
            team1: [players[0], players[1]],
            team2: [players[2], players[3]],
            team1Score: 20 - i,
            team2Score: 15 + i,
          },
          {
            id: i * 2 + 2,
            team1: [players[4], players[5]],
            team2: [players[6], players[7]],
            team1Score: 18,
            team2Score: 16,
          },
        ],
      });
    }

    return rounds;
  };

  it('should award prizes to top 3 players with fewest points lost', () => {
    const rounds = createFullTournamentRounds();
    const entryFee = 2;
    const payouts = calculatePayouts(rounds, entryFee);

    // Count how many non-negative payouts (prize winners)
    const winners = Object.values(payouts).filter((payout) => payout >= 0);
    expect(winners).toHaveLength(3);

    // Top 3 should have positive or zero net amounts
    const sortedPayouts = Object.entries(payouts).sort(([, a], [, b]) => b - a);
    expect(sortedPayouts[0][1]).toBe(6); // 1st: $8 - $2 = $6
    expect(sortedPayouts[1][1]).toBe(4); // 2nd: $6 - $2 = $4
    expect(sortedPayouts[2][1]).toBe(0); // 3rd: $2 - $2 = $0
  });

  it('should charge entry fee to all players', () => {
    const rounds = createFullTournamentRounds();
    const entryFee = 2;
    const payouts = calculatePayouts(rounds, entryFee);

    // All payouts should account for the entry fee
    const losers = Object.values(payouts).filter((payout) => payout < 0);
    expect(losers).toHaveLength(5);

    // Each loser pays exactly the entry fee
    losers.forEach((payout) => {
      expect(payout).toBe(-entryFee);
    });
  });

  it('should have a balanced prize pool (money in = money out)', () => {
    const rounds = createFullTournamentRounds();
    const entryFee = 2;
    const payouts = calculatePayouts(rounds, entryFee);

    const totalPaid = Object.keys(payouts).length * entryFee; // 8 * 2 = 16
    const totalPrizes = 8 + 6 + 2; // 16

    expect(totalPaid).toBe(totalPrizes);

    // Net sum of all payouts should be 0
    const netSum = Object.values(payouts).reduce((sum, payout) => sum + payout, 0);
    expect(netSum).toBe(0);
  });

  it('should rank players by fewest points lost', () => {
    const rounds: Round[] = [
      {
        roundNumber: 1,
        games: [
          {
            id: 1,
            team1: ['Alice', 'Bob'],
            team2: ['Charlie', 'David'],
            team1Score: 21, // Alice & Bob: 0 points lost
            team2Score: 10, // Charlie & David: 11 points lost
          },
          {
            id: 2,
            team1: ['Eve', 'Frank'],
            team2: ['Grace', 'Henry'],
            team1Score: 19, // Eve & Frank: 2 points lost
            team2Score: 15, // Grace & Henry: 6 points lost
          },
        ],
      },
    ];

    const payouts = calculatePayouts(rounds, 2);

    // Alice and Bob should have the best payouts (0 points lost)
    // Grace and Henry should have worse payouts (6 points lost)
    expect(payouts['Alice']).toBeGreaterThan(payouts['Grace']);
    expect(payouts['Bob']).toBeGreaterThan(payouts['Henry']);
  });
});
