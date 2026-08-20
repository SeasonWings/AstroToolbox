import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useRolesStore } from './roles';
import { useUidMappingsStore } from './uidMappings';

describe('roles store sortedRoles', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('sorts mapped roles first and then by updatedAt desc', () => {
    const uidMappingsStore = useUidMappingsStore();
    const rolesStore = useRolesStore();

    uidMappingsStore.uidMappings = [{ uid: '222', uname: '已映射角色' }];
    rolesStore.roles = [
      {
        id: 'a',
        folderName: '111',
        relativePath: 'a',
        fullPath: '/a',
        updatedAt: '2024-01-03T00:00:00.000Z',
      },
      {
        id: 'b',
        folderName: '222',
        relativePath: 'b',
        fullPath: '/b',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'c',
        folderName: '333',
        relativePath: 'c',
        fullPath: '/c',
        updatedAt: '2024-01-02T00:00:00.000Z',
      },
    ];

    expect(rolesStore.sortedRoles.map((role) => role.folderName)).toEqual(['222', '111', '333']);
  });
});
