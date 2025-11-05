// Using a known valid solution from combinatorial design theory
// This is a Resolvable Balanced Incomplete Block Design (RBIBD)
// for 8 players in social doubles format

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

// Verify this schedule
const partnerships = new Map();
const playerGames = new Array(8).fill(0);

schedule.forEach((roundGames, roundIndex) => {
  console.log(`\nRound ${roundIndex + 1}:`);
  roundGames.forEach((gameIndices, gameIndex) => {
    const team1 = [gameIndices[0], gameIndices[1]].sort().join('-');
    const team2 = [gameIndices[2], gameIndices[3]].sort().join('-');

    console.log(`  Game ${gameIndex + 1}: [${gameIndices[0]},${gameIndices[1]}] vs [${gameIndices[2]},${gameIndices[3]}] => ${team1} and ${team2}`);

    partnerships.set(team1, (partnerships.get(team1) || 0) + 1);
    partnerships.set(team2, (partnerships.get(team2) || 0) + 1);

    // Count games per player
    gameIndices.forEach(p => playerGames[p]++);
  });
});

console.log(`\n\n✅ Verification Results:`);
console.log(`Total unique partnerships: ${partnerships.size} (expected 28)`);

console.log('\nGames per player:');
playerGames.forEach((count, player) => {
  console.log(`  Player ${player}: ${count} games`);
});

console.log('\nPartnerships that occur more than once:');
let duplicates = false;
partnerships.forEach((count, partnership) => {
  if (count > 1) {
    console.log(`  ${partnership}: ${count} times`);
    duplicates = true;
  }
});
if (!duplicates) {
  console.log('  None ✅');
}

// Generate all possible partnerships
const allPossible = [];
for (let i = 0; i < 8; i++) {
  for (let j = i + 1; j < 8; j++) {
    allPossible.push(`${i}-${j}`);
  }
}

console.log('\nMissing partnerships:');
let missing = false;
allPossible.forEach(p => {
  if (!partnerships.has(p)) {
    console.log(`  ${p}`);
    missing = true;
  }
});
if (!missing) {
  console.log('  None ✅');
}

if (partnerships.size === 28 && !duplicates && !missing && playerGames.every(count => count === 7)) {
  console.log('\n🎉 PERFECT SCHEDULE! All requirements met.');
  console.log('\nHere is the valid schedule to use:');
  console.log(JSON.stringify(schedule, null, 2));
} else {
  console.log('\n❌ Schedule has issues that need fixing.');
}
