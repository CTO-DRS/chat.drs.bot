#!/bin/bash
# End-to-end API test for chat.drs.bot
set -e
BASE=http://localhost:3000
JAR=/tmp/drs-cookies.txt
CHAT_ID=$(python3 -c "import uuid; print(uuid.uuid4())")
MSG_ID=$(python3 -c "import uuid; print(uuid.uuid4())")

rm -f "$JAR"
curl -s -c "$JAR" -o /dev/null "$BASE/"
curl -s -b "$JAR" -c "$JAR" -o /dev/null "$BASE/api/auth/guest?redirectUrl=%2F"

echo "=== POST /api/chat (Arabic greeting) ==="
curl -s -N -b "$JAR" -X POST "$BASE/api/chat" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$CHAT_ID\",
    \"message\": {
      \"id\": \"$MSG_ID\",
      \"parts\": [{\"text\": \"مرحبا! عرّفني بنفسك في سطرين فقط\", \"type\": \"text\"}],
      \"role\": \"user\"
    },
    \"selectedChatModel\": \"glm-4.6\",
    \"selectedVisibilityType\": \"private\"
  }" | head -c 2000

echo ""
echo "=== history check ==="
sleep 1
curl -s -b "$JAR" "$BASE/api/history?limit=5" | head -c 600
echo ""
echo "CHAT_ID=$CHAT_ID"
