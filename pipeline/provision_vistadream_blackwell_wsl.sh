#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VISTADREAM_ROOT="${VISTADREAM_ROOT:-$ROOT_DIR/_experiments/VistaDream}"
VISTADREAM_WSL_VENV="${VISTADREAM_WSL_VENV:-$HOME/.venvs/vistadream}"
BOOTSTRAP_PYTHON="${VISTADREAM_BOOTSTRAP_PYTHON:-python3.10}"
TORCH_INDEX_URL="${VISTADREAM_TORCH_INDEX_URL:-https://download.pytorch.org/whl/cu128}"
PY_BIN="${VISTADREAM_WSL_PYTHON:-$VISTADREAM_WSL_VENV/bin/python}"

fail() {
  echo "[vistadream-provision] $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

if [[ ! -d "$VISTADREAM_ROOT" ]]; then
  fail "VistaDream repo not found at $VISTADREAM_ROOT"
fi

require_cmd git
require_cmd g++

if [[ ! -x "$PY_BIN" ]]; then
  command -v "$BOOTSTRAP_PYTHON" >/dev/null 2>&1 || fail "Bootstrap Python not found: $BOOTSTRAP_PYTHON"
  "$BOOTSTRAP_PYTHON" -m venv "$VISTADREAM_WSL_VENV"
fi

"$PY_BIN" -m pip install --upgrade pip setuptools wheel ninja packaging
"$PY_BIN" -m pip uninstall -y torch torchvision torchaudio detectron2 xformers || true
"$PY_BIN" -m pip install --upgrade --index-url "$TORCH_INDEX_URL" torch torchvision torchaudio
"$PY_BIN" -m pip install \
  numpy==1.25.2 \
  regex==2023.12.25 \
  torchmetrics==1.3.2 \
  accelerate==1.2.0 \
  gsplat==1.0.0 \
  open3d==0.18.0 \
  tqdm==4.64.1 \
  omegaconf==2.2.3 \
  opencv-python==4.9.0.80 \
  opencv-contrib-python==4.8.0.74 \
  plyfile==1.0.3 \
  timm==0.9.2 \
  natten==0.14.6 \
  wandb==0.17.4 \
  ftfy==6.2.0 \
  diffdist==0.1 \
  diffusers==0.31.0 \
  einops==0.4.1 \
  imageio==2.34.1 \
  imageio-ffmpeg==0.5.1 \
  transformers==4.47.0 \
  torchsde==0.2.5 \
  huggingface-hub==0.26.3 \
  roma==1.5.2.1

if [[ -f "$VISTADREAM_ROOT/tools/OneFormer/requirements.txt" ]]; then
  "$PY_BIN" -m pip install -r "$VISTADREAM_ROOT/tools/OneFormer/requirements.txt"
fi

"$PY_BIN" -m pip install "git+https://github.com/facebookresearch/detectron2.git"

if [[ -d "$VISTADREAM_ROOT/tools/DepthPro" ]]; then
  "$PY_BIN" -m pip install -e "$VISTADREAM_ROOT/tools/DepthPro"
fi

if command -v nvcc >/dev/null 2>&1; then
  export CUDA_HOME="${CUDA_HOME:-$(dirname "$(dirname "$(command -v nvcc)")")}"
  (
    cd "$VISTADREAM_ROOT/tools/OneFormer/oneformer/modeling/pixel_decoder/ops"
    "$PY_BIN" setup.py build install
  )
else
  fail "nvcc not found in WSL. Install a CUDA toolkit in WSL before compiling the OneFormer op."
fi

"$PY_BIN" -m pip install xformers || true

(
  cd "$VISTADREAM_ROOT"
  "$PY_BIN" -W ignore - <<'PY'
import torch

print(f"TORCH={torch.__version__}")
print(f"CUDA={torch.version.cuda or 'none'}")

if not torch.cuda.is_available():
    raise RuntimeError("CUDA is not available after provisioning")

print(f"GPU={torch.cuda.get_device_name(0)}")
torch.randn(8, device="cuda").sum().item()

import detectron2  # noqa: F401
from ops.sky import Sky_Seg_Tool  # noqa: F401

print("VISTADREAM_READY=1")
PY
)

echo "[vistadream-provision] VistaDream Blackwell provisioning complete."
