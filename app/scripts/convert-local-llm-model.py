#!/usr/bin/env python3
"""Bundle a converted TFLite LLM + tokenizer into a MediaPipe .task file.

Use this only if you're converting your own custom PyTorch checkpoint instead
of using a pre-converted community model (see scripts/download-local-llm-model.sh
for the simpler path).

Prerequisites:
  - A TFLite model already exported with the AI Edge Torch Generative API:
    https://github.com/google-ai-edge/litert-torch/tree/main/litert_torch/generative
  - The SentencePiece tokenizer model used to train that checkpoint.
  - `pip install mediapipe` (>=0.10.14, required for the genai bundler module).

Reference: https://developers.google.com/edge/mediapipe/solutions/genai/llm_inference

Usage:
  python3 scripts/convert-local-llm-model.py \
    --tflite-model /path/to/model.tflite \
    --tokenizer-model /path/to/tokenizer.model \
    --start-token "<bos>" \
    --stop-token "<eos>" \
    --output packages/android-local-message-validator/android/src/main/assets/message-validator.task
"""
import argparse
import os

from mediapipe.tasks.python.genai import bundler


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tflite-model", required=True, help="Path to the AI Edge exported .tflite model")
    parser.add_argument("--tokenizer-model", required=True, help="Path to the SentencePiece tokenizer model")
    parser.add_argument("--start-token", required=True, help="Model-specific start token, must exist in the tokenizer")
    parser.add_argument(
        "--stop-token",
        action="append",
        required=True,
        dest="stop_tokens",
        help="Model-specific stop token; repeat this flag for multiple stop tokens",
    )
    parser.add_argument("--output", required=True, help="Destination path for the bundled .task file")
    parser.add_argument(
        "--bytes-to-unicode-mapping",
        action="store_true",
        help="Enable byte-to-unicode mapping (needed for some BPE tokenizers, e.g. GPT-2 style)",
    )
    args = parser.parse_args()

    output_dir = os.path.dirname(args.output)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    config = bundler.BundleConfig(
        tflite_model=args.tflite_model,
        tokenizer_model=args.tokenizer_model,
        start_token=args.start_token,
        stop_tokens=args.stop_tokens,
        output_filename=args.output,
        enable_bytes_to_unicode_mapping=args.bytes_to_unicode_mapping,
    )
    bundler.create_bundle(config)
    print(f"Bundled .task model written to: {args.output}")


if __name__ == "__main__":
    main()
