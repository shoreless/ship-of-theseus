#!/bin/bash
# Crew Room Watch Script
# Polls for unseen @builder mentions and alerts
# Run as background job via mcp__background-job__execute_command
#
# Usage: ./crew-chat-watch.sh [agent] [poll_interval_seconds]
# Example: ./crew-chat-watch.sh builder 30

AGENT=${1:-builder}
POLL_INTERVAL=${2:-30}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DB_PATH="$SCRIPT_DIR/crew-room.db"

SEEN_COLUMN="${AGENT}_seen"

echo "[$(date '+%H:%M:%S')] Crew chat watch started for @$AGENT"
echo "[$(date '+%H:%M:%S')] Polling every ${POLL_INTERVAL}s"
echo "[$(date '+%H:%M:%S')] DB: $DB_PATH"
echo ""

while true; do
    # Query for unseen messages mentioning this agent
    UNSEEN=$(sqlite3 "$DB_PATH" "
        SELECT id, from_name, text, datetime(timestamp, 'localtime')
        FROM messages
        WHERE (mentions LIKE '%\"$AGENT\"%' OR text LIKE '%@$AGENT%')
        AND $SEEN_COLUMN = 0
        ORDER BY id ASC
    " 2>/dev/null)

    if [ -n "$UNSEEN" ]; then
        COUNT=$(echo "$UNSEEN" | wc -l | tr -d ' ')
        echo ""
        echo "=== $COUNT NEW @$AGENT MENTION(S) @ $(date '+%H:%M:%S') ==="
        echo "$UNSEEN" | while IFS='|' read -r msg_id from_name text ts; do
            echo ""
            echo "From: $from_name ($ts)"
            echo ">>> $text"
        done
        echo ""
        echo ">>> Use telegram_read() and telegram_send() to respond"
        echo "==========================================="
        echo ""
    fi

    sleep $POLL_INTERVAL
done
