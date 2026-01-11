// ResizeObserver error suppressor
const resizeObserverLoopErr = () => {
  const resizeObserverErr = window.console.error;
  window.console.error = (...args) => {
    if (args[0]?.toString().includes('ResizeObserver loop')) {
      return;
    }
    resizeObserverErr(...args);
  };
};

resizeObserverLoopErr();
