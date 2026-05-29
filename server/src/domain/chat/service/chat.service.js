import { OnboardingService } from '../../onboarding/service/onboarding.service.js';
import { ChatTurnWorkflow } from './chat-turn.workflow.js';

export class ChatService {
  constructor({
    userRepository,
    userPreferenceRepository,
    chatSessionRepository,
    chatMessageRepository,
    onboardingService = new OnboardingService(),
    ragWorkflow = null,
    chatTurnWorkflow = null,
  }) {
    this.userRepository = userRepository;
    this.userPreferenceRepository = userPreferenceRepository;
    this.chatSessionRepository = chatSessionRepository;
    this.chatMessageRepository = chatMessageRepository;
    this.chatTurnWorkflow =
      chatTurnWorkflow ??
      new ChatTurnWorkflow({
        onboardingService,
        ragWorkflow,
      });
  }

  async sendMessage({ externalUserId = 'demo-user', message, sessionId = null }) {
    if (!message || typeof message !== 'string' || !message.trim()) {
      return {
        statusCode: 400,
        body: {
          error: 'message is required',
        },
      };
    }

    const user = await this.findOrCreateUser(externalUserId);
    const preference = await this.findOrCreatePreference(user.id);
    const trimmedMessage = message.trim();
    const session = await this.findOrCreateSession({
      sessionId,
      userId: user.id,
      title: trimmedMessage.slice(0, 60),
    });

    await this.chatMessageRepository.create({
      sessionId: session.id,
      userId: user.id,
      role: 'user',
      content: trimmedMessage,
    });

    const turnResult = await this.chatTurnWorkflow.invoke({
      user,
      preference,
      message: trimmedMessage,
    });

    if (turnResult.preferencePatch) {
      const updatedPreference = await this.userPreferenceRepository.updateOnboarding({
        userId: user.id,
        patch: turnResult.preferencePatch,
      });

      await this.chatMessageRepository.create({
        sessionId: session.id,
        userId: user.id,
        role: 'assistant',
        content: turnResult.assistantMessage,
        metadata: {
          next_action: turnResult.nextAction,
        },
      });

      return {
        statusCode: 200,
        body: {
          user_id: user.externalId,
          session_id: session.id,
          is_onboarding_completed: updatedPreference.isOnboardingCompleted,
          next_action: turnResult.nextAction,
          message: turnResult.assistantMessage,
        },
      };
    }

    await this.chatMessageRepository.create({
      sessionId: session.id,
      userId: user.id,
      role: 'assistant',
      content: turnResult.assistantMessage,
      metadata: {
        next_action: turnResult.nextAction,
        retrieved_document_ids: turnResult.retrievedDocuments.map(
          (document) => document.id,
        ),
      },
    });

    return {
      statusCode: 200,
      body: {
        user_id: user.externalId,
        session_id: session.id,
        is_onboarding_completed: preference.isOnboardingCompleted,
        next_action: turnResult.nextAction,
        message: turnResult.assistantMessage,
        retrieved_document_ids: turnResult.retrievedDocuments.map(
          (document) => document.id,
        ),
      },
    };
  }

  async findOrCreateUser(externalUserId) {
    const user = await this.userRepository.findByExternalId(externalUserId);
    if (user) return user;

    return this.userRepository.create({
      externalId: externalUserId,
    });
  }

  async findOrCreatePreference(userId) {
    const preference = await this.userPreferenceRepository.findByUserId(userId);
    if (preference) return preference;

    return this.userPreferenceRepository.createDefault({
      userId,
    });
  }

  async findOrCreateSession({ sessionId, userId, title }) {
    if (sessionId) {
      const session = await this.chatSessionRepository.findByIdForUser({
        id: sessionId,
        userId,
      });
      if (session) return session;
    }

    return this.chatSessionRepository.create({
      userId,
      title,
    });
  }
}
