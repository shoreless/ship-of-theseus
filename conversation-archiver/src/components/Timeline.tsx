'use client';

import { useState } from 'react';
import { Message, Annotation } from '@/types';

interface TimelineProps {
  messages: Message[];
  participants: string[];
  onAddAnnotation?: (messageId: string, annotation: Omit<Annotation, 'id' | 'createdAt'>) => void;
}

export function Timeline({ messages, participants, onAddAnnotation }: TimelineProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [annotatingMessage, setAnnotatingMessage] = useState<string | null>(null);

  // Assign colors to participants
  const participantColors = getParticipantColors(participants);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedMessages);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedMessages(next);
  };

  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <MessageCard
          key={message.id}
          message={message}
          color={participantColors[message.speaker]}
          isExpanded={expandedMessages.has(message.id)}
          onToggleExpand={() => toggleExpand(message.id)}
          isAnnotating={annotatingMessage === message.id}
          onStartAnnotating={() => setAnnotatingMessage(message.id)}
          onCancelAnnotating={() => setAnnotatingMessage(null)}
          onAddAnnotation={onAddAnnotation}
          showGapIndicator={message.isUnansweredQuestion}
        />
      ))}
    </div>
  );
}

interface MessageCardProps {
  message: Message;
  color: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isAnnotating: boolean;
  onStartAnnotating: () => void;
  onCancelAnnotating: () => void;
  onAddAnnotation?: (messageId: string, annotation: Omit<Annotation, 'id' | 'createdAt'>) => void;
  showGapIndicator?: boolean;
}

function MessageCard({
  message,
  color,
  isExpanded,
  onToggleExpand,
  isAnnotating,
  onStartAnnotating,
  onCancelAnnotating,
  onAddAnnotation,
  showGapIndicator,
}: MessageCardProps) {
  const [annotationText, setAnnotationText] = useState('');

  const handleSubmitAnnotation = () => {
    if (annotationText.trim() && onAddAnnotation) {
      onAddAnnotation(message.id, {
        author: 'User',
        text: annotationText.trim(),
        type: 'note',
      });
      setAnnotationText('');
      onCancelAnnotating();
    }
  };

  const contentPreview = message.content.slice(0, 200);
  const hasMore = message.content.length > 200;

  return (
    <div className="relative">
      {/* Gap indicator for unanswered questions */}
      {showGapIndicator && (
        <div className="absolute -left-6 top-4 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center text-xs" title="Potentially unanswered question">
          ?
        </div>
      )}

      <div
        className={`rounded-lg p-4 border-l-4 ${color} bg-white shadow-sm hover:shadow-md transition-shadow`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-gray-800">{message.speaker}</span>
          <div className="flex items-center gap-2">
            {message.isQuestion && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                Question
              </span>
            )}
            <button
              onClick={onStartAnnotating}
              className="text-xs text-gray-400 hover:text-gray-600"
              title="Add annotation"
            >
              +note
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="text-gray-700 whitespace-pre-wrap">
          {isExpanded ? message.content : contentPreview}
          {hasMore && !isExpanded && '...'}
        </div>

        {hasMore && (
          <button
            onClick={onToggleExpand}
            className="text-sm text-blue-500 hover:text-blue-700 mt-2"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}

        {/* Annotations */}
        {message.annotations && message.annotations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
            {message.annotations.map((annotation) => (
              <div
                key={annotation.id}
                className="text-sm bg-yellow-50 border-l-2 border-yellow-400 pl-2 py-1"
              >
                <span className="text-gray-500 text-xs">{annotation.author}:</span>{' '}
                {annotation.text}
              </div>
            ))}
          </div>
        )}

        {/* Annotation input */}
        {isAnnotating && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <textarea
              value={annotationText}
              onChange={(e) => setAnnotationText(e.target.value)}
              placeholder="Add your note..."
              className="w-full p-2 border border-gray-200 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSubmitAnnotation}
                className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
              >
                Save
              </button>
              <button
                onClick={onCancelAnnotating}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getParticipantColors(participants: string[]): Record<string, string> {
  const colors = [
    'border-l-blue-500',
    'border-l-emerald-500',
    'border-l-purple-500',
    'border-l-orange-500',
    'border-l-pink-500',
    'border-l-cyan-500',
  ];

  const colorMap: Record<string, string> = {};
  participants.forEach((p, i) => {
    colorMap[p] = colors[i % colors.length];
  });
  return colorMap;
}
