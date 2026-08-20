/// <reference types="vite/client" />

import type { ToolboxApi } from '../shared/index';

declare global {
  interface Window {
    astroToolbox: ToolboxApi;
  }
}

export {};
