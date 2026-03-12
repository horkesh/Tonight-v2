import { describe, it, expect } from 'vitest';
import { cleanAndParseJSON } from '../services/geminiService';

describe('cleanAndParseJSON', () => {
  it('parses valid JSON object', () => {
    const result = cleanAndParseJSON('{"name": "test", "value": 42}');
    expect(result).toEqual({ name: 'test', value: 42 });
  });

  it('parses valid JSON array', () => {
    const result = cleanAndParseJSON('[1, 2, 3]');
    expect(result).toEqual([1, 2, 3]);
  });

  it('strips code fence markers', () => {
    const input = '```json\n{"key": "value"}\n```';
    const result = cleanAndParseJSON(input);
    expect(result).toEqual({ key: 'value' });
  });

  it('extracts JSON from surrounding noise', () => {
    const input = 'Here is the response: {"data": true} some trailing text';
    const result = cleanAndParseJSON(input);
    expect(result).toEqual({ data: true });
  });

  it('extracts array from surrounding noise', () => {
    const input = 'Output: [{"id": 1}, {"id": 2}] end';
    const result = cleanAndParseJSON(input);
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('returns fallback for undefined input', () => {
    const result = cleanAndParseJSON(undefined, { default: true });
    expect(result).toEqual({ default: true });
  });

  it('returns fallback for empty string', () => {
    const result = cleanAndParseJSON('', []);
    expect(result).toEqual([]);
  });

  it('returns fallback for garbage input', () => {
    const result = cleanAndParseJSON('this is not json at all!!!', { fallback: true });
    expect(result).toEqual({ fallback: true });
  });

  it('returns default fallback (empty object) when no fallback specified', () => {
    const result = cleanAndParseJSON('broken');
    expect(result).toEqual({});
  });

  it('handles nested JSON correctly', () => {
    const input = '{"outer": {"inner": [1, 2, {"deep": true}]}}';
    const result = cleanAndParseJSON(input);
    expect(result.outer.inner[2].deep).toBe(true);
  });
});
