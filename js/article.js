document.addEventListener('DOMContentLoaded', function () {
  var container = document.querySelector('[data-article-root]');
  if (!container || typeof ARTICLES === 'undefined') {
    return;
  }

  var params = new URLSearchParams(window.location.search);
  var id = Number(params.get('id'));
  var article = ARTICLES.filter(function (item) {
    return item.id === id;
  })[0];

  if (!article) {
    article = ARTICLES[0];
  }

  document.title = article.title + ' — Mary Ceraolo';

  var tagEl = container.querySelector('[data-article-tag]');
  var dateEl = container.querySelector('[data-article-date]');
  var titleEl = container.querySelector('[data-article-title]');
  var imageEl = container.querySelector('[data-article-image]');
  var bodyEl = container.querySelector('[data-article-body]');

  if (tagEl) tagEl.textContent = article.tag;
  if (dateEl) dateEl.textContent = article.date;
  if (titleEl) titleEl.textContent = article.title;
  if (imageEl) {
    imageEl.src = article.image;
    imageEl.alt = article.title;
  }
  if (bodyEl) {
    bodyEl.innerHTML = '';
    article.body.forEach(function (paragraph) {
      var p = document.createElement('p');
      p.textContent = paragraph;
      bodyEl.appendChild(p);
    });
  }

  var relatedRoot = document.querySelector('[data-article-related]');
  if (relatedRoot) {
    var related = ARTICLES.filter(function (item) {
      return item.id !== article.id;
    }).slice(0, 3);

    relatedRoot.innerHTML = '';
    related.forEach(function (item) {
      var a = document.createElement('a');
      a.href = 'articolo.html?id=' + item.id;
      a.className = 'article-card';

      a.innerHTML =
        '<img src="' + item.image + '" width="768" height="512" loading="lazy" alt="' + item.title + '">' +
        '<div class="article-card__body">' +
        '<span class="article-card__tag">' + item.tag + '</span>' +
        '<h3>' + item.title + '</h3>' +
        '<p>' + item.excerpt + '</p>' +
        '</div>';

      relatedRoot.appendChild(a);
    });
  }
});
