document.addEventListener('DOMContentLoaded', function () {
  if (typeof ProductsStore === 'undefined') {
    return;
  }

  var listEl = document.querySelector('[data-shop-list]');
  var emptyEl = document.querySelector('[data-shop-empty]');
  var overlay = document.querySelector('[data-product-overlay]');
  var form = document.querySelector('[data-product-form]');
  var modalTitle = document.querySelector('[data-product-modal-title]');
  var deleteBtn = document.querySelector('[data-delete-product]');
  var iconSelect = document.querySelector('[data-product-icon-select]');
  var iconPreview = document.querySelector('[data-product-icon-preview]');

  var formatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

  var fieldId = form.querySelector('[data-field="id"]');
  var fieldName = form.querySelector('[data-field="name"]');
  var fieldType = form.querySelector('[data-field="type"]');
  var fieldPrice = form.querySelector('[data-field="price"]');
  var fieldUrl = form.querySelector('[data-field="url"]');
  var fieldDescription = form.querySelector('[data-field="description"]');
  var priceField = form.querySelector('[data-product-price-field]');
  var urlField = form.querySelector('[data-product-url-field]');

  function updateIconPreview() {
    iconPreview.innerHTML = productIcon(iconSelect.value);
  }

  function updateTypeUI() {
    var isLink = fieldType.value === 'link';
    priceField.hidden = isLink;
    fieldPrice.required = !isLink;
    urlField.hidden = !isLink;
    fieldUrl.required = isLink;
  }

  function renderList() {
    return ProductsStore.getAll().then(function (products) {
      listEl.innerHTML = '';
      emptyEl.hidden = products.length !== 0;

      products.forEach(function (product) {
        var row = document.createElement('div');
        row.className = 'admin-row';
        var meta = product.type === 'link'
          ? ('Link → ' + product.url)
          : formatter.format(product.price);
        row.innerHTML =
          '<div class="admin-row__thumb admin-row__thumb--icon">' + productIcon(product.icon) + '</div>' +
          '<div class="admin-row__body">' +
          '<h3>' + product.name + '</h3>' +
          '<span class="admin-row__date">' + meta + '</span>' +
          '</div>' +
          '<div class="admin-row__actions">' +
          '<button type="button" class="btn-link" data-edit-product="' + product.id + '">Modifica</button>' +
          '<button type="button" class="btn-link btn-link--danger" data-delete-product-row="' + product.id + '">Elimina</button>' +
          '</div>';
        listEl.appendChild(row);
      });
    }).catch(function (err) {
      AdminAuth.handleError(err, 'Impossibile caricare i prodotti al momento.');
    });
  }

  function openModal(product) {
    form.reset();
    deleteBtn.hidden = !product;
    modalTitle.textContent = product ? 'Modifica prodotto' : 'Nuovo prodotto';

    fieldId.value = product ? product.id : '';
    fieldName.value = product ? product.name : '';
    fieldType.value = product && product.type === 'link' ? 'link' : 'product';
    fieldPrice.value = product && product.type !== 'link' ? product.price : '';
    fieldUrl.value = product && product.type === 'link' ? product.url : '';
    fieldDescription.value = product ? product.description : '';
    iconSelect.value = product ? product.icon : iconSelect.options[0].value;
    updateIconPreview();
    updateTypeUI();

    overlay.hidden = false;
    document.body.classList.add('admin-modal-open');
    fieldName.focus();
  }

  function closeModal() {
    overlay.hidden = true;
    document.body.classList.remove('admin-modal-open');
  }

  document.querySelector('[data-new-product]').addEventListener('click', function () {
    openModal(null);
  });

  iconSelect.addEventListener('change', updateIconPreview);
  fieldType.addEventListener('change', updateTypeUI);

  listEl.addEventListener('click', function (event) {
    var editId = event.target.getAttribute('data-edit-product');
    var deleteId = event.target.getAttribute('data-delete-product-row');

    if (editId) {
      ProductsStore.getById(editId).then(openModal).catch(function (err) {
        AdminAuth.handleError(err, 'Impossibile aprire il prodotto.');
      });
    } else if (deleteId) {
      ProductsStore.getById(deleteId).then(function (product) {
        if (!product) return;
        if (window.confirm('Eliminare definitivamente "' + product.name + '"? Questa azione non si può annullare.')) {
          return ProductsStore.remove(deleteId).then(renderList).then(function () {
            AdminToast.show('Prodotto eliminato.');
          });
        }
      }).catch(function (err) {
        AdminAuth.handleError(err, 'Impossibile eliminare il prodotto.');
      });
    }
  });

  document.querySelectorAll('[data-close-product-modal]').forEach(function (btn) {
    btn.addEventListener('click', closeModal);
  });

  overlay.addEventListener('click', function (event) {
    if (event.target === overlay) closeModal();
  });

  deleteBtn.addEventListener('click', function () {
    ProductsStore.getById(fieldId.value).then(function (product) {
      if (!product) return;
      if (window.confirm('Eliminare definitivamente "' + product.name + '"? Questa azione non si può annullare.')) {
        return ProductsStore.remove(fieldId.value).then(function () {
          closeModal();
          return renderList();
        }).then(function () {
          AdminToast.show('Prodotto eliminato.');
        });
      }
    }).catch(function (err) {
      AdminAuth.handleError(err, 'Impossibile eliminare il prodotto.');
    });
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;

    var isLink = fieldType.value === 'link';
    var product = {
      id: fieldId.value || null,
      name: fieldName.value.trim(),
      type: isLink ? 'link' : 'product',
      icon: iconSelect.value,
      description: fieldDescription.value.trim(),
    };
    if (isLink) {
      product.url = fieldUrl.value.trim();
    } else {
      product.price = Number(fieldPrice.value);
    }

    var submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    ProductsStore.save(product).then(function () {
      closeModal();
      return renderList();
    }).then(function () {
      AdminToast.show('Prodotto salvato.');
    }).catch(function (err) {
      AdminAuth.handleError(err, 'Impossibile salvare il prodotto. Riprova.');
    }).finally(function () {
      submitBtn.disabled = false;
    });
  });

  renderList();
});
