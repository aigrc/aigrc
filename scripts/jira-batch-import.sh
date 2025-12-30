#!/bin/bash
# JIRA Batch Import Script
# This creates all Epics and Stories for AIGRC/AIGOS

AUTH="${JIRA_USER}:${JIRA_API_TOKEN}"
BASE_URL="https://aigos.atlassian.net/rest/api/3/issue"

# Function to create an issue
create_issue() {
    local json="$1"
    curl -s -X POST -u "$AUTH" -H "Content-Type: application/json" "$BASE_URL" -d "$json"
}

echo "Creating JIRA Epics and Stories..."
echo "================================="
