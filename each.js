/* each.js — shared behavior for every page: mobile nav, Join → MailerLite popup. */
(function () {
  'use strict';

  // Expose the sticky header's height so page-level sticky bars can sit under it.
  var header = document.querySelector('.site-header');
  function setHeaderH() { if (header) document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px'); }
  setHeaderH(); window.addEventListener('resize', setHeaderH);

  // Mobile nav
  var burger = document.querySelector('.hamburger');
  var links = document.querySelector('.nav-links');
  if (burger && links) {
    burger.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      setHeaderH();
    });
  }

  // Every "join" control opens the MailerLite signup popup (form dniyZj).
  // If the MailerLite script hasn't loaded, fall back to the contact page.
  function openSignup(e) {
    if (typeof window.ml === 'function') {
      e.preventDefault();
      window.ml('show', 'dniyZj', true);
    }
  }
  var joins = document.querySelectorAll('[data-join]');
  for (var i = 0; i < joins.length; i++) joins[i].addEventListener('click', openSignup);
})();
