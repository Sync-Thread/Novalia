import { describe, it, expect } from 'vitest';
import {
  computeScore,
  classify,
  MIN_PUBLISH_SCORE,
  COMPLETENESS_WEIGHTS,
  PROGRESS_THRESHOLDS,
} from '../../../../modules/properties/domain/policies/CompletenessPolicy';

describe('Completeness Policy', () => {
  describe('computeScore', () => {
    it('should return 0 for completely empty property', () => {
      const score = computeScore({
        hasTitle: false,
        descriptionLength: 0,
        priceAmount: 0,
        addressFilled: false,
        featuresFilledCount: 0,
        mediaCount: 0,
        hasRppDoc: false,
      });

      expect(score).toBe(0);
    });

    it('should calculate 100% score for complete property with RPP', () => {
      const score = computeScore({
        hasTitle: true,
        descriptionLength: 200,
        priceAmount: 1500000,
        addressFilled: true,
        featuresFilledCount: 5,
        mediaCount: 5,
        hasRppDoc: true,
      });

      expect(score).toBe(100);
    });

    it('should give 5 points for title', () => {
      const score = computeScore({
        hasTitle: true,
        descriptionLength: 0,
        priceAmount: 0,
        addressFilled: false,
        featuresFilledCount: 0,
        mediaCount: 0,
      });

      expect(score).toBe(COMPLETENESS_WEIGHTS.title);
    });

    it('should give 10 points for description >= 120 chars', () => {
      const score = computeScore({
        hasTitle: false,
        descriptionLength: 120,
        priceAmount: 0,
        addressFilled: false,
        featuresFilledCount: 0,
        mediaCount: 0,
      });

      expect(score).toBe(COMPLETENESS_WEIGHTS.description);
    });

    it('should give 0 points for description < 120 chars', () => {
      const score = computeScore({
        hasTitle: false,
        descriptionLength: 119,
        priceAmount: 0,
        addressFilled: false,
        featuresFilledCount: 0,
        mediaCount: 0,
      });

      expect(score).toBe(0);
    });

    it('should give 10 points for valid price', () => {
      const score = computeScore({
        hasTitle: false,
        descriptionLength: 0,
        priceAmount: 1000000,
        addressFilled: false,
        featuresFilledCount: 0,
        mediaCount: 0,
      });

      expect(score).toBe(COMPLETENESS_WEIGHTS.price);
    });

    it('should give 10 points for complete address', () => {
      const score = computeScore({
        hasTitle: false,
        descriptionLength: 0,
        priceAmount: 0,
        addressFilled: true,
        featuresFilledCount: 0,
        mediaCount: 0,
      });

      expect(score).toBe(COMPLETENESS_WEIGHTS.address);
    });

    it('should calculate features score (4 points each, max 20)', () => {
      const score3Features = computeScore({
        hasTitle: false,
        descriptionLength: 0,
        priceAmount: 0,
        addressFilled: false,
        featuresFilledCount: 3,
        mediaCount: 0,
      });

      expect(score3Features).toBe(12); // 3 * 4

      const score5Features = computeScore({
        hasTitle: false,
        descriptionLength: 0,
        priceAmount: 0,
        addressFilled: false,
        featuresFilledCount: 5,
        mediaCount: 0,
      });

      expect(score5Features).toBe(20); // max
    });

    it('should calculate media score (6 points each, max 30)', () => {
      const score2Media = computeScore({
        hasTitle: false,
        descriptionLength: 0,
        priceAmount: 0,
        addressFilled: false,
        featuresFilledCount: 0,
        mediaCount: 2,
      });

      expect(score2Media).toBe(12); // 2 * 6

      const score5Media = computeScore({
        hasTitle: false,
        descriptionLength: 0,
        priceAmount: 0,
        addressFilled: false,
        featuresFilledCount: 0,
        mediaCount: 5,
      });

      expect(score5Media).toBe(30); // 5 * 6 = 30 (max)
    });

    it('should not exceed max media score even with more than 5 images', () => {
      const score = computeScore({
        hasTitle: false,
        descriptionLength: 0,
        priceAmount: 0,
        addressFilled: false,
        featuresFilledCount: 0,
        mediaCount: 20,
      });

      expect(score).toBe(COMPLETENESS_WEIGHTS.mediaMax);
    });

    it('should give 15 bonus points for RPP document', () => {
      const scoreWithoutRpp = computeScore({
        hasTitle: true,
        descriptionLength: 120,
        priceAmount: 1000000,
        addressFilled: true,
        featuresFilledCount: 5,
        mediaCount: 5,
        hasRppDoc: false,
      });

      const scoreWithRpp = computeScore({
        hasTitle: true,
        descriptionLength: 120,
        priceAmount: 1000000,
        addressFilled: true,
        featuresFilledCount: 5,
        mediaCount: 5,
        hasRppDoc: true,
      });

      expect(scoreWithRpp - scoreWithoutRpp).toBe(COMPLETENESS_WEIGHTS.rppBonus);
    });

    it('should never exceed 100 points', () => {
      const score = computeScore({
        hasTitle: true,
        descriptionLength: 200,
        priceAmount: 5000000,
        addressFilled: true,
        featuresFilledCount: 10,
        mediaCount: 50,
        hasRppDoc: true,
      });

      expect(score).toBeLessThanOrEqual(100);
    });

    it('should never be negative', () => {
      const score = computeScore({
        hasTitle: false,
        descriptionLength: -10,
        priceAmount: -1000,
        addressFilled: false,
        featuresFilledCount: -5,
        mediaCount: -10,
      });

      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('classify', () => {
    it('should classify score >= 80 as green', () => {
      expect(classify(80)).toBe('green');
      expect(classify(90)).toBe('green');
      expect(classify(100)).toBe('green');
    });

    it('should classify score >= 50 and < 80 as amber', () => {
      expect(classify(50)).toBe('amber');
      expect(classify(65)).toBe('amber');
      expect(classify(79)).toBe('amber');
    });

    it('should classify score < 50 as red', () => {
      expect(classify(0)).toBe('red');
      expect(classify(25)).toBe('red');
      expect(classify(49)).toBe('red');
    });

    it('should use correct thresholds from constants', () => {
      expect(classify(PROGRESS_THRESHOLDS.green)).toBe('green');
      expect(classify(PROGRESS_THRESHOLDS.amber)).toBe('amber');
      expect(classify(PROGRESS_THRESHOLDS.red)).toBe('red');
    });
  });

  describe('MIN_PUBLISH_SCORE requirement', () => {
    it('should define minimum publish score as 80%', () => {
      expect(MIN_PUBLISH_SCORE).toBe(80);
    });

    it('should not allow publishing with score < 80', () => {
      const score79 = 79;
      const canPublish = score79 >= MIN_PUBLISH_SCORE;
      
      expect(canPublish).toBe(false);
    });

    it('should allow publishing with score >= 80', () => {
      const score80 = 80;
      const canPublish = score80 >= MIN_PUBLISH_SCORE;
      
      expect(canPublish).toBe(true);
    });
  });
});
