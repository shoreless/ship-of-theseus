'use client';

interface SearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  participants: string[];
  selectedParticipant: string | null;
  onParticipantChange: (participant: string | null) => void;
  showQuestionsOnly: boolean;
  onShowQuestionsOnlyChange: (show: boolean) => void;
}

export function SearchFilter({
  searchQuery,
  onSearchChange,
  participants,
  selectedParticipant,
  onParticipantChange,
  showQuestionsOnly,
  onShowQuestionsOnlyChange,
}: SearchFilterProps) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
      {/* Search input */}
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search messages..."
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Participant filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Speaker:</span>
          <select
            value={selectedParticipant || ''}
            onChange={(e) => onParticipantChange(e.target.value || null)}
            className="px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            {participants.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Questions filter */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showQuestionsOnly}
            onChange={(e) => onShowQuestionsOnlyChange(e.target.checked)}
            className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">Questions only</span>
        </label>
      </div>
    </div>
  );
}
