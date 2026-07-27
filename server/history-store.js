export function createHistoryStore(db) {
  return {
    async create(userId, question) {
      const result = await db.query(
        'INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at, updated_at',
        [userId, question.slice(0, 80)],
      );
      return result.rows[0];
    },
    async save(conversationId, userId, question, answer, sources) {
      return db.transaction(async (client) => {
        const conversation = await client.query(
          'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
          [conversationId, userId],
        );

        if (!conversation.rowCount) return false;

        await client.query(
          `INSERT INTO messages (conversation_id, role, content, sources)
           VALUES ($1, 'user', $2, '[]'), ($1, 'assistant', $3, $4::jsonb)`,
          [conversationId, question, answer, JSON.stringify(sources)],
        );
        await client.query(
          'UPDATE conversations SET updated_at = now() WHERE id = $1',
          [conversationId],
        );

        return true;
      });
    },
    async list(userId) {
      const result = await db.query(
        'SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 50',
        [userId],
      );
      return result.rows;
    },
    async get(userId, id) {
      const owner = await db.query('SELECT id, title FROM conversations WHERE id = $1 AND user_id = $2', [id, userId]);
      if (!owner.rowCount) return null;
      const messages = await db.query(
        'SELECT role, content, sources, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at, id',
        [id],
      );
      return { ...owner.rows[0], messages: messages.rows };
    },
  };
}
