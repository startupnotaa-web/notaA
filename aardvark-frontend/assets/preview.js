document.addEventListener('submit', (event) => {
  if (!(event.target instanceof HTMLFormElement)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  window.alert('Newsletter signup is available on the official Aardvark Book Club website.');
}, true);
