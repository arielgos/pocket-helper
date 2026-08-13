#!/usr/bin/env bash
# Downloads a pre-converted .task LLM model from the LiteRT Community on Hugging
# Face and installs it as the on-device model for the Android local message
# validator (packages/android-local-message-validator).
#
# Pre-converted models (no local conversion needed) are listed at:
#   https://huggingface.co/litert-community
# e.g. https://huggingface.co/litert-community/Gemma3-1B-IT (see the "Files" tab
# for the exact quantized variant filenames, such as *_cpu.task / *_gpu.task).
#
# Most of these models (Gemma family) are gated: you must accept the license on
# the model's Hugging Face page and pass an access token with read permission.
#
# Usage:
#   HF_TOKEN=hf_xxx ./scripts/download-local-llm-model.sh <hf-repo-id> <filename-in-repo>
#
# Example:
#   HF_TOKEN=hf_xxx ./scripts/download-local-llm-model.sh \
#     litert-community/Gemma3-1B-IT gemma3-1b-it-int4-cpu.task

set -euo pipefail

REPO_ID="${1:?Usage: $0 <hf-repo-id> <filename-in-repo>}"
FILE_NAME="${2:?Usage: $0 <hf-repo-id> <filename-in-repo>}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS_DIR="$SCRIPT_DIR/../packages/android-local-message-validator/android/src/main/assets"
DEST_FILE="$ASSETS_DIR/message-validator.task"

mkdir -p "$ASSETS_DIR"

if ! command -v huggingface-cli >/dev/null 2>&1; then
  echo "huggingface-cli not found. Installing huggingface_hub[cli]..."
  python3 -m pip install --quiet -U "huggingface_hub[cli]"
fi

if [ -z "${HF_TOKEN:-}" ]; then
  echo "Warning: HF_TOKEN is not set. Gated models (e.g. Gemma) will fail to download" >&2
  echo "unless you've already run 'huggingface-cli login' and accepted the license." >&2
fi

echo "Downloading '$FILE_NAME' from '$REPO_ID'..."
huggingface-cli download "$REPO_ID" "$FILE_NAME" --local-dir "$ASSETS_DIR" ${HF_TOKEN:+--token "$HF_TOKEN"}

DOWNLOADED_PATH="$ASSETS_DIR/$(basename "$FILE_NAME")"
mv -f "$DOWNLOADED_PATH" "$DEST_FILE"

echo "Model installed at: $DEST_FILE"
echo "Next: rebuild the app with 'npx expo run:android'."
