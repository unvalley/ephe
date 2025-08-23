import { describe, it, expect } from 'vitest';
import {
  toggleTaskCompletion,
  convertToTaskList,
  getIndentLevel,
  createNewTaskLine,
} from '../core/task-list/utils';

describe('Task List Utils', () => {
  describe('toggleTaskCompletion', () => {
    it('should toggle open tasks to closed', () => {
      expect(toggleTaskCompletion('- [ ] task')).toBe('- [x] task');
      expect(toggleTaskCompletion('* [ ] task')).toBe('* [x] task');
      expect(toggleTaskCompletion('  - [ ] indented')).toBe('  - [x] indented');
    });

    it('should toggle closed tasks to open', () => {
      expect(toggleTaskCompletion('- [x] task')).toBe('- [ ] task');
      expect(toggleTaskCompletion('- [X] task')).toBe('- [ ] task');
      expect(toggleTaskCompletion('* [x] task')).toBe('* [ ] task');
    });

    it('should not modify non-task lines', () => {
      expect(toggleTaskCompletion('- regular item')).toBe('- regular item');
      expect(toggleTaskCompletion('plain text')).toBe('plain text');
    });
  });

  describe('convertToTaskList', () => {
    it('should convert regular list items to tasks', () => {
      expect(convertToTaskList('- item')).toBe('- [ ] item');
      expect(convertToTaskList('* item')).toBe('* [ ] item');
      expect(convertToTaskList('+ item')).toBe('- [ ] item'); // + becomes -
      expect(convertToTaskList('  - nested')).toBe('  - [ ] nested');
    });

    it('should not modify non-list lines', () => {
      expect(convertToTaskList('plain text')).toBe('plain text');
      expect(convertToTaskList('- [ ] already task')).toBe('- [ ] already task');
    });
  });

  describe('getIndentLevel', () => {
    it('should return correct indentation level', () => {
      expect(getIndentLevel('no indent')).toBe(0);
      expect(getIndentLevel('  two spaces')).toBe(2);
      expect(getIndentLevel('    four spaces')).toBe(4);
      expect(getIndentLevel('\t\tone tab')).toBe(2); // assuming tab = 2 spaces
    });
  });

  describe('createNewTaskLine', () => {
    it('should create task line with given indentation', () => {
      expect(createNewTaskLine('')).toBe('- [ ] ');
      expect(createNewTaskLine('  ')).toBe('  - [ ] ');
      expect(createNewTaskLine('    ')).toBe('    - [ ] ');
    });

    it('should use custom bullet if provided', () => {
      expect(createNewTaskLine('', '*')).toBe('* [ ] ');
      expect(createNewTaskLine('  ', '*')).toBe('  * [ ] ');
    });
  });
});