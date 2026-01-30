'use client';

import { useState, useMemo } from 'react';
import { Conversation, Message, Annotation } from '@/types';
import { parseMarkdownChatLog, extractTitle } from '@/lib/parser';
import { generateSummary } from '@/lib/summarizer';
import { FileUpload } from '@/components/FileUpload';
import { Timeline } from '@/components/Timeline';
import { SearchFilter } from '@/components/SearchFilter';
import { Summary } from '@/components/Summary';

export default function Home() {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [showQuestionsOnly, setShowQuestionsOnly] = useState(false);

  const handleFileLoad = (content: string, filename: string) => {
    const title = extractTitle(content) || filename.replace(/\.(md|txt)$/, '');
    const parsed = parseMarkdownChatLog(content, { title, filename });
    setConversation(parsed);
  };

  const handleAddAnnotation = (messageId: string, annotation: Omit<Annotation, 'id' | 'createdAt'>) => {
    if (!conversation) return;

    setConversation({
      ...conversation,
      messages: conversation.messages.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              annotations: [
                ...(msg.annotations || []),
                {
                  ...annotation,
                  id: `ann-${Date.now()}`,
                  createdAt: new Date(),
                },
              ],
            }
          : msg
      ),
    });
  };

  // Filter messages
  const filteredMessages = useMemo(() => {
    if (!conversation) return [];

    return conversation.messages.filter((msg) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!msg.content.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Participant filter
      if (selectedParticipant && msg.speaker !== selectedParticipant) {
        return false;
      }

      // Questions filter
      if (showQuestionsOnly && !msg.isQuestion) {
        return false;
      }

      return true;
    });
  }, [conversation, searchQuery, selectedParticipant, showQuestionsOnly]);

  // Stats
  const stats = useMemo(() => {
    if (!conversation) return null;

    const questions = conversation.messages.filter((m) => m.isQuestion).length;
    const unanswered = conversation.messages.filter((m) => m.isUnansweredQuestion).length;

    return {
      total: conversation.messages.length,
      questions,
      unanswered,
      participants: conversation.participants.length,
    };
  }, [conversation]);

  // AI Summary
  const summary = useMemo(() => {
    if (!conversation || conversation.messages.length === 0) return null;
    return generateSummary(conversation.messages);
  }, [conversation]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Conversation Archiver</h1>
          <p className="text-sm text-gray-500 mt-1">
            A machine for hindsight — by Claude & Gemini
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {!conversation ? (
          <div className="space-y-8">
            <div className="text-center max-w-md mx-auto">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Upload a chat log
              </h2>
              <p className="text-gray-600 text-sm">
                Transform your conversations into structured, searchable archives.
                The archive is always an interpretation, never a restoration.
              </p>
            </div>
            <FileUpload onFileLoad={handleFileLoad} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Title and stats */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    {conversation.title}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {conversation.participants.join(' & ')}
                  </p>
                </div>
                <button
                  onClick={() => setConversation(null)}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  Load different file
                </button>
              </div>

              {/* Stats */}
              {stats && (
                <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                    <div className="text-xs text-gray-500">messages</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">{stats.participants}</div>
                    <div className="text-xs text-gray-500">participants</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.questions}</div>
                    <div className="text-xs text-gray-500">questions</div>
                  </div>
                  {stats.unanswered > 0 && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-500">{stats.unanswered}</div>
                      <div className="text-xs text-gray-500">unanswered</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Summary */}
            {summary && <Summary summary={summary} />}

            {/* Search and filter */}
            <SearchFilter
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              participants={conversation.participants}
              selectedParticipant={selectedParticipant}
              onParticipantChange={setSelectedParticipant}
              showQuestionsOnly={showQuestionsOnly}
              onShowQuestionsOnlyChange={setShowQuestionsOnly}
            />

            {/* Results count */}
            <div className="text-sm text-gray-500">
              Showing {filteredMessages.length} of {conversation.messages.length} messages
              {searchQuery && ` matching "${searchQuery}"`}
            </div>

            {/* Timeline */}
            <Timeline
              messages={filteredMessages}
              participants={conversation.participants}
              onAddAnnotation={handleAddAnnotation}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-gray-400">
          <p>
            The archive is always an interpretation, never a restoration.
          </p>
          <p className="mt-1">
            Built by Claude & Gemini, January 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
