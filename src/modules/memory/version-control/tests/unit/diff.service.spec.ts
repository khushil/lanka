import { Test, TestingModule } from '@nestjs/testing';
import { DiffService } from '../../services/diff.service';

describe('DiffService', () => {
  let service: DiffService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiffService],
    }).compile();

    service = module.get<DiffService>(DiffService);
  });

  describe('generateDiff', () => {
    it('should detect added content', () => {
      const before = null;
      const after = { content: 'new content' };

      const diff = service.generateDiff(before, after);

      expect(diff).toHaveLength(1);
      expect(diff[0].type).toBe('added');
      expect(diff[0].path).toBe('root');
      expect(diff[0].newValue).toEqual(after);
    });

    it('should detect removed content', () => {
      const before = { content: 'old content' };
      const after = null;

      const diff = service.generateDiff(before, after);

      expect(diff).toHaveLength(1);
      expect(diff[0].type).toBe('removed');
      expect(diff[0].path).toBe('root');
      expect(diff[0].oldValue).toEqual(before);
    });

    it('should detect type changes', () => {
      const before = 'string content';
      const after = { content: 'object content' };

      const diff = service.generateDiff(before, after);

      expect(diff).toHaveLength(1);
      expect(diff[0].type).toBe('modified');
      expect(diff[0].path).toBe('root');
      expect(diff[0].oldValue).toBe(before);
      expect(diff[0].newValue).toEqual(after);
    });

    it('should detect object property changes', () => {
      const before = {
        name: 'John',
        age: 30,
        city: 'New York',
      };
      const after = {
        name: 'John',
        age: 31,
        country: 'USA',
      };

      const diff = service.generateDiff(before, after);

      expect(diff).toHaveLength(3);
      
      const modifiedDiff = diff.find(d => d.type === 'modified');
      const addedDiff = diff.find(d => d.type === 'added');
      const removedDiff = diff.find(d => d.type === 'removed');

      expect(modifiedDiff?.path).toBe('age');
      expect(modifiedDiff?.oldValue).toBe(30);
      expect(modifiedDiff?.newValue).toBe(31);

      expect(addedDiff?.path).toBe('country');
      expect(addedDiff?.newValue).toBe('USA');

      expect(removedDiff?.path).toBe('city');
      expect(removedDiff?.oldValue).toBe('New York');
    });

    it('should handle nested object changes', () => {
      const before = {
        user: {
          profile: {
            name: 'John',
            age: 30,
          },
        },
      };
      const after = {
        user: {
          profile: {
            name: 'Jane',
            age: 30,
          },
        },
      };

      const diff = service.generateDiff(before, after);

      expect(diff).toHaveLength(1);
      expect(diff[0].type).toBe('modified');
      expect(diff[0].path).toBe('user.profile.name');
      expect(diff[0].oldValue).toBe('John');
      expect(diff[0].newValue).toBe('Jane');
    });

    it('should detect array changes', () => {
      const before = ['a', 'b', 'c'];
      const after = ['a', 'c', 'd'];

      const diff = service.generateDiff(before, after);

      expect(diff.length).toBeGreaterThan(0);
      const removedItem = diff.find(d => d.type === 'removed');
      const addedItem = diff.find(d => d.type === 'added');

      expect(removedItem).toBeDefined();
      expect(addedItem).toBeDefined();
    });

    it('should detect string changes with similarity', () => {
      const before = 'The quick brown fox';
      const after = 'The quick brown dog';

      const diff = service.generateDiff(before, after);

      expect(diff).toHaveLength(1);
      expect(diff[0].type).toBe('modified');
      expect(diff[0].similarity).toBeGreaterThan(0.8);
      expect(diff[0].similarity).toBeLessThan(1.0);
    });

    it('should return empty array for identical values', () => {
      const before = { content: 'same content' };
      const after = { content: 'same content' };

      const diff = service.generateDiff(before, after);

      expect(diff).toHaveLength(0);
    });
  });

  describe('formatDiff', () => {
    it('should format empty diff', () => {
      const diff = [];

      const formatted = service.formatDiff(diff);

      expect(formatted).toBe('No changes');
    });

    it('should format added changes', () => {
      const diff = [{
        type: 'added' as const,
        path: 'newField',
        newValue: 'new value',
      }];

      const formatted = service.formatDiff(diff);

      expect(formatted).toContain('+ newField: "new value"');
    });

    it('should format removed changes', () => {
      const diff = [{
        type: 'removed' as const,
        path: 'oldField',
        oldValue: 'old value',
      }];

      const formatted = service.formatDiff(diff);

      expect(formatted).toContain('- oldField: "old value"');
    });

    it('should format modified changes with similarity', () => {
      const diff = [{
        type: 'modified' as const,
        path: 'field',
        oldValue: 'old value',
        newValue: 'new value',
        similarity: 0.75,
      }];

      const formatted = service.formatDiff(diff);

      expect(formatted).toContain('~ field:');
      expect(formatted).toContain('- "old value"');
      expect(formatted).toContain('+ "new value"');
      expect(formatted).toContain('(similarity: 75.0%)');
    });
  });

  describe('getDiffStats', () => {
    it('should calculate diff statistics', () => {
      const diff = [
        { type: 'added' as const, path: 'field1', newValue: 'value1' },
        { type: 'removed' as const, path: 'field2', oldValue: 'value2' },
        { type: 'modified' as const, path: 'field3', oldValue: 'old', newValue: 'new', similarity: 0.8 },
        { type: 'modified' as const, path: 'field4', oldValue: 'old2', newValue: 'new2', similarity: 0.6 },
      ];

      const stats = service.getDiffStats(diff);

      expect(stats.total).toBe(4);
      expect(stats.added).toBe(1);
      expect(stats.removed).toBe(1);
      expect(stats.modified).toBe(2);
      expect(stats.averageSimilarity).toBe(0.7); // (0.8 + 0.6) / 2
    });

    it('should handle empty diff stats', () => {
      const diff = [];

      const stats = service.getDiffStats(diff);

      expect(stats.total).toBe(0);
      expect(stats.added).toBe(0);
      expect(stats.removed).toBe(0);
      expect(stats.modified).toBe(0);
      expect(stats.averageSimilarity).toBe(0);
    });
  });

  describe('similarity calculations', () => {
    it('should calculate string similarity correctly', () => {
      // Test Levenshtein distance
      const similarity1 = (service as any).calculateStringSimilarity('hello', 'hello');
      expect(similarity1).toBe(1.0);

      const similarity2 = (service as any).calculateStringSimilarity('hello', 'hallo');
      expect(similarity2).toBeGreaterThan(0.8);

      const similarity3 = (service as any).calculateStringSimilarity('hello', 'world');
      expect(similarity3).toBeLessThan(0.5);

      const similarity4 = (service as any).calculateStringSimilarity('', '');
      expect(similarity4).toBe(1.0);

      const similarity5 = (service as any).calculateStringSimilarity('hello', '');
      expect(similarity5).toBe(0.0);
    });

    it('should calculate object similarity correctly', () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { a: 1, b: 2, d: 4 };

      const similarity = (service as any).calculateObjectSimilarity(obj1, obj2);

      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    it('should handle empty objects in similarity calculation', () => {
      const similarity = (service as any).calculateObjectSimilarity({}, {});
      expect(similarity).toBe(1.0);
    });
  });

  describe('Levenshtein distance', () => {
    it('should calculate correct distance', () => {
      const distance1 = (service as any).levenshteinDistance('kitten', 'sitting');
      expect(distance1).toBe(3);

      const distance2 = (service as any).levenshteinDistance('', 'hello');
      expect(distance2).toBe(5);

      const distance3 = (service as any).levenshteinDistance('hello', '');
      expect(distance3).toBe(5);

      const distance4 = (service as any).levenshteinDistance('same', 'same');
      expect(distance4).toBe(0);
    });
  });
});