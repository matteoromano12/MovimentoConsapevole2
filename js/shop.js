document.addEventListener('DOMContentLoaded', function () {
  var grid = document.querySelector('[data-shop-grid]');
  if (!grid || typeof ProductsStore === 'undefined') {
    return;
  }

  var formatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

  ProductsStore.getAll().then(function (products) {
    grid.innerHTML = '';
    products.forEach(function (product) {
      var isLink = product.type === 'link';

      var card = document.createElement('article');
      card.className = 'product-card';
      card.innerHTML =
        '<div class="product-card__icon">' + productIcon(product.icon) + '</div>' +
        '<div class="product-card__body">' +
        '<h2>' + product.name + '</h2>' +
        '<p>' + product.description + '</p>' +
        '</div>';

      var footer = document.createElement('div');
      footer.className = 'product-card__footer' + (isLink ? ' product-card__footer--link' : '');

      if (isLink) {
        var link = document.createElement('a');
        link.className = 'btn btn-primary';
        link.href = product.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Scopri';
        footer.appendChild(link);
      } else {
        var price = document.createElement('span');
        price.className = 'product-card__price';
        price.textContent = formatter.format(product.price);

        var addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'btn btn-primary';
        addButton.setAttribute('data-add-to-cart', product.id);
        addButton.textContent = 'Aggiungi';

        footer.appendChild(price);
        footer.appendChild(addButton);
      }

      card.querySelector('.product-card__body').appendChild(footer);
      grid.appendChild(card);
    });
  }).catch(function () {
    grid.innerHTML = '<p>Impossibile caricare i prodotti al momento. Riprova più tardi.</p>';
  });

  grid.addEventListener('click', function (event) {
    var button = event.target.closest('[data-add-to-cart]');
    if (!button) {
      return;
    }
    Cart.add(button.getAttribute('data-add-to-cart'), 1);

    var originalText = button.textContent;
    button.textContent = 'Aggiunto ✓';
    button.disabled = true;
    setTimeout(function () {
      button.textContent = originalText;
      button.disabled = false;
    }, 900);
  });
});
