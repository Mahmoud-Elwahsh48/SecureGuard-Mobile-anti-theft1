import { FaceMatchResult } from '../types';

export const FaceVerification = {
  extractEmbeddingFromCanvas(
    canvas: HTMLCanvasElement,
    cropBox?: { x: number; y: number; width: number; height: number }
  ): number[] {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];

    const box = cropBox || {
      x: Math.floor(canvas.width * 0.2),
      y: Math.floor(canvas.height * 0.15),
      width: Math.floor(canvas.width * 0.6),
      height: Math.floor(canvas.height * 0.7),
    };

    // Sample an 8x8 grid of luminance and color gradient landmarks across the face region (64 points)
    const gridSize = 8;
    const embedding: number[] = [];
    const stepX = box.width / gridSize;
    const stepY = box.height / gridSize;

    try {
      const imgData = ctx.getImageData(box.x, box.y, box.width, box.height);
      const data = imgData.data;

      for (let gy = 0; gy < gridSize; gy++) {
        for (let gx = 0; gx < gridSize; gx++) {
          const sampleX = Math.min(box.width - 1, Math.floor((gx + 0.5) * stepX));
          const sampleY = Math.min(box.height - 1, Math.floor((gy + 0.5) * stepY));
          const idx = (sampleY * box.width + sampleX) * 4;

          const r = data[idx] / 255;
          const g = data[idx + 1] / 255;
          const b = data[idx + 2] / 255;

          // Perceived luminance & color balance
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          embedding.push(parseFloat(lum.toFixed(4)));
        }
      }

      // Normalize embedding vector
      const norm = Math.sqrt(embedding.reduce((acc, val) => acc + val * val, 0)) || 1;
      return embedding.map((val) => parseFloat((val / norm).toFixed(4)));
    } catch (e) {
      console.error('Error extracting face embedding from canvas', e);
      return [];
    }
  },

  async extractEmbeddingFromImage(imageSrc: string): Promise<number[]> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 160;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 160, 160);
          const embedding = this.extractEmbeddingFromCanvas(canvas);
          resolve(embedding);
        } else {
          resolve([]);
        }
      };
      img.onerror = () => resolve([]);
      img.src = imageSrc;
    });
  },

  calculateDistance(candidate: number[], baseline: number[]): number {
    if (!candidate.length || !baseline.length) return 1.0;
    const len = Math.min(candidate.length, baseline.length);
    let sum = 0;
    for (let i = 0; i < len; i++) {
      const diff = candidate[i] - baseline[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  },

  verifyMatch(candidateEmbedding: number[], baselineEmbedding: number[] | null): FaceMatchResult {
    const threshold = 0.65; // Matches FaceVerification.kt Android threshold

    if (!baselineEmbedding || baselineEmbedding.length === 0) {
      return {
        isMatch: false,
        distance: 1.0,
        threshold,
        confidence: 0,
        extractedFeaturesCount: candidateEmbedding.length,
      };
    }

    const distance = this.calculateDistance(candidateEmbedding, baselineEmbedding);
    const isMatch = distance < threshold;
    const confidence = Math.max(0, Math.min(100, Math.round((1 - distance / threshold) * 100)));

    return {
      isMatch,
      distance: parseFloat(distance.toFixed(4)),
      threshold,
      confidence,
      extractedFeaturesCount: candidateEmbedding.length,
    };
  },
};
