import { useState, useEffect } from 'react';
import './App.css';
import {
  generateRoundRobinSchedule,
  generate12PlayerSchedule,
  calculatePayoutsWithSideBets,
  calculate12PlayerPayoutsWithSideBets,
  calculatePlayerStats,
  calculateTeamStats,
  calculateSideBetTotals,
  type Round,
  type Game,
  type SideBet,
  type TournamentFormat,
} from './utils/scheduler';
import { updateURL, getStateFromURL, clearURLState } from './utils/urlState';

type Stage = 'input' | 'playing' | 'results';

function App() {
  const [stage, setStage] = useState<Stage>('input');
  const [format, setFormat] = useState<TournamentFormat>('8-player');
  const [playerNames, setPlayerNames] = useState<string[]>(Array(8).fill(''));
  const entryFee = 2; // Fixed entry fee of $2
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [sideBets, setSideBets] = useState<SideBet[]>([]);
  const [customPairing, setCustomPairing] = useState<boolean>(false);
  const [customTeams, setCustomTeams] = useState<Array<[string, string]>>([]);

  const handleFormatChange = (newFormat: TournamentFormat) => {
    setFormat(newFormat);
    const playerCount = newFormat === '8-player' ? 8 : 12;
    setPlayerNames(Array(playerCount).fill(''));
    setCustomPairing(false);
    setCustomTeams([]);
  };

  const handlePlayerNameChange = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const startTournament = () => {
    const expectedCount = format === '8-player' ? 8 : 12;
    const filledNames = playerNames.filter((name) => name.trim() !== '');

    if (filledNames.length !== expectedCount) {
      alert(`Please enter exactly ${expectedCount} player names`);
      return;
    }

    // For 12-player mode with custom pairing, validate teams
    if (format === '12-player' && customPairing) {
      if (customTeams.length !== 6) {
        alert('Please create exactly 6 teams');
        return;
      }

      // Validate all players are assigned
      const assignedPlayers = new Set<string>();
      customTeams.forEach(team => {
        assignedPlayers.add(team[0]);
        assignedPlayers.add(team[1]);
      });

      const allPlayers = playerNames.filter(name => name.trim() !== '');
      if (assignedPlayers.size !== allPlayers.length) {
        alert('All players must be assigned to a team');
        return;
      }
    }

    const schedule = format === '8-player'
      ? generateRoundRobinSchedule(playerNames)
      : generate12PlayerSchedule(playerNames, customPairing ? customTeams : undefined);
    setRounds(schedule);
    setCurrentRound(0);
    setStage('playing');
  };

  const setGameScore = (gameId: number, team1Score: number, team2Score: number) => {
    setRounds((prevRounds) =>
      prevRounds.map((round) => ({
        ...round,
        games: round.games.map((game) =>
          game.id === gameId ? { ...game, team1Score, team2Score } : game
        ),
      }))
    );
  };

  const goToNextRound = () => {
    if (currentRound < rounds.length - 1) {
      setCurrentRound(currentRound + 1);
    }
  };

  const goToPreviousRound = () => {
    if (currentRound > 0) {
      setCurrentRound(currentRound - 1);
    }
  };

  const finishTournament = () => {
    setStage('results');
  };

  const resetTournament = () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset the tournament? All progress, scores, and side bets will be lost.'
    );

    if (confirmed) {
      const playerCount = format === '8-player' ? 8 : 12;
      setPlayerNames(Array(playerCount).fill(''));
      setRounds([]);
      setCurrentRound(0);
      setSideBets([]);
      setCustomPairing(false);
      setCustomTeams([]);
      setStage('input');
      clearURLState();
    }
  };

  // Load state from URL on mount
  useEffect(() => {
    const urlState = getStateFromURL();
    if (urlState) {
      setStage(urlState.stage);
      if (urlState.format) setFormat(urlState.format);
      setPlayerNames(urlState.playerNames);
      setRounds(urlState.rounds);
      setCurrentRound(urlState.currentRound);
      setSideBets(urlState.sideBets);
      if (urlState.customPairing !== undefined) setCustomPairing(urlState.customPairing);
      if (urlState.customTeams) setCustomTeams(urlState.customTeams);
    }
  }, []);

  // Sync state to URL whenever it changes
  useEffect(() => {
    if (stage !== 'input' || playerNames.some(name => name.trim() !== '')) {
      updateURL({
        stage,
        format,
        playerNames,
        rounds,
        currentRound,
        sideBets,
        customPairing,
        customTeams,
      });
    }
  }, [stage, format, playerNames, rounds, currentRound, sideBets, customPairing, customTeams]);

  const addSideBet = (sideBet: SideBet) => {
    setSideBets([...sideBets, sideBet]);
  };

  const updateSideBet = (id: number, winner: 1 | 2) => {
    setSideBets(sideBets.map(bet =>
      bet.id === id ? { ...bet, winner } : bet
    ));
  };

  const deleteSideBet = (id: number) => {
    setSideBets(sideBets.filter(bet => bet.id !== id));
  };

  const allGamesCompleted = rounds.every((round) =>
    round.games.every((game) => game.team1Score !== undefined && game.team2Score !== undefined)
  );

  return (
    <div className="app">
      <header>
        <h1>🏸 Badminton Match Maker</h1>
        <p>Round-robin doubles tournament with payment calculation</p>
      </header>

      {stage === 'input' && (
        <div className="input-stage">
          <div className="format-selection">
            <h2>Select Tournament Format</h2>
            <div className="format-buttons">
              <button
                className={`format-button ${format === '8-player' ? 'active' : ''}`}
                onClick={() => handleFormatChange('8-player')}
              >
                8 Players (Social Doubles)
              </button>
              <button
                className={`format-button ${format === '12-player' ? 'active' : ''}`}
                onClick={() => handleFormatChange('12-player')}
              >
                12 Players (Team Round-Robin)
              </button>
            </div>
            <p className="format-description">
              {format === '8-player'
                ? 'Each player partners with every other player exactly once across 7 rounds.'
                : 'Players are randomly paired into 6 teams. Each team plays all other teams once across 5 rounds.'}
            </p>
          </div>

          <div className="player-inputs">
            <h2>Enter Player Names</h2>
            <div className="player-grid">
              {playerNames.map((name, index) => (
                <div key={index} className="player-input-row">
                  <label>Player {index + 1}:</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                    placeholder={`Player ${index + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {format === '12-player' && (
            <div className="custom-pairing-section">
              <h2>Team Pairing</h2>
              <div className="pairing-toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={customPairing}
                    onChange={(e) => {
                      setCustomPairing(e.target.checked);
                      if (!e.target.checked) {
                        setCustomTeams([]);
                      }
                    }}
                  />
                  Specify custom team pairings
                </label>
              </div>
              {!customPairing && (
                <p className="pairing-info">Teams will be randomly assigned</p>
              )}
              {customPairing && (
                <CustomPairingInterface
                  playerNames={playerNames.filter(name => name.trim() !== '')}
                  customTeams={customTeams}
                  onTeamsChange={setCustomTeams}
                />
              )}
            </div>
          )}

          <div className="wager-input">
            <h2>Prize Pool</h2>
            <div className="prize-info">
              <div className="prize-row">
                <span>Entry Fee:</span>
                <strong>${entryFee} per player</strong>
              </div>
              <div className="prize-row">
                <span>Total Pool:</span>
                <strong>${entryFee * playerNames.length}</strong>
              </div>
            </div>
            <div className="prize-distribution">
              <h3>Prize Distribution</h3>
              {format === '8-player' ? (
                <ul>
                  <li>🥇 1st Place: <strong>$8</strong></li>
                  <li>🥈 2nd Place: <strong>$6</strong></li>
                  <li>🥉 3rd Place: <strong>$2</strong></li>
                </ul>
              ) : (
                <ul>
                  <li>🥇 1st Place Team: <strong>$6 each</strong> (total $12)</li>
                  <li>🥈 2nd Place Team: <strong>$4 each</strong> (total $8)</li>
                  <li>🥉 3rd Place Team: <strong>$2 each</strong> (total $4)</li>
                </ul>
              )}
            </div>
            <p className="wager-info">
              {format === '8-player'
                ? 'Winner is determined by fewest points lost across all games.'
                : 'Teams are ranked by wins, then by point differential.'}
            </p>
          </div>

          <button className="start-button" onClick={startTournament}>
            Generate Tournament
          </button>
        </div>
      )}

      {stage === 'playing' && (
        <div className="playing-stage">
          <div className="tournament-header">
            <h2>
              Round {currentRound + 1} of {rounds.length}
            </h2>
            <div className="round-navigation">
              <button onClick={goToPreviousRound} disabled={currentRound === 0}>
                ← Previous Round
              </button>
              <button
                onClick={goToNextRound}
                disabled={currentRound === rounds.length - 1}
              >
                Next Round →
              </button>
            </div>
          </div>

          <div className="games-container">
            {rounds[currentRound]?.games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                onSetScore={(team1Score, team2Score) => setGameScore(game.id, team1Score, team2Score)}
              />
            ))}
          </div>

          <div className="tournament-actions">
            {allGamesCompleted ? (
              <button className="finish-button" onClick={finishTournament}>
                View Results & Payouts
              </button>
            ) : (
              <p className="completion-notice">
                Complete all games to view final results
              </p>
            )}
            <button className="reset-button" onClick={resetTournament}>
              Reset Tournament
            </button>
          </div>
        </div>
      )}

      {stage === 'results' && (
        <div className="results-stage">
          <h2>Tournament Results</h2>

          <div className="stats-container">
            <h3>{format === '8-player' ? 'Player Statistics' : 'Team Standings'}</h3>
            {format === '8-player' ? (
              <StatsTable rounds={rounds} />
            ) : (
              <TeamStatsTable rounds={rounds} />
            )}
          </div>

          <div className="sidebets-container">
            <h3>Side Bets</h3>
            <SideBetsManager
              playerNames={playerNames}
              sideBets={sideBets}
              onAddSideBet={addSideBet}
              onUpdateSideBet={updateSideBet}
              onDeleteSideBet={deleteSideBet}
            />
          </div>

          <div className="payouts-container">
            <h3>Payment Calculation</h3>
            <p className="wager-reminder">Entry Fee: ${entryFee} per player</p>
            <PayoutsTable rounds={rounds} entryFee={entryFee} sideBets={sideBets} format={format} />
          </div>

          <button className="reset-button" onClick={resetTournament}>
            New Tournament
          </button>
        </div>
      )}
    </div>
  );
}

function GameCard({
  game,
  onSetScore,
}: {
  game: Game;
  onSetScore: (team1Score: number, team2Score: number) => void;
}) {
  const [team1Input, setTeam1Input] = useState<string>(game.team1Score?.toString() || '');
  const [team2Input, setTeam2Input] = useState<string>(game.team2Score?.toString() || '');

  const handleScoreSubmit = () => {
    const score1 = parseInt(team1Input);
    const score2 = parseInt(team2Input);

    if (!isNaN(score1) && !isNaN(score2) && score1 >= 0 && score2 >= 0) {
      onSetScore(score1, score2);
    } else {
      alert('Please enter valid scores (non-negative numbers)');
    }
  };

  const isCompleted = game.team1Score !== undefined && game.team2Score !== undefined;
  const team1Won = game.team1Score !== undefined && game.team2Score !== undefined && game.team1Score > game.team2Score;
  const team2Won = game.team1Score !== undefined && game.team2Score !== undefined && game.team2Score > game.team1Score;

  return (
    <div className={`game-card ${isCompleted ? 'completed' : ''}`}>
      <h3>Game {game.id}</h3>
      <div className="teams">
        <div className={`team score-input ${team1Won ? 'winner' : team2Won ? 'loser' : ''}`}>
          <div className="team-label">Team 1</div>
          <div className="player-names">
            {game.team1[0]} & {game.team1[1]}
          </div>
          <input
            type="number"
            className="score-field"
            value={team1Input}
            onChange={(e) => setTeam1Input(e.target.value)}
            placeholder="Score"
            min="0"
          />
          {team1Won && <div className="winner-badge">✓ Winner</div>}
        </div>

        <div className="vs">VS</div>

        <div className={`team score-input ${team2Won ? 'winner' : team1Won ? 'loser' : ''}`}>
          <div className="team-label">Team 2</div>
          <div className="player-names">
            {game.team2[0]} & {game.team2[1]}
          </div>
          <input
            type="number"
            className="score-field"
            value={team2Input}
            onChange={(e) => setTeam2Input(e.target.value)}
            placeholder="Score"
            min="0"
          />
          {team2Won && <div className="winner-badge">✓ Winner</div>}
        </div>
      </div>
      <button className="submit-score-button" onClick={handleScoreSubmit}>
        {isCompleted ? 'Update Score' : 'Submit Score'}
      </button>
    </div>
  );
}

function StatsTable({ rounds }: { rounds: Round[] }) {
  const stats = calculatePlayerStats(rounds);
  const sortedPlayers = Object.entries(stats).sort(
    ([, a], [, b]) => a.pointsLost - b.pointsLost
  );
  console.log(stats);
  console.log(sortedPlayers);

  return (
    <>
      <table className="stats-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Points Lost</th>
            <th>Wins</th>
            <th>Losses</th>
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.map(([player, { pointsLost, wins, losses }], index) => (
            <tr key={player}>
              <td>{index + 1}</td>
              <td>{player}</td>
              <td><strong>{pointsLost}</strong></td>
              <td>{wins}</td>
              <td>{losses}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="game-breakdown">
        <h4>Game-by-Game Breakdown</h4>
        <table className="breakdown-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>G1</th>
              <th>G2</th>
              <th>G3</th>
              <th>G4</th>
              <th>G5</th>
              <th>G6</th>
              <th>G7</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map(([player, { gameScores }]) => (
              <tr key={player}>
                <td><strong>{player}</strong></td>
                {gameScores.map((score, index) => (
                  <td key={index} className={score === 21 ? 'perfect-score' : ''}>
                    {score}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TeamStatsTable({ rounds }: { rounds: Round[] }) {
  const teamStats = calculateTeamStats(rounds);

  return (
    <>
      <table className="stats-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Team</th>
            <th>Points Lost</th>
            <th>Wins</th>
            <th>Losses</th>
          </tr>
        </thead>
        <tbody>
          {teamStats.map((team, index) => (
            <tr key={team.teamName}>
              <td>
                <strong>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                </strong>
              </td>
              <td><strong>{team.teamName}</strong></td>
              <td><strong>{team.pointsLost}</strong></td>
              <td>{team.wins}</td>
              <td>{team.losses}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="game-breakdown">
        <h4>Game-by-Game Breakdown</h4>
        <table className="breakdown-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>G1</th>
              <th>G2</th>
              <th>G3</th>
              <th>G4</th>
              <th>G5</th>
            </tr>
          </thead>
          <tbody>
            {teamStats.map((team) => (
              <tr key={team.teamName}>
                <td><strong>{team.teamName}</strong></td>
                {team.gameScores.map((score, index) => (
                  <td key={index} className={score === 21 ? 'perfect-score' : ''}>
                    {score}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PayoutsTable({
  rounds,
  entryFee,
  sideBets,
  format,
}: {
  rounds: Round[];
  entryFee: number;
  sideBets: SideBet[];
  format: TournamentFormat;
}) {
  const sideBetTotals = calculateSideBetTotals(sideBets);

  if (format === '12-player') {
    const teamStats = calculateTeamStats(rounds);
    const payouts = calculate12PlayerPayoutsWithSideBets(rounds, entryFee, sideBets);
    const teamPrizes = [6, 4, 2];
    const totalPlayers = 12;
    const totalPaid = totalPlayers * entryFee;
    const totalPrizes = teamPrizes.reduce((sum, prize) => sum + prize * 2, 0);

    // Get all unique players with their payouts
    const allPlayers = new Map<string, { team: string; rank: number; prize: number }>();
    teamStats.forEach((team, index) => {
      const prize = index < 3 ? teamPrizes[index] : 0;
      team.players.forEach((player) => {
        allPlayers.set(player, { team: team.teamName, rank: index, prize });
      });
    });

    return (
      <>
        <div className="payout-info">
          <p>Total entry fees collected: <strong>${totalPaid}</strong></p>
          <p>Total prizes awarded: <strong>${totalPrizes}</strong></p>
        </div>
        <table className="payouts-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Team</th>
              <th>Team Rank</th>
              <th>Prize</th>
              <th>Entry Fee</th>
              <th>Side Bets</th>
              <th>Net Amount</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(allPlayers.entries()).map(([player, { team, rank, prize }]) => {
              const sideBetAmount = sideBetTotals[player] || 0;
              const netAmount = payouts[player];
              const rankDisplay = rank === 0 ? '🥇 1st' : rank === 1 ? '🥈 2nd' : rank === 2 ? '🥉 3rd' : `${rank + 1}th`;

              return (
                <tr key={player} className={netAmount > 0 ? 'winner' : netAmount < 0 ? 'loser' : ''}>
                  <td><strong>{player}</strong></td>
                  <td>{team}</td>
                  <td><strong>{rankDisplay}</strong></td>
                  <td className={prize > 0 ? 'positive' : ''}>
                    ${prize.toFixed(2)}
                  </td>
                  <td className="negative">-${entryFee.toFixed(2)}</td>
                  <td className={sideBetAmount > 0 ? 'positive' : sideBetAmount < 0 ? 'negative' : ''}>
                    {sideBetAmount !== 0 ? `${sideBetAmount > 0 ? '+' : ''}$${Math.abs(sideBetAmount).toFixed(2)}` : '$0.00'}
                  </td>
                  <td className={netAmount > 0 ? 'positive' : netAmount < 0 ? 'negative' : ''}>
                    <strong>${netAmount > 0 ? '+' : ''}{netAmount.toFixed(2)}</strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="payout-summary">
          <p>
            Balance: $
            {(totalPrizes - totalPaid).toFixed(2)}{' '}
            {Math.abs(totalPrizes - totalPaid) < 0.01 ? '✓' : '⚠️'}
          </p>
        </div>
      </>
    );
  }

  // 8-player format
  const stats = calculatePlayerStats(rounds);
  const payouts = calculatePayoutsWithSideBets(rounds, entryFee, sideBets);

  // Sort by points lost (ascending - fewest points lost wins)
  const sortedPlayers = Object.entries(stats).sort(
    ([, a], [, b]) => a.pointsLost - b.pointsLost
  );

  // Prize amounts
  const prizes = [8, 6, 2];

  const getRankDisplay = (rank: number) => {
    if (rank === 0) return '🥇 1st';
    if (rank === 1) return '🥈 2nd';
    if (rank === 2) return '🥉 3rd';
    return `${rank + 1}th`;
  };

  const getPrizeAmount = (rank: number) => {
    if (rank < prizes.length) return prizes[rank];
    return 0;
  };

  const totalPaid = sortedPlayers.length * entryFee;
  const totalPrizes = prizes.reduce((sum, prize) => sum + prize, 0);

  return (
    <>
      <div className="payout-info">
        <p>Total entry fees collected: <strong>${totalPaid}</strong></p>
        <p>Total prizes awarded: <strong>${totalPrizes}</strong></p>
      </div>
      <table className="payouts-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Points Lost</th>
            <th>Prize</th>
            <th>Entry Fee</th>
            <th>Side Bets</th>
            <th>Net Amount</th>
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.map(([player, playerStats], index) => {
            const prize = getPrizeAmount(index);
            const sideBetAmount = sideBetTotals[player] || 0;
            const netAmount = payouts[player];
            return (
              <tr key={player} className={netAmount > 0 ? 'winner' : netAmount < 0 ? 'loser' : ''}>
                <td><strong>{getRankDisplay(index)}</strong></td>
                <td>{player}</td>
                <td>{playerStats.pointsLost}</td>
                <td className={prize > 0 ? 'positive' : ''}>
                  ${prize.toFixed(2)}
                </td>
                <td className="negative">-${entryFee.toFixed(2)}</td>
                <td className={sideBetAmount > 0 ? 'positive' : sideBetAmount < 0 ? 'negative' : ''}>
                  {sideBetAmount !== 0 ? `${sideBetAmount > 0 ? '+' : ''}$${Math.abs(sideBetAmount).toFixed(2)}` : '$0.00'}
                </td>
                <td className={netAmount > 0 ? 'positive' : netAmount < 0 ? 'negative' : ''}>
                  <strong>${netAmount > 0 ? '+' : ''}{netAmount.toFixed(2)}</strong>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="payout-summary">
        <p>
          Balance: $
          {(totalPrizes - totalPaid).toFixed(2)}{' '}
          {Math.abs(totalPrizes - totalPaid) < 0.01 ? '✓' : '⚠️'}
        </p>
      </div>
    </>
  );
}

function SideBetsManager({
  playerNames,
  sideBets,
  onAddSideBet,
  onUpdateSideBet,
  onDeleteSideBet,
}: {
  playerNames: string[];
  sideBets: SideBet[];
  onAddSideBet: (sideBet: SideBet) => void;
  onUpdateSideBet: (id: number, winner: 1 | 2) => void;
  onDeleteSideBet: (id: number) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [team1Player1, setTeam1Player1] = useState('');
  const [team1Player2, setTeam1Player2] = useState('');
  const [team2Player1, setTeam2Player1] = useState('');
  const [team2Player2, setTeam2Player2] = useState('');
  const [amount, setAmount] = useState('');

  const handleAddSideBet = () => {
    if (!team1Player1 || !team1Player2 || !team2Player1 || !team2Player2 || !amount) {
      alert('Please fill in all fields');
      return;
    }

    const players = [team1Player1, team1Player2, team2Player1, team2Player2];
    const uniquePlayers = new Set(players);
    if (uniquePlayers.size !== 4) {
      alert('All four players must be different');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const newSideBet: SideBet = {
      id: Date.now(),
      team1: [team1Player1, team1Player2],
      team2: [team2Player1, team2Player2],
      amount: parsedAmount,
      winner: null,
    };

    onAddSideBet(newSideBet);
    setTeam1Player1('');
    setTeam1Player2('');
    setTeam2Player1('');
    setTeam2Player2('');
    setAmount('');
    setShowForm(false);
  };

  return (
    <div className="sidebets-manager">
      {!showForm && (
        <button className="add-sidebet-button" onClick={() => setShowForm(true)}>
          + Add Side Bet
        </button>
      )}

      {showForm && (
        <div className="sidebet-form">
          <h4>New Side Bet</h4>
          <div className="sidebet-teams">
            <div className="sidebet-team">
              <label>Team 1</label>
              <select value={team1Player1} onChange={(e) => setTeam1Player1(e.target.value)}>
                <option value="">Select Player 1</option>
                {playerNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <select value={team1Player2} onChange={(e) => setTeam1Player2(e.target.value)}>
                <option value="">Select Player 2</option>
                {playerNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="vs">VS</div>
            <div className="sidebet-team">
              <label>Team 2</label>
              <select value={team2Player1} onChange={(e) => setTeam2Player1(e.target.value)}>
                <option value="">Select Player 1</option>
                {playerNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <select value={team2Player2} onChange={(e) => setTeam2Player2(e.target.value)}>
                <option value="">Select Player 2</option>
                {playerNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="sidebet-amount">
            <label>Amount per player: $</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
          <div className="sidebet-form-actions">
            <button onClick={handleAddSideBet}>Add Side Bet</button>
            <button onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {sideBets.length > 0 && (
        <div className="sidebets-list">
          <table className="sidebets-table">
            <thead>
              <tr>
                <th>Team 1</th>
                <th>Team 2</th>
                <th>Amount</th>
                <th>Winner</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sideBets.map((bet) => (
                <tr key={bet.id} className={bet.winner ? 'completed' : ''}>
                  <td>{bet.team1[0]} & {bet.team1[1]}</td>
                  <td>{bet.team2[0]} & {bet.team2[1]}</td>
                  <td>${bet.amount.toFixed(2)}</td>
                  <td>
                    {bet.winner === null ? (
                      <div className="winner-buttons">
                        <button onClick={() => onUpdateSideBet(bet.id, 1)}>Team 1</button>
                        <button onClick={() => onUpdateSideBet(bet.id, 2)}>Team 2</button>
                      </div>
                    ) : (
                      <span className="winner-badge">
                        {bet.winner === 1 ? 'Team 1 Won' : 'Team 2 Won'}
                      </span>
                    )}
                  </td>
                  <td>
                    <button className="delete-button" onClick={() => onDeleteSideBet(bet.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CustomPairingInterface({
  playerNames,
  customTeams,
  onTeamsChange,
}: {
  playerNames: string[];
  customTeams: Array<[string, string]>;
  onTeamsChange: (teams: Array<[string, string]>) => void;
}) {
  const handleTeamChange = (teamIndex: number, playerIndex: 0 | 1, value: string) => {
    const newTeams = [...customTeams];
    if (newTeams[teamIndex]) {
      newTeams[teamIndex] = [...newTeams[teamIndex]] as [string, string];
      newTeams[teamIndex][playerIndex] = value;
    } else {
      newTeams[teamIndex] = ['', ''];
      newTeams[teamIndex][playerIndex] = value;
    }
    onTeamsChange(newTeams);
  };

  const addTeam = () => {
    if (customTeams.length < 6) {
      onTeamsChange([...customTeams, ['', '']]);
    }
  };

  const removeTeam = (teamIndex: number) => {
    const newTeams = customTeams.filter((_, index) => index !== teamIndex);
    onTeamsChange(newTeams);
  };

  const getAvailablePlayers = (teamIndex: number, playerIndex: 0 | 1) => {
    const assignedPlayers = new Set<string>();
    customTeams.forEach((team, idx) => {
      if (idx !== teamIndex) {
        if (team[0]) assignedPlayers.add(team[0]);
        if (team[1]) assignedPlayers.add(team[1]);
      } else {
        // For the current team, only mark the other player as assigned
        if (playerIndex === 0 && team[1]) assignedPlayers.add(team[1]);
        if (playerIndex === 1 && team[0]) assignedPlayers.add(team[0]);
      }
    });

    return playerNames.filter(name => !assignedPlayers.has(name));
  };

  return (
    <div className="custom-pairing-interface">
      <div className="teams-list">
        {customTeams.map((team, teamIndex) => (
          <div key={teamIndex} className="team-pairing">
            <div className="team-header">
              <span>Team {teamIndex + 1}</span>
              <button
                className="remove-team-button"
                onClick={() => removeTeam(teamIndex)}
              >
                Remove
              </button>
            </div>
            <div className="team-players">
              <select
                value={team[0] || ''}
                onChange={(e) => handleTeamChange(teamIndex, 0, e.target.value)}
              >
                <option value="">Select Player 1</option>
                {getAvailablePlayers(teamIndex, 0).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
                {team[0] && !getAvailablePlayers(teamIndex, 0).includes(team[0]) && (
                  <option value={team[0]}>{team[0]}</option>
                )}
              </select>
              <span className="pairing-separator">&</span>
              <select
                value={team[1] || ''}
                onChange={(e) => handleTeamChange(teamIndex, 1, e.target.value)}
              >
                <option value="">Select Player 2</option>
                {getAvailablePlayers(teamIndex, 1).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
                {team[1] && !getAvailablePlayers(teamIndex, 1).includes(team[1]) && (
                  <option value={team[1]}>{team[1]}</option>
                )}
              </select>
            </div>
          </div>
        ))}
      </div>
      {customTeams.length < 6 && (
        <button className="add-team-button" onClick={addTeam}>
          + Add Team
        </button>
      )}
      {playerNames.length === 12 && customTeams.length < 6 && (
        <p className="pairing-hint">
          You need {6 - customTeams.length} more team(s) for 12 players
        </p>
      )}
    </div>
  );
}

export default App;
