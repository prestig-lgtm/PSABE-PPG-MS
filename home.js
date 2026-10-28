/* Home page shell helpers. Published hero slides are rendered by content-public.js from Content Studio. */
(function () {
  'use strict';
  const year = document.getElementById('currentYear');
  if (year) year.textContent = new Date().getFullYear();
})();
