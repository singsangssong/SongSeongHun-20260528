export class User {
  constructor({
    id = null,
    externalId,
    email = null,
    nickname = null,
    passwordHash = null,
    createdAt = null,
    updatedAt = null,
  }) {
    if (!externalId) {
      throw new Error('User.externalId is required');
    }

    this.id = id;
    this.externalId = externalId;
    this.email = email;
    this.nickname = nickname;
    this.passwordHash = passwordHash;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
