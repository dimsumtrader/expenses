// Minimal jsdom setup for tests
Object.defineProperty(window, "navigator", {
  value: {
    vibrate: () => true,
  },
  writable: true,
});
