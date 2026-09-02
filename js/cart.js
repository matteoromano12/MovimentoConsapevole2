document.addEventListener('DOMContentLoaded', function () {
  var root = document.querySelector('[data-cart-root]');
  if (!root || typeof ProductsStore === 'undefined') {
    return;
  }

  var listEl = root.querySelector('[data-cart-list]');
  var emptyEl = root.querySelector('[data-cart-empty]');
  var totalEl = root.querySelector('[data-cart-total]');
  var clearBtn = root.querySelector('[data-cart-clear]');
  var formatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

  var products = [];

  function findProduct(id) {
    return products.filter(function (p) { return p.id === id; })[0];
  }

  function render() {
    var items = Cart.getItems();
    listEl.innerHTML = '';

    if (!items.length) {
      emptyEl.hidden = false;
      totalEl.textContent = formatter.format(0);
      return;
    }

    emptyEl.hidden = true;
    var total = 0;

    items.forEach(function (item) {
      var product = findProduct(item.id);
      if (!product) {
        return;
      }
      var lineTotal = product.price * item.qty;
      total += lineTotal;

      var row = document.createElement('div');
      row.className = 'cart-row';
      row.innerHTML =
        '<div class="cart-row__icon">' + productIcon(product.icon) + '</div>' +
        '<div class="cart-row__info">' +
        '<h3>' + product.name + '</h3>' +
        '<span class="cart-row__unit">' + formatter.format(product.price) + ' / pz</span>' +
        '</div>' +
        '<div class="qty-stepper">' +
        '<button type="button" data-qty-minus="' + product.id + '" aria-label="Diminuisci quantità">−</button>' +
        '<span>' + item.qty + '</span>' +
        '<button type="button" data-qty-plus="' + product.id + '" aria-label="Aumenta quantità">+</button>' +
        '</div>' +
        '<div class="cart-row__total">' + formatter.format(lineTotal) + '</div>' +
        '<button type="button" class="cart-row__remove" data-remove="' + product.id + '" aria-label="Rimuovi articolo">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 6h14M9 6V4h6v2M6 6l1 14h10l1-14"/></svg>' +
        '</button>';
      listEl.appendChild(row);
    });

    totalEl.textContent = formatter.format(total);
  }

  listEl.addEventListener('click', function (event) {
    var plus = event.target.closest('[data-qty-plus]');
    var minus = event.target.closest('[data-qty-minus]');
    var remove = event.target.closest('[data-remove]');

    if (plus) {
      var idPlus = plus.getAttribute('data-qty-plus');
      var current = Cart.getItems().filter(function (i) { return i.id === idPlus; })[0];
      Cart.setQty(idPlus, (current ? current.qty : 0) + 1);
      render();
    } else if (minus) {
      var idMinus = minus.getAttribute('data-qty-minus');
      var currentMinus = Cart.getItems().filter(function (i) { return i.id === idMinus; })[0];
      Cart.setQty(idMinus, (currentMinus ? currentMinus.qty : 1) - 1);
      render();
    } else if (remove) {
      Cart.remove(remove.getAttribute('data-remove'));
      render();
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      Cart.clear();
      render();
    });
  }

  ProductsStore.getAll().then(function (list) {
    products = list;
    render();
  }).catch(function () {
    listEl.innerHTML = '<p>Impossibile caricare il carrello al momento. Riprova più tardi.</p>';
  });
});
