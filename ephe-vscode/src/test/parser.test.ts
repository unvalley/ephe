import { describe, it, expect } from 'vitest';
import {
  isTaskLine,
  isRegularListLine,
  isEmptyListLine,
  isOpenTaskLine,
  isClosedTaskLine,
  parseTaskLine,
  parseEmptyListLine,
  parseRegularListLine,
} from '../core/task-list/parser';

describe('Task List Parser', () => {
  describe('isTaskLine', () => {
    it('should identify task lines', () => {
      expect(isTaskLine('- [ ] task')).toBe(true);
      expect(isTaskLine('- [x] completed')).toBe(true);
      expect(isTaskLine('- [X] completed')).toBe(true);
      expect(isTaskLine('* [ ] task')).toBe(true);
      expect(isTaskLine('  - [ ] indented')).toBe(true);
    });

    it('should not identify non-task lines', () => {
      expect(isTaskLine('- regular item')).toBe(false);
      expect(isTaskLine('plain text')).toBe(false);
      expect(isTaskLine('')).toBe(false);
    });
  });

  describe('isOpenTaskLine', () => {
    it('should identify open tasks', () => {
      expect(isOpenTaskLine('- [ ] open task')).toBe(true);
      expect(isOpenTaskLine('* [ ] open task')).toBe(true);
    });

    it('should not identify closed tasks', () => {
      expect(isOpenTaskLine('- [x] closed')).toBe(false);
      expect(isOpenTaskLine('- [X] closed')).toBe(false);
    });
  });

  describe('isClosedTaskLine', () => {
    it('should identify closed tasks', () => {
      expect(isClosedTaskLine('- [x] closed')).toBe(true);
      expect(isClosedTaskLine('- [X] closed')).toBe(true);
      expect(isClosedTaskLine('* [x] closed')).toBe(true);
    });

    it('should not identify open tasks', () => {
      expect(isClosedTaskLine('- [ ] open')).toBe(false);
    });
  });

  describe('isRegularListLine', () => {
    it('should identify regular list items', () => {
      expect(isRegularListLine('- item')).toBe(true);
      expect(isRegularListLine('* item')).toBe(true);
      expect(isRegularListLine('+ item')).toBe(true);
      expect(isRegularListLine('  - indented item')).toBe(true);
    });

    it('should not identify task lines as regular lists', () => {
      expect(isRegularListLine('- [ ] task')).toBe(false);
      expect(isRegularListLine('- [x] task')).toBe(false);
    });
  });

  describe('isEmptyListLine', () => {
    it('should identify empty list items', () => {
      expect(isEmptyListLine('- ')).toBe(true);
      expect(isEmptyListLine('* ')).toBe(true);
      expect(isEmptyListLine('+ ')).toBe(true);
      expect(isEmptyListLine('-')).toBe(true);
      expect(isEmptyListLine('  - ')).toBe(true);
    });

    it('should not identify non-empty items', () => {
      expect(isEmptyListLine('- item')).toBe(false);
      expect(isEmptyListLine('- [ ]')).toBe(false);
    });
  });

  describe('parseTaskLine', () => {
    it('should parse task line components', () => {
      expect(parseTaskLine('- [ ] task')).toEqual({ indent: '', bullet: '-' });
      expect(parseTaskLine('* [x] task')).toEqual({ indent: '', bullet: '*' });
      expect(parseTaskLine('  - [ ] task')).toEqual({ indent: '  ', bullet: '-' });
    });

    it('should return null for non-task lines', () => {
      expect(parseTaskLine('- regular')).toBe(null);
      expect(parseTaskLine('text')).toBe(null);
    });
  });

  describe('parseEmptyListLine', () => {
    it('should parse empty list components', () => {
      expect(parseEmptyListLine('- ')).toEqual({ indent: '', bullet: '-' });
      expect(parseEmptyListLine('* ')).toEqual({ indent: '', bullet: '*' });
      expect(parseEmptyListLine('  + ')).toEqual({ indent: '  ', bullet: '+' });
    });

    it('should return null for non-empty lines', () => {
      expect(parseEmptyListLine('- item')).toBe(null);
      expect(parseEmptyListLine('text')).toBe(null);
    });
  });

  describe('parseRegularListLine', () => {
    it('should parse regular list components', () => {
      expect(parseRegularListLine('- item')).toEqual({ 
        indent: '', 
        bullet: '-', 
        content: 'item' 
      });
      expect(parseRegularListLine('  * nested item')).toEqual({ 
        indent: '  ', 
        bullet: '*', 
        content: 'nested item' 
      });
    });

    it('should return null for non-list lines', () => {
      expect(parseRegularListLine('plain text')).toBe(null);
      expect(parseRegularListLine('')).toBe(null);
    });
  });
});