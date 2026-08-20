import { createRouter, createWebHashHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeRedirect.vue'),
  },
  {
    path: '/config',
    name: 'config',
    component: () => import('../views/ConfigView.vue'),
  },
  {
    path: '/roles',
    name: 'roles',
    component: () => import('../views/RolesView.vue'),
  },
  {
    path: '/archives',
    name: 'archives',
    component: () => import('../views/ArchivesView.vue'),
  },
];

export default createRouter({
  history: createWebHashHistory(),
  routes,
});
