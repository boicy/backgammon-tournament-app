export function createTournament(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) throw new Error('Tournament name is required');
  return {
    id: crypto.randomUUID(),
    name: trimmed,
    date: new Date().toISOString(),
    status: 'active',
  };
}
