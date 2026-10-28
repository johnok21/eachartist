/* each.js — shared behavior for every page: mobile nav, Join → MailerLite popup. */
(function () {
  'use strict';

  // Mobile nav
  var burger = document.querySelector('.hamburger');
  var links = document.querySelector('.nav-links');
  if (burger && links) {
    burger.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
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
