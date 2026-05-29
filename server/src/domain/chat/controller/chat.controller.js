export class ChatController {
  constructor({ chatService }) {
    this.chatService = chatService;
  }

  sendMessage = async (request, response, next) => {
    try {
      const { message, user_id } = request.body ?? {};
      const result = await this.chatService.sendMessage({
        externalUserId: user_id,
        message,
      });

      return response.status(result.statusCode).json(result.body);
    } catch (error) {
      return next(error);
    }
  };
}

