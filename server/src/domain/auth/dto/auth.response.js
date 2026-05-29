export class AuthResponse {
  static from({ user, token }) {
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
      },
    };
  }
}
