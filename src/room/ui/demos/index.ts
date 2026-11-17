/*
  The projects that can be played in their window of the desktop. Each one
  starts the first time its window shows; its code and its program are only
  loaded then.
*/
import { onRoute } from '../route.ts';

const PROGRAMS: Record<string, () => Promise<{ mount(root: HTMLElement): Promise<() => void> }>> = {
  fluid: () => import('./fluid.ts'),
  chess: () => import('./chess.ts'),
};

async function start(root: HTMLElement): Promise<() => void> {
  const state = root.querySelector<HTMLElement>('.state')!;
  const words: { loading: string; failed: string } = JSON.parse(root.dataset.words!);
  state.textContent = words.loading;
  try {
    const { mount } = await PROGRAMS[root.dataset.demo!]();
    const wake = await mount(root);
    if (state.textContent === words.loading) state.textContent = '';
    return wake;
  } catch {
    state.textContent = words.failed;
    return () => undefined;
  }
}

export function setupDemos(root: HTMLElement): void {
  const demos = [...root.querySelectorAll<HTMLElement>('[data-demo]')].map((element) => ({ element, wake: null as Promise<() => void> | null }));
  const look = () => {
    for (const demo of demos) {
      if (demo.element.getClientRects().length === 0) continue; // its window is shut
      demo.wake ??= start(demo.element);
      void demo.wake.then((wake) => wake());
    }
  };
  onRoute(look);
  look();
}
