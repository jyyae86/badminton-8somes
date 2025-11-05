// Analyze the current schedule
const schedule = [
  [[0, 1, 2, 3], [4, 5, 6, 7]], // Round 1
  [[0, 2, 1, 4], [3, 6, 5, 7]], // Round 2
  [[0, 3, 1, 5], [2, 7, 4, 6]], // Round 3
  [[0, 4, 1, 6], [2, 5, 3, 7]], // Round 4
  [[0, 5, 1, 7], [2, 4, 3, 6]], // Round 5
  [[0, 6, 2, 4], [1, 3, 5, 7]], // Round 6
  [[0, 7, 3, 4], [1, 2, 5, 6]], // Round 7
];

const partnerships = new Map();

schedule.forEach((roundGames, roundIndex) => {
  console.log(`\nRound ${roundIndex + 1}:`);
  roundGames.forEach((gameIndices, gameIndex) => {
    const team1 = [gameIndices[0], gameIndices[1]].sort().join('-');
    const team2 = [gameIndices[2], gameIndices[3]].sort().join('-');

    console.log(`  Game ${gameIndex + 1}: [${gameIndices[0]},${gameIndices[1]}] vs [${gameIndices[2]},${gameIndices[3]}] => ${team1} and ${team2}`);

    partnerships.set(team1, (partnerships.get(team1) || 0) + 1);
    partnerships.set(team2, (partnerships.get(team2) || 0) + 1);
  });
});

console.log(`\n\nTotal unique partnerships: ${partnerships.size}`);
console.log('\nPartnerships that occur more than once:');
partnerships.forEach((count, partnership) => {
  if (count > 1) {
    console.log(`  ${partnership}: ${count} times`);
  }
});

// Generate all possible partnerships
const allPossible = [];
for (let i = 0; i < 8; i++) {
  for (let j = i + 1; j < 8; j++) {
    allPossible.push(`${i}-${j}`);
  }
}

console.log(`\nTotal possible partnerships: ${allPossible.length}`);
console.log('\nMissing partnerships:');
allPossible.forEach(p => {
  if (!partnerships.has(p)) {
    console.log(`  ${p}`);
  }
});
