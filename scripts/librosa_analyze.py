#!/usr/bin/env python3
"""
Librosa-based offline feature extractor.

Usage examples:
    python scripts/librosa_analyze.py --input /path/to/track.wav --slug sonoite \
        --output public/assets/journeys/analysis/sonoite.librosa.json

    python scripts/librosa_analyze.py --config scripts/audio-analysis.config.json \
        --outputDir public/assets/journeys/analysis

Requires: librosa, numpy, soundfile (install via `pip install librosa soundfile`).
"""

import argparse
import json
import math
import os
from pathlib import Path
from typing import List, Optional, Sequence

import librosa
import numpy as np


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract extended audio features with librosa.")
    parser.add_argument("--input", "-i", help="Audio file to analyse (can be repeated)", action="append")
    parser.add_argument("--slug", help="Track identifier for a single run")
    parser.add_argument("--output", "-o", help="Output path for a single run")
    parser.add_argument("--outputDir", help="Directory for outputs when using --config")
    parser.add_argument("--config", help="JSON array [{\"slug\":..., \"file\":...}] for batch runs")
    parser.add_argument("--sr", type=int, default=None, help="Resample rate (default: native)")
    parser.add_argument("--hop", type=int, default=512, help="Hop length for STFT-derived features")
    parser.add_argument("--tempo_window", type=float, default=8.0, help="Seconds per tempo analysis block")
    parser.add_argument("--verbose", action="store_true", help="Print progress information")
    return parser.parse_args()


def load_audio(path: Path, target_sr: Optional[int] = None) -> tuple[np.ndarray, int]:
    if not path.exists():
        raise FileNotFoundError(f"Audio file not found: {path}")
    y, sr = librosa.load(path.as_posix(), sr=target_sr, mono=True)
    return y, sr


def analyse_track(file_path: Path, slug: str, sr: Optional[int], hop_length: int, tempo_window: float,
                   verbose: bool = False) -> dict:
    if verbose:
        print(f"Analyzing {slug} ← {file_path}")

    y, sr = load_audio(file_path, sr)
    duration = len(y) / sr

    # Onset envelope and tempo/beat tracking
    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop_length)
    tempo, beats = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr, hop_length=hop_length, units="time")

    # Harmonic/percussive separation for texture analysis
    y_harm, y_perc = librosa.effects.hpss(y)

    # Spectral features
    spec_centroid = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=hop_length)[0]
    spec_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr, hop_length=hop_length)[0]
    spec_contrast = librosa.feature.spectral_contrast(y=y, sr=sr, hop_length=hop_length)
    spec_flatness = librosa.feature.spectral_flatness(y=y, hop_length=hop_length)[0]

    # Chroma / tonality
    chroma_cqt = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop_length)
    chroma_cens = librosa.feature.chroma_cens(y=y, sr=sr, hop_length=hop_length)
    tonnetz = librosa.feature.tonnetz(y=y_harm, sr=sr)

    # MFCC statistics
    mfcc = librosa.feature.mfcc(y=y, sr=sr, hop_length=hop_length, n_mfcc=13)

    # Root-mean-square energy per frame
    rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]
    percussive_rms = librosa.feature.rms(y=y_perc, hop_length=hop_length)[0]

    # Calculate windowed tempo (rolling BPM)
    tempo_windows = []
    if tempo_window > 0:
        hop_seconds = hop_length / sr
        frames_per_window = max(1, int(tempo_window / hop_seconds))
        for start in range(0, len(onset_env), frames_per_window):
            end = min(start + frames_per_window, len(onset_env))
            local_env = onset_env[start:end]
            if len(local_env) < 8:
                continue
            local_tempo, _ = librosa.beat.beat_track(onset_envelope=local_env, sr=sr,
                                                     hop_length=hop_length, units="time")
            tempo_windows.append({
                "start": round(start * hop_seconds, 6),
                "end": round(end * hop_seconds, 6),
                "tempo": float(round(local_tempo, 6))
            })

    def stats(array: np.ndarray) -> dict:
        if array.size == 0:
            return {"count": 0, "min": None, "max": None, "mean": None}
        return {
            "count": int(array.size),
            "min": float(np.min(array)),
            "max": float(np.max(array)),
            "mean": float(np.mean(array))
        }

    def vector_stats(array: np.ndarray) -> dict:
        if array.size == 0:
            return {"mean": [], "max": []}
        return {
            "mean": array.mean(axis=1).round(6).tolist(),
            "max": array.max(axis=1).round(6).tolist()
        }

    analysis = {
        "track": slug,
        "file": file_path.as_posix(),
        "sampleRate": sr,
        "hopLength": hop_length,
        "durationSeconds": round(duration, 6),
        "tempo": float(round(tempo, 6)),
        "beats": beats.round(6).tolist(),
        "tempoWindows": tempo_windows,
        "features": {
            "rms": stats(rms),
            "percussiveRMS": stats(percussive_rms),
            "spectralCentroid": stats(spec_centroid),
            "spectralBandwidth": stats(spec_bandwidth),
            "spectralFlatness": stats(spec_flatness),
            "spectralContrast": vector_stats(spec_contrast),
            "chromaCQT": vector_stats(chroma_cqt),
            "chromaCENS": vector_stats(chroma_cens),
            "tonnetz": vector_stats(tonnetz),
            "mfcc": vector_stats(mfcc)
        }
    }
    return analysis


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)


def process_entry(slug: str, file_path: str, output_path: Path, sr: Optional[int], hop: int,
                  tempo_window: float, verbose: bool) -> None:
    analysis = analyse_track(Path(file_path), slug, sr, hop, tempo_window, verbose)
    write_json(output_path, analysis)
    if verbose:
        print(f"✔︎ Wrote {output_path}")


def main() -> None:
    args = parse_args()

    entries: List[tuple[str, str]] = []
    if args.config:
        config_path = Path(args.config)
        data = json.loads(config_path.read_text())
        for entry in data:
            file_path = entry.get("file")
            slug = entry.get("slug") or derive_slug(file_path)
            if file_path:
                entries.append((slug, file_path))
    if args.input:
        if len(args.input) == 1 and args.slug is None:
            slug = derive_slug(args.input[0])
            entries.append((slug, args.input[0]))
        else:
            for idx, file_path in enumerate(args.input):
                slug = args.slug if args.slug and idx == 0 else derive_slug(file_path)
                entries.append((slug, file_path))

    if not entries:
        raise SystemExit("No input audio provided. Use --input or --config.")

    out_dir = Path(args.outputDir or "public/assets/journeys/analysis/librosa")

    for slug, file_path in entries:
        output_path = Path(args.output) if args.output and len(entries) == 1 else out_dir / f"{slug}.librosa.json"
        process_entry(slug, file_path, output_path, args.sr, args.hop, args.tempo_window, args.verbose)


def derive_slug(file_path: str) -> str:
    base = os.path.basename(file_path)
    return os.path.splitext(base)[0].lower().replace(" ", "-")


if __name__ == "__main__":
    main()
