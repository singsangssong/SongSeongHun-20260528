export class AuthController {
  constructor({ authService }) {
    this.authService = authService;
  }

  signup = async (request, response, next) => {
    try {
      const result = await this.authService.signup(request.body ?? {});
      return response.status(result.statusCode).json(result.body);
    } catch (error) {
      return next(error);
    }
  };

  login = async (request, response, next) => {
    try {
      const result = await this.authService.login(request.body ?? {});
      return response.status(result.statusCode).json(result.body);
    } catch (error) {
      return next(error);
    }
  };
}
