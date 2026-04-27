/// <reference types="vite/client" />

import type { ToolboxApi } from '../shared/contracts';

declare global {
  interface Window {
    astroToolbox: ToolboxApi;
  }
}

export {};

