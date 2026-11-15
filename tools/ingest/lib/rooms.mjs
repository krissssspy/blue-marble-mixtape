import table from '../rooms.json' with { type: 'json' };

export function assignRoom(source, view) {
  const room = table.assignments[source.id];
  if (!room) throw new Error(`No room assignment for SVS source ${source.id}.`);

  const featured = table.featuredViews[source.id]?.includes(view.groupId) ?? false;
  return { room, featured };
}
