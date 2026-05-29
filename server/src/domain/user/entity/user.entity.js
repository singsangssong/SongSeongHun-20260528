export class User {
  constructor({ id = null, externalId, createdAt = null, updatedAt = null }) {
    if (!externalId) {
      throw new Error('User.externalId is required');
    }

    this.id = id;
    this.externalId = externalId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

