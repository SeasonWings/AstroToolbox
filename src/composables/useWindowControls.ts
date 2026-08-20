import { ref } from 'vue';

const getApi = () => window.astroToolbox;

export function useWindowControls() {
  const isWindowMaximized = ref(false);

  async function syncMaximizedState(): Promise<void> {
    try {
      isWindowMaximized.value = await getApi().isWindowMaximized();
    } catch {
      isWindowMaximized.value = false;
    }
  }

  async function minimize(): Promise<void> {
    await getApi().minimizeWindow();
  }

  async function toggleMaximize(): Promise<void> {
    isWindowMaximized.value = await getApi().toggleMaximizeWindow();
  }

  async function close(): Promise<void> {
    await getApi().closeWindow();
  }

  return { isWindowMaximized, syncMaximizedState, minimize, toggleMaximize, close };
}
