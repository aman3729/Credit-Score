#!/bin/bash
# Pre-commit hook to check for sensitive data in staged files
# Install: ln -s ../../scripts/git-secrets-hook.sh .git/hooks/pre-commit

# Exit on error
set -e

# Sensitive patterns to block (case-insensitive)
PATTERNS=(
  'password\s*[=:]\s*[\'\"]?[^\s\'\"]+[\'\"]?'
  'secret\s*[=:]\s*[\'\"]?[^\s\'\"]+[\'\"]?'
  'token\s*[=:]\s*[\'\"]?[^\s\'\"]+[\'\"]?'
  'jwt\s*[=:]\s*[\'\"]?[^\s\'\"]+[\'\"]?'
  'api[_-]?key\s*[=:]\s*[\'\"]?[^\s\'\"]+[\'\"]?'
  'authorization\s*[=:]\s*[\'\"]?[^\s\'\"]+[\'\"]?'
  'cookie\s*[=:]\s*[\'\"]?[^\s\'\"]+[\'\"]?'
  'credential\s*[=:]\s*[\'\"]?[^\s\'\"]+[\'\"]?'
  'pwd\s*[=:]\s*[\'\"]?[^\s\'\"]+[\'\"]?'
  'passwd\s*[=:]\s*[\'\"]?[^\s\'\"]+[\'\"]?'
  'private[_-]?key\s*[=:]\s*[\'\"]?[^\s\'\"]+[\'\"]?'
  'access[_-]?token\s*[=:]\s*[\'\"]?[^\s\'\"]+[\'\"]?'
  'refresh[_-]?token\s*[=:]\s*[\'\"]?[^\s\'\"]+[\'\"]?'
)

# Build combined pattern
PATTERN=$(IFS='|'; echo "${PATTERNS[*]}")

# Check staged files for sensitive data
FOUND=0
for FILE in $(git diff --cached --name-only); do
  # Skip binary files
  if [[ "$(git diff --cached --numstat $FILE | cut -f1)" == "-" ]]; then
    continue
  fi
  
  # Check for sensitive patterns
  if grep -q -E -i "$PATTERN" "$FILE"; then
    echo "⚠️  Potential secret in staged file: $FILE"
    grep -n -E -i "$PATTERN" "$FILE" | sed 's/^/    /'
    FOUND=1
  fi
  
  # Check for high-entropy strings (potential secrets)
  if grep -q -E '[a-zA-Z0-9+/=]{40,}' "$FILE"; then
    echo "⚠️  Long base64 string in staged file (potential secret): $FILE"
    grep -n -E '[a-zA-Z0-9+/=]{40,}' "$FILE" | head -3 | sed 's/^/    /'
    [ $(grep -c -E '[a-zA-Z0-9+/=]{40,}' "$FILE") -gt 3 ] && echo "    ... and more"
    FOUND=1
  fi
done

# Exit with error if sensitive data found
if [ $FOUND -ne 0 ]; then
  echo "\n🚫 Commit blocked: Potential secrets detected in staged files."
  echo "   If these are false positives, you can bypass this check with:\n"
  echo "   git commit --no-verify\n"
  echo "   But make sure you're not committing actual secrets!"
  exit 1
fi

exit 0
