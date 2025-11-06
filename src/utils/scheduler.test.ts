import { describe, it, expect } from 'vitest';
import {
  generateRoundRobinSchedule,
  generate12PlayerSchedule,
  calculatePlayerStats,
  calculateTeamStats,
  calculatePayouts,
  calculate12PlayerPayouts,
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

describe('generate12PlayerSchedule', () => {
  const players = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12'];

  it('should generate exactly 5 rounds', () => {
    const rounds = generate12PlayerSchedule(players);
    expect(rounds).toHaveLength(5);
  });

  it('should have exactly 3 games per round', () => {
    const rounds = generate12PlayerSchedule(players);
    rounds.forEach((round) => {
      expect(round.games).toHaveLength(3);
    });
  });

  it('should ensure each team (pair) plays exactly 5 games', () => {
    const rounds = generate12PlayerSchedule(players);
    const teamGameCounts = new Map<string, number>();

    rounds.forEach((round) => {
      round.games.forEach((game) => {
        const team1Key = [...game.team1].sort().join('-');
        const team2Key = [...game.team2].sort().join('-');
        teamGameCounts.set(team1Key, (teamGameCounts.get(team1Key) || 0) + 1);
        teamGameCounts.set(team2Key, (teamGameCounts.get(team2Key) || 0) + 1);
      });
    });

    // With 6 teams in round-robin, each team plays 5 games
    teamGameCounts.forEach((count) => {
      expect(count).toBe(5);
    });

    // Should have exactly 6 teams
    expect(teamGameCounts.size).toBe(6);
  });

  it('should ensure each team plays every other team exactly once', () => {
    const rounds = generate12PlayerSchedule(players);
    const matchups = new Set<string>();

    rounds.forEach((round) => {
      round.games.forEach((game) => {
        const team1Key = [...game.team1].sort().join('-');
        const team2Key = [...game.team2].sort().join('-');
        const matchupKey = [team1Key, team2Key].sort().join(' vs ');

        // Check for duplicates
        expect(matchups.has(matchupKey)).toBe(false);
        matchups.add(matchupKey);
      });
    });

    // With 6 teams, there should be C(6,2) = 15 unique matchups
    expect(matchups.size).toBe(15);
  });

  it('should throw error if not exactly 12 players', () => {
    expect(() => generate12PlayerSchedule(['P1', 'P2'])).toThrow(
      'Exactly 12 players are required'
    );
    expect(() => generate12PlayerSchedule([...players, 'P13'])).toThrow(
      'Exactly 12 players are required'
    );
  });
});

describe('calculateTeamStats', () => {
  const createMock12PlayerRounds = (): Round[] => {
    return [
      {
        roundNumber: 1,
        games: [
          {
            id: 1,
            team1: ['P1', 'P2'],
            team2: ['P3', 'P4'],
            team1Score: 21,
            team2Score: 15,
          },
          {
            id: 2,
            team1: ['P5', 'P6'],
            team2: ['P7', 'P8'],
            team1Score: 18,
            team2Score: 21,
          },
          {
            id: 3,
            team1: ['P9', 'P10'],
            team2: ['P11', 'P12'],
            team1Score: 19,
            team2Score: 17,
          },
        ],
      },
      {
        roundNumber: 2,
        games: [
          {
            id: 4,
            team1: ['P1', 'P2'],
            team2: ['P5', 'P6'],
            team1Score: 20,
            team2Score: 18,
          },
          {
            id: 5,
            team1: ['P3', 'P4'],
            team2: ['P7', 'P8'],
            team1Score: 21,
            team2Score: 19,
          },
          {
            id: 6,
            team1: ['P9', 'P10'],
            team2: ['P11', 'P12'],
            team1Score: 16,
            team2Score: 21,
          },
        ],
      },
    ];
  };

  it('should calculate wins and losses correctly', () => {
    const rounds = createMock12PlayerRounds();
    const teamStats = calculateTeamStats(rounds);

    // P1 & P2 won both games
    const p1p2Team = teamStats.find(t =>
      t.players.includes('P1') && t.players.includes('P2')
    );
    expect(p1p2Team?.wins).toBe(2);
    expect(p1p2Team?.losses).toBe(0);

    // P11 & P12 lost one and won one
    const p11p12Team = teamStats.find(t =>
      t.players.includes('P11') && t.players.includes('P12')
    );
    expect(p11p12Team?.wins).toBe(1);
    expect(p11p12Team?.losses).toBe(1);
  });

  it('should calculate point differential correctly', () => {
    const rounds = createMock12PlayerRounds();
    const teamStats = calculateTeamStats(rounds);

    // P1 & P2: (21 + 20) - (15 + 18) = 41 - 33 = +8
    const p1p2Team = teamStats.find(t =>
      t.players.includes('P1') && t.players.includes('P2')
    );
    expect(p1p2Team?.pointDifferential).toBe(8);
  });

  it('should sort teams by wins first, then point differential', () => {
    const rounds = createMock12PlayerRounds();
    const teamStats = calculateTeamStats(rounds);

    // First team should have most wins
    for (let i = 0; i < teamStats.length - 1; i++) {
      if (teamStats[i].wins === teamStats[i + 1].wins) {
        // If wins are equal, check point differential
        expect(teamStats[i].pointDifferential).toBeGreaterThanOrEqual(
          teamStats[i + 1].pointDifferential
        );
      } else {
        expect(teamStats[i].wins).toBeGreaterThan(teamStats[i + 1].wins);
      }
    }
  });
});

describe('calculate12PlayerPayouts', () => {
  const createMock12PlayerRounds = (): Round[] => {
    const teams = [
      ['P1', 'P2'],
      ['P3', 'P4'],
      ['P5', 'P6'],
      ['P7', 'P8'],
      ['P9', 'P10'],
      ['P11', 'P12'],
    ];

    // Create rounds where teams have clear rankings
    return Array.from({ length: 5 }, (_, roundIdx) => ({
      roundNumber: roundIdx + 1,
      games: [
        {
          id: roundIdx * 3 + 1,
          team1: teams[0] as [string, string],
          team2: teams[1] as [string, string],
          team1Score: 21,
          team2Score: 18,
        },
        {
          id: roundIdx * 3 + 2,
          team1: teams[2] as [string, string],
          team2: teams[3] as [string, string],
          team1Score: 19,
          team2Score: 17,
        },
        {
          id: roundIdx * 3 + 3,
          team1: teams[4] as [string, string],
          team2: teams[5] as [string, string],
          team1Score: 16,
          team2Score: 15,
        },
      ],
    }));
  };

  it('should award $6 to each player on 1st place team', () => {
    const rounds = createMock12PlayerRounds();
    const payouts = calculate12PlayerPayouts(rounds, 2);

    // P1 & P2 should be first place (won all games)
    expect(payouts['P1']).toBe(4); // $6 prize - $2 entry = $4
    expect(payouts['P2']).toBe(4);
  });

  it('should award $4 to each player on 2nd place team', () => {
    const rounds = createMock12PlayerRounds();
    const payouts = calculate12PlayerPayouts(rounds, 2);

    // P5 & P6 won all their games (second most dominant)
    expect(payouts['P5']).toBe(2); // $4 prize - $2 entry = $2
    expect(payouts['P6']).toBe(2);
  });

  it('should award $2 to each player on 3rd place team', () => {
    const rounds = createMock12PlayerRounds();
    const payouts = calculate12PlayerPayouts(rounds, 2);

    // P9 & P10 won all their games (third)
    expect(payouts['P9']).toBe(0); // $2 prize - $2 entry = $0
    expect(payouts['P10']).toBe(0);
  });

  it('should have balanced prize pool', () => {
    const rounds = createMock12PlayerRounds();
    const payouts = calculate12PlayerPayouts(rounds, 2);

    const totalCollected = 12 * 2; // 12 players × $2 = $24
    const totalPrizes = (6 + 4 + 2) * 2; // (1st + 2nd + 3rd) × 2 players = $24

    expect(totalCollected).toBe(totalPrizes);

    // Net sum should be 0
    const netSum = Object.values(payouts).reduce((sum, payout) => sum + payout, 0);
    expect(netSum).toBe(0);
  });
});
