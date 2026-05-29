export class ChatController {
  constructor({ chatService }) {
    this.chatService = chatService;
  }

  sendMessage = async (request, response, next) => {
    try {
      const { message, user_id, session_id } = request.body ?? {};
      const result = await this.chatService.sendMessage({
        externalUserId: user_id,
        message,
        sessionId: session_id,
      });

      return response.status(result.statusCode).json(result.body);
    } catch (error) {
      return next(error);
    }
  };
}
