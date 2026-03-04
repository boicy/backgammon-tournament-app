export function validatePlayerName(name, existingPlayers) {
  const trimmed = (name || '').trim();
  if (!trimmed) throw new Error('Player name is required');
  if (trimmed.length > 50) throw new Error('Player name must be 50 characters or fewer');
  const duplicate = existingPlayers.some(p => p.name.toLowerCase() === trimmed.toLowerCase());
  if (duplicate) throw new Error(`"${trimmed}" already exists`);
}

export function createPlayer(name, existingPlayers) {
  const trimmed = (name || '').trim();
  validatePlayerName(trimmed, existingPlayers);
  return { id: crypto.randomUUID(), name: trimmed };
}
