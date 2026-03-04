const RESULT_MULTIPLIERS = { standard: 1, gammon: 2, backgammon: 3 };
const VALID_CUBE_VALUES = new Set([1, 2, 4, 8, 16, 32, 64]);

export function calculateMatchPoints(resultType, cubeValue) {
  const multiplier = RESULT_MULTIPLIERS[resultType];
  if (multiplier === undefined) throw new Error(`Invalid resultType: "${resultType}"`);
  if (!VALID_CUBE_VALUES.has(cubeValue)) throw new Error(`Invalid cubeValue: ${cubeValue}`);
  return multiplier * cubeValue;
}

export function createGame({ player1Id, player2Id, winnerId, resultType, cubeValue, sequence }) {
  if (!player1Id || !player2Id) throw new Error('Both players are required');
  if (player1Id === player2Id) throw new Error('player1Id and player2Id must differ');
  if (winnerId !== player1Id && winnerId !== player2Id) throw new Error('winnerId must be one of the two players');
  const matchPoints = calculateMatchPoints(resultType, cubeValue);
  return {
    id: crypto.randomUUID(),
    player1Id,
    player2Id,
    winnerId,
    resultType,
    cubeValue,
    matchPoints,
    timestamp: Date.now(),
    sequence,
  };
}
