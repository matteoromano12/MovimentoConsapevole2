document.addEventListener('DOMContentLoaded', function () {
  var grid = document.querySelector('[data-shop-grid]');
  if (!grid || typeof ProductsStore === 'undefined') {
    return;
  }

  var formatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

  ProductsStore.getAll().then(function (products) {
    grid.innerHTML = '';
    products.forEach(function (product) {
      var card = document.createElement('article');
      card.className = 'product-card';
      card.innerHTML =
        '<div class="product-card__icon">' + productIcon(product.icon) + '</div>' +
        '<div class="product-card__body">' +
        '<h2>' + product.name + '</h2>' +
        '<p>' + product.description + '</p>' +
        '<div class="product-card__footer">' +
        '<span class="product-card__price">' + formatter.format(product.price) + '</span>' +
        '<button type="button" class="btn btn-primary" data-add-to-cart="' + product.id + '">Aggiungi</button>' +
        '</div></div>';
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
