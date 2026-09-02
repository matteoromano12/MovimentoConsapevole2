document.addEventListener('DOMContentLoaded', function () {
  var input = document.querySelector('[data-news-search]');
  var empty = document.querySelector('[data-news-empty]');

  if (!input) {
    return;
  }

  function normalize(str) {
    return str.toLowerCase().trim();
  }

  input.addEventListener('input', function () {
    var cards = document.querySelectorAll('[data-article-card]');
    var query = normalize(input.value);
    var visibleCount = 0;

    cards.forEach(function (card) {
      var haystack = normalize(card.textContent);
      var matches = haystack.indexOf(query) !== -1;
      card.hidden = !matches;
      if (matches) {
        visibleCount++;
      }
    });

    if (empty) {
      empty.hidden = visibleCount !== 0 || cards.length === 0;
    }
  });
});
