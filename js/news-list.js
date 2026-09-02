document.addEventListener('DOMContentLoaded', function () {
  var grid = document.querySelector('[data-articles-grid]');
  if (!grid || typeof ArticlesStore === 'undefined') {
    return;
  }

  ArticlesStore.getAll().then(function (articles) {
    grid.innerHTML = '';
    articles.forEach(function (item) {
      var a = document.createElement('a');
      a.href = 'articolo.html?id=' + item.id;
      a.className = 'article-card';
      a.setAttribute('data-article-card', '');

      a.innerHTML =
        '<img src="' + item.image + '" width="768" height="512" loading="lazy" alt="' + item.title + '">' +
        '<div class="article-card__body">' +
        '<div class="article-card__meta">' +
        '<span class="article-card__tag">' + item.tag + '</span>' +
        '<span class="article-card__date">' + ArticlesStore.formatDate(item.dateISO) + '</span>' +
        '</div>' +
        '<h3>' + item.title + '</h3>' +
        '<p>' + item.excerpt + '</p>' +
        '</div>';

      grid.appendChild(a);
    });

    var empty = document.querySelector('[data-news-empty]');
    if (empty) {
      empty.hidden = articles.length !== 0;
    }
  }).catch(function () {
    grid.innerHTML = '<p class="news-empty">Impossibile caricare gli articoli al momento. Riprova più tardi.</p>';
  });
});
