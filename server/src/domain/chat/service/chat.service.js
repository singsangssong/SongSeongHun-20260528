import { OnboardingService } from '../../onboarding/service/onboarding.service.js';

export class ChatService {
  constructor({
    userRepository,
    userPreferenceRepository,
    chatSessionRepository,
    chatMessageRepository,
    onboardingService = new OnboardingService(),
    ragWorkflow = null,
  }) {
    this.userRepository = userRepository;
    this.userPreferenceRepository = userPreferenceRepository;
    this.chatSessionRepository = chatSessionRepository;
    this.chatMessageRepository = chatMessageRepository;
    this.onboardingService = onboardingService;
    this.ragWorkflow = ragWorkflow;
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

    if (preference.isOnboardingCompleted && this.ragWorkflow) {
      const ragResult = await this.ragWorkflow.invoke({
        userId: user.externalId,
        message: trimmedMessage,
        userPreferences: preference,
      });

      await this.chatMessageRepository.create({
        sessionId: session.id,
        userId: user.id,
        role: 'assistant',
        content: ragResult.answer,
        metadata: {
          next_action: ragResult.nextAction,
          retrieved_document_ids: ragResult.retrievedDocuments.map(
            (document) => document.id,
          ),
        },
      });

      return {
        statusCode: 200,
        body: {
          user_id: user.externalId,
          session_id: session.id,
          is_onboarding_completed: true,
          next_action: ragResult.nextAction,
          message: ragResult.answer,
          retrieved_document_ids: ragResult.retrievedDocuments.map(
            (document) => document.id,
          ),
        },
      };
    }

    const onboardingResult = this.onboardingService.handleAnswer({
      preference,
      message: trimmedMessage,
    });
    const updatedPreference = await this.userPreferenceRepository.updateOnboarding({
      userId: user.id,
      patch: onboardingResult.preferencePatch,
    });

    await this.chatMessageRepository.create({
      sessionId: session.id,
      userId: user.id,
      role: 'assistant',
      content: onboardingResult.assistantMessage,
      metadata: {
        next_action: onboardingResult.nextAction,
      },
    });

    return {
      statusCode: 200,
      body: {
        user_id: user.externalId,
        session_id: session.id,
        is_onboarding_completed: updatedPreference.isOnboardingCompleted,
        next_action: onboardingResult.nextAction,
        message: onboardingResult.assistantMessage,
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
