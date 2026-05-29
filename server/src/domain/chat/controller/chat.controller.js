export class ChatController {
  constructor({ chatService }) {
    this.chatService = chatService;
  }

  sendMessage = async (request, response, next) => {
    try {
      const { message, user_id, session_id } = request.body ?? {};
      const result = await this.chatService.sendMessage({
        externalUserId: request.user.externalId,
        message,
        sessionId: session_id,
      });

      return response.status(result.statusCode).json(result.body);
    } catch (error) {
      return next(error);
    }
  };

  listSessions = async (request, response, next) => {
    try {
      const result = await this.chatService.listSessions({
        externalUserId: request.user.externalId,
      });

      return response.status(result.statusCode).json(result.body);
    } catch (error) {
      return next(error);
    }
  };

  listMessages = async (request, response, next) => {
    try {
      const result = await this.chatService.listMessages({
        externalUserId: request.user.externalId,
        sessionId: request.params.sessionId,
      });

      return response.status(result.statusCode).json(result.body);
    } catch (error) {
      return next(error);
    }
  };
}
