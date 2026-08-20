import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useUidMappingsStore } from './uidMappings';

describe('uidMappings store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('builds a uid-to-uname map', () => {
    const store = useUidMappingsStore();

    store.uidMappings = [
      { uid: '100', uname: '角色A' },
      { uid: '200', uname: '角色B' },
    ];

    expect(store.uidToUnameMap.get('100')).toBe('角色A');
    expect(store.uidToUnameMap.get('200')).toBe('角色B');
    expect(store.uidToUnameMap.size).toBe(2);
  });
});
