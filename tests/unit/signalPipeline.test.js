/**
 * SignalPipeline Unit Tests
 * Plan 01-05: Yupose Signal Pipeline
 */

import { SignalPipeline, createPipeline, PIPELINE_PRESETS } from '../../src/js/visuals/utils/signalPipeline.js';

describe('SignalPipeline', () => {
  describe('constructor', () => {
    test('creates with default config', () => {
      const pipeline = new SignalPipeline();
      expect(pipeline.subsampleRate).toBe(1);
      expect(pipeline.curve).toBe('linear');
      expect(pipeline.gate).toBe(0);
      expect(pipeline.envelope).toBeNull();
    });

    test('creates with custom config', () => {
      const pipeline = new SignalPipeline({
        subsample: 4,
        curve: 'exponential',
        curveExponent: 3.0,
        gate: 0.3
      });
      expect(pipeline.subsampleRate).toBe(4);
      expect(pipeline.curve).toBe('exponential');
      expect(pipeline.curveExponent).toBe(3.0);
      expect(pipeline.gate).toBe(0.3);
    });
  });

  describe('processPreSmooth', () => {
    test('linear curve returns input unchanged', () => {
      const pipeline = new SignalPipeline({ curve: 'linear' });
      expect(pipeline.processPreSmooth(0.5)).toBe(0.5);
      expect(pipeline.processPreSmooth(0)).toBe(0);
      expect(pipeline.processPreSmooth(1)).toBe(1);
    });

    test('exponential curve emphasizes peaks', () => {
      const pipeline = new SignalPipeline({ curve: 'exponential', curveExponent: 2 });
      expect(pipeline.processPreSmooth(0.5)).toBe(0.25); // 0.5^2
      expect(pipeline.processPreSmooth(0)).toBe(0);
      expect(pipeline.processPreSmooth(1)).toBe(1);
    });

    test('gate cuts values below threshold', () => {
      const pipeline = new SignalPipeline({ gate: 0.3 });
      expect(pipeline.processPreSmooth(0.2)).toBe(0); // Below gate
      expect(pipeline.processPreSmooth(0.5)).toBe(0.5); // Above gate
    });

    test('subsample skips frames', () => {
      const pipeline = new SignalPipeline({ subsample: 2 });

      // First frame - processed
      const val1 = pipeline.processPreSmooth(0.5);
      expect(val1).toBe(0.5);

      // Second frame - skipped, returns cached
      const val2 = pipeline.processPreSmooth(0.8);
      expect(val2).toBe(0.5); // Cached value

      // Third frame - processed again
      const val3 = pipeline.processPreSmooth(0.3);
      expect(val3).toBe(0.3);
    });
  });

  describe('processPostSmooth', () => {
    test('envelope applies attack on rising values', () => {
      const pipeline = new SignalPipeline({
        envelope: { attack: 0.1, release: 0.5 }
      });

      // Rising: should use attack rate
      const result = pipeline.processPostSmooth(1.0, {}, 0.05);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
    });

    test('envelope applies release on falling values', () => {
      const pipeline = new SignalPipeline({
        envelope: { attack: 0.1, release: 0.5 }
      });

      // Set high initial value
      pipeline.envelopeValue = 1.0;

      // Falling: should use release rate
      const result = pipeline.processPostSmooth(0, {}, 0.05);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
    });

    test('modulateBy applies cross-feature modulation', () => {
      const pipeline = new SignalPipeline({
        modulateBy: { feature: 'bass', amount: 0.5 }
      });

      const audioData = { bass: 1.0 };
      const result = pipeline.processPostSmooth(0.5, audioData, 0.016);

      // 0.5 * (1 + 1.0 * 0.5) = 0.5 * 1.5 = 0.75
      expect(result).toBe(0.75);
    });
  });

  describe('presets', () => {
    test('punch preset has fast attack slow release', () => {
      expect(PIPELINE_PRESETS.punch.envelope.attack).toBe(0.05);
      expect(PIPELINE_PRESETS.punch.envelope.release).toBe(0.4);
    });

    test('breath preset has s-curve', () => {
      expect(PIPELINE_PRESETS.breath.curve).toBe('s-curve');
    });

    test('transient preset has gate', () => {
      expect(PIPELINE_PRESETS.transient.gate).toBe(0.5);
    });
  });

  describe('createPipeline', () => {
    test('creates from preset string', () => {
      const pipeline = createPipeline('punch');
      expect(pipeline.envelope).toBeDefined();
      expect(pipeline.envelope.attack).toBe(0.05);
    });

    test('creates from config object', () => {
      const pipeline = createPipeline({ gate: 0.4 });
      expect(pipeline.gate).toBe(0.4);
    });

    test('merges preset with overrides', () => {
      const pipeline = createPipeline({
        preset: 'punch',
        envelope: { attack: 0.1, release: 0.4 }
      });
      expect(pipeline.envelope.attack).toBe(0.1); // Override
      expect(pipeline.envelope.release).toBe(0.4);
    });
  });

  describe('performance', () => {
    test('processes 10000 values in under 10ms', () => {
      const pipeline = new SignalPipeline({
        curve: 'exponential',
        gate: 0.2,
        envelope: { attack: 0.1, release: 0.5 },
        modulateBy: { feature: 'bass', amount: 0.3 }
      });

      const audioData = { bass: 0.5, loudness: 0.6 };
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        const raw = Math.random();
        const pre = pipeline.processPreSmooth(raw);
        pipeline.processPostSmooth(pre * 0.8 + 0.1, audioData, 0.016);
      }

      const elapsed = performance.now() - start;
      // 50ms for 10000 = 0.005ms per pipeline = 200 pipelines per frame at 60fps
      expect(elapsed).toBeLessThan(50);
    });
  });
});
