(function () {
  try {
    if (window.self === window.top) return;
    document.documentElement.classList.add('in-frame');
    var s = document.createElement('style');
    s.textContent =
      'html.in-frame [data-safe-root]{padding-top:0!important;padding-bottom:0!important}';
    document.head.appendChild(s);
  } catch (e) {}
})();
