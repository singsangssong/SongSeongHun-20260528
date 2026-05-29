import React from 'react';
import { formatAction } from '../format-action.js';

export function MessageList({ messages, isLoading }) {
  return (
    <div className="messages">
      {messages.map((message, index) => (
        <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
          <p>{message.content}</p>
          {message.action && (
            <span className="messageMeta">{formatAction(message.action)}</span>
          )}
          {message.retrievedDocumentIds?.length > 0 && (
            <span className="messageMeta">
              참조: {message.retrievedDocumentIds.join(', ')}
            </span>
          )}
          {message.recommendations?.length > 0 && (
            <div className="recommendationLinks">
              {message.recommendations.map((recommendation) => (
                <a
                  key={`${recommendation.name}-${recommendation.source_url}`}
                  href={recommendation.source_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>{recommendation.brand || '추천 상품'}</span>
                  <strong>{recommendation.name}</strong>
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
      {isLoading && (
        <div className="message assistant">
          <p>답변을 정리하고 있어요...</p>
          <span className="messageMeta">요청 처리 중</span>
        </div>
      )}
    </div>
  );
}
