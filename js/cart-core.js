var Cart = (function () {
  var STORAGE_KEY = 'mc_cart';

  function read() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function write(items) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      /* localStorage not available: cart stays in-memory for this page view */
    }
    updateBadge();
  }

  function getItems() {
    return read();
  }

  function add(productId, qty) {
    qty = qty || 1;
    var items = read();
    var existing = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === productId) {
        existing = items[i];
        break;
      }
    }
    if (existing) {
      existing.qty += qty;
    } else {
      items.push({ id: productId, qty: qty });
    }
    write(items);
  }

  function setQty(productId, qty) {
    var items = read();
    items = items.filter(function (item) {
      return item.id !== productId || qty > 0;
    });
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === productId) {
        items[i].qty = qty;
      }
    }
    write(items);
  }

  function remove(productId) {
    var items = read().filter(function (item) {
      return item.id !== productId;
    });
    write(items);
  }

  function clear() {
    write([]);
  }

  function count() {
    return read().reduce(function (sum, item) {
      return sum + item.qty;
    }, 0);
  }

  function updateBadge() {
    var badges = document.querySelectorAll('[data-cart-badge]');
    var total = count();
    badges.forEach(function (badge) {
      badge.textContent = String(total);
      badge.classList.toggle('is-visible', total > 0);
    });
  }

  document.addEventListener('DOMContentLoaded', updateBadge);

  return {
    getItems: getItems,
    add: add,
    setQty: setQty,
    remove: remove,
    clear: clear,
    count: count,
    updateBadge: updateBadge
  };
})();
