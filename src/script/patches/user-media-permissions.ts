import { registerPatch } from '@lib/patch';

registerPatch('User Media Permissions', () => {
  if (!('permissions' in navigator) || typeof navigator.permissions.query !== 'function' || !navigator.userAgent.toLowerCase().includes('firefox')) {
    return;
  }

  navigator.getUserMedia = navigator.getUserMedia ?? navigator.webkitGetUserMedia ?? navigator.mozGetUserMedia;

  /**
   * Requests audio and video via `getUserMedia` and produces a permission-state object.
   *
   * @returns An object with `state` set to `'granted'` if media access was obtained, `'denied'` otherwise.
   */
  function userMediaPromise() {
    return new Promise((resolve) => {
      navigator.getUserMedia(
        { audio: true, video: true },
        () => resolve({ state: 'granted' }),
        () => resolve({ state: 'denied' }),
      );
    });
  }

  navigator.permissions.query = new Proxy(navigator.permissions.query, {
    apply: async (target, thisArg, args) => {
      const [permission] = args;

      if (permission.name === 'camera' || permission.name === 'microphone') {
        return userMediaPromise();
      }

      return Reflect.apply(target, thisArg, args);
    },
  });
});
