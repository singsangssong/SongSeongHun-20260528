const onboardingQuestion =
  '정확한 추천을 위해 몇 가지 여쭤볼게요. 현재 가장 큰 건강 고민은 무엇인가요? 예: 피로, 수면, 눈 건강, 갱년기, 장 건강';

export class ChatService {
  constructor({
    userRepository,
    userPreferenceRepository,
    chatSessionRepository,
    chatMessageRepository,
    ragWorkflow = null,
  }) {
    this.userRepository = userRepository;
    this.userPreferenceRepository = userPreferenceRepository;
    this.chatSessionRepository = chatSessionRepository;
    this.chatMessageRepository = chatMessageRepository;
    this.ragWorkflow = ragWorkflow;
  }

  async sendMessage({ externalUserId = 'demo-user', message }) {
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
    const session = await this.chatSessionRepository.create({
      userId: user.id,
      title: message.trim().slice(0, 60),
    });

    await this.chatMessageRepository.create({
      sessionId: session.id,
      userId: user.id,
      role: 'user',
      content: message.trim(),
    });

    if (preference.isOnboardingCompleted && this.ragWorkflow) {
      const ragResult = await this.ragWorkflow.invoke({
        userId: user.externalId,
        message: message.trim(),
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

    await this.chatMessageRepository.create({
      sessionId: session.id,
      userId: user.id,
      role: 'assistant',
      content: onboardingQuestion,
      metadata: {
        next_action: 'ASK_QUESTION',
      },
    });

    return {
      statusCode: 200,
      body: {
        user_id: user.externalId,
        session_id: session.id,
        is_onboarding_completed: preference.isOnboardingCompleted,
        next_action: 'ASK_QUESTION',
        message: onboardingQuestion,
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
}
