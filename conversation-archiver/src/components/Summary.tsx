'use client';

import { useState } from 'react';
import { ConversationSummary, KeyMoment, TopicWithConfidence } from '@/types';

interface SummaryProps {
  summary: ConversationSummary;
  onJumpToMessage?: (messageId: string) => void;
}

export function Summary({ summary, onJumpToMessage }: SummaryProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">AI Summary</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
            Experimental
          </span>
        </div>
      </div>

      {/* Summary Text */}
      <div className="p-4">
        <p className="text-gray-700 leading-relaxed">{summary.text}</p>
      </div>

      {/* Key Topics (Simple View) */}
      <div className="px-4 pb-4">
        <div className="flex flex-wrap gap-2">
          {summary.keyTopics.slice(0, 6).map((topic) => (
            <TopicBadge key={topic.topic} topic={topic} />
          ))}
        </div>
      </div>

      {/* Transparency Toggle */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 flex items-center justify-between transition-colors"
        >
          <span>How was this generated?</span>
          <span className="text-xs">{showDetails ? '▼' : '▶'}</span>
        </button>

        {/* Expanded Details */}
        {showDetails && (
          <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-6">
            {/* Methodology */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Methodology</h4>
              <p className="text-sm text-gray-600 mb-2">{summary.methodology.approach}</p>
              <ul className="text-xs text-gray-500 space-y-1">
                {summary.methodology.factors.map((factor, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-gray-400">•</span>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>

            {/* Key Moments with Reasoning */}
            {summary.keyMoments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Why these moments were selected
                </h4>
                <div className="space-y-2">
                  {summary.keyMoments.map((moment) => (
                    <KeyMomentCard
                      key={moment.messageId}
                      moment={moment}
                      onJump={onJumpToMessage}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All Topics with Confidence */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Extracted Topics (with confidence)
              </h4>
              <div className="flex flex-wrap gap-2">
                {summary.keyTopics.map((topic) => (
                  <TopicBadge key={topic.topic} topic={topic} showConfidence />
                ))}
              </div>
            </div>

            {/* Limitations - The Honest Part */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-amber-800 mb-2">
                What this might miss
              </h4>
              <ul className="text-xs text-amber-700 space-y-1">
                {summary.limitations.map((limitation, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-400">⚠</span>
                    {limitation}
                  </li>
                ))}
              </ul>
              <ul className="text-xs text-amber-600 mt-3 space-y-1 border-t border-amber-200 pt-2">
                {summary.methodology.whatItMightMiss.map((miss, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-300">•</span>
                    {miss}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface TopicBadgeProps {
  topic: TopicWithConfidence;
  showConfidence?: boolean;
}

function TopicBadge({ topic, showConfidence }: TopicBadgeProps) {
  // Color intensity based on confidence
  const intensity = Math.round(topic.confidence * 100);
  const bgOpacity = 0.1 + topic.confidence * 0.2;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
      style={{
        backgroundColor: `rgba(59, 130, 246, ${bgOpacity})`,
        color: intensity > 50 ? 'rgb(30, 64, 175)' : 'rgb(59, 130, 246)',
      }}
    >
      {topic.topic}
      {showConfidence && (
        <span className="text-[10px] opacity-70">
          ({Math.round(topic.confidence * 100)}%)
        </span>
      )}
      <span className="text-[10px] opacity-50">×{topic.messageCount}</span>
    </span>
  );
}

interface KeyMomentCardProps {
  moment: KeyMoment;
  onJump?: (messageId: string) => void;
}

function KeyMomentCard({ moment, onJump }: KeyMomentCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded p-2 text-xs">
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-500">Message {moment.messageId}</span>
        <div className="flex items-center gap-2">
          <span
            className="px-1.5 py-0.5 rounded text-[10px]"
            style={{
              backgroundColor: `rgba(34, 197, 94, ${moment.confidence})`,
              color: moment.confidence > 0.5 ? 'white' : 'rgb(22, 101, 52)',
            }}
          >
            {Math.round(moment.confidence * 100)}% conf
          </span>
          {onJump && (
            <button
              onClick={() => onJump(moment.messageId)}
              className="text-blue-500 hover:text-blue-700"
            >
              Jump →
            </button>
          )}
        </div>
      </div>
      <p className="text-gray-600">{moment.reason}</p>
    </div>
  );
}
