import { User } from '../entity/user.entity.js';

function toUser(row) {
  if (!row) return null;

  return new User({
    id: row.id,
    externalId: row.external_id,
    email: row.email,
    nickname: row.nickname,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export class UserRepository {
  constructor(db) {
    this.db = db;
  }

  async findByExternalId(externalId) {
    const [rows] = await this.db.execute(
      `SELECT id, external_id, email, nickname, password_hash, created_at, updated_at
       FROM users
       WHERE external_id = ?
       LIMIT 1`,
      [externalId],
    );

    return toUser(rows[0]);
  }

  async findByEmail(email) {
    const [rows] = await this.db.execute(
      `SELECT id, external_id, email, nickname, password_hash, created_at, updated_at
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email],
    );

    return toUser(rows[0]);
  }

  async create({ externalId }) {
    const [result] = await this.db.execute(
      `INSERT INTO users (external_id)
       VALUES (?)`,
      [externalId],
    );

    return new User({
      id: result.insertId,
      externalId,
    });
  }

  async createWithAuth({ email, nickname, passwordHash }) {
    const externalId = email;
    const [result] = await this.db.execute(
      `INSERT INTO users (external_id, email, nickname, password_hash)
       VALUES (?, ?, ?, ?)`,
      [externalId, email, nickname, passwordHash],
    );

    return new User({
      id: result.insertId,
      externalId,
      email,
      nickname,
      passwordHash,
    });
  }
}
