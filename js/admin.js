document.addEventListener('DOMContentLoaded', function () {
  if (typeof ArticlesStore === 'undefined') {
    return;
  }

  var KNOWN_IMAGES = ['img/news-schiena.jpg', 'img/news-piedi.jpg', 'img/news-studio.jpg'];

  var listEl = document.querySelector('[data-admin-list]');
  var emptyEl = document.querySelector('[data-admin-empty]');
  var overlay = document.querySelector('[data-admin-overlay]');
  var form = document.querySelector('[data-article-form]');
  var modalTitle = document.querySelector('[data-modal-title]');
  var deleteBtn = document.querySelector('[data-delete-article]');
  var tagSuggestions = document.querySelector('[data-tag-suggestions]');

  var fieldId = form.querySelector('[data-field="id"]');
  var fieldTitle = form.querySelector('[data-field="title"]');
  var fieldTag = form.querySelector('[data-field="tag"]');
  var fieldDate = form.querySelector('[data-field="dateISO"]');
  var fieldExcerpt = form.querySelector('[data-field="excerpt"]');
  var fieldBody = form.querySelector('[data-field="body"]');

  var imageSelect = form.querySelector('[data-image-select]');
  var imageUpload = form.querySelector('[data-image-upload]');
  var imagePreview = form.querySelector('[data-image-preview]');

  var currentImage = '';

  function renderList() {
    return ArticlesStore.getAll().then(function (articles) {
      listEl.innerHTML = '';
      emptyEl.hidden = articles.length !== 0;

      var tags = [];
      articles.forEach(function (item) {
        if (tags.indexOf(item.tag) === -1) tags.push(item.tag);
      });
      tagSuggestions.innerHTML = tags.map(function (t) {
        return '<option value="' + t + '"></option>';
      }).join('');

      articles.forEach(function (item) {
        var row = document.createElement('div');
        row.className = 'admin-row';
        row.innerHTML =
          '<img src="' + item.image + '" alt="" class="admin-row__thumb">' +
          '<div class="admin-row__body">' +
          '<span class="admin-row__tag">' + item.tag + '</span>' +
          '<h3>' + item.title + '</h3>' +
          '<span class="admin-row__date">' + ArticlesStore.formatDate(item.dateISO) + '</span>' +
          '</div>' +
          '<div class="admin-row__actions">' +
          '<button type="button" class="btn-link" data-edit="' + item.id + '">Modifica</button>' +
          '<button type="button" class="btn-link btn-link--danger" data-delete="' + item.id + '">Elimina</button>' +
          '</div>';
        listEl.appendChild(row);
      });
    }).catch(function (err) {
      AdminAuth.handleError(err, 'Impossibile caricare gli articoli al momento.');
    });
  }

  function setImagePreview(src) {
    currentImage = src;
    imagePreview.src = src;
  }

  function openModal(article) {
    form.reset();
    deleteBtn.hidden = !article;
    modalTitle.textContent = article ? 'Modifica articolo' : 'Nuovo articolo';

    fieldId.value = article ? article.id : '';
    fieldTitle.value = article ? article.title : '';
    fieldTag.value = article ? article.tag : '';
    fieldDate.value = article ? article.dateISO : '';
    fieldExcerpt.value = article ? article.excerpt : '';
    fieldBody.value = article && article.body ? article.body.join('\n\n') : '';

    setImagePreview(article ? article.image : KNOWN_IMAGES[0]);
    imageSelect.value = KNOWN_IMAGES.indexOf(currentImage) !== -1 ? currentImage : '__upload__';

    overlay.hidden = false;
    document.body.classList.add('admin-modal-open');
    fieldTitle.focus();
  }

  function closeModal() {
    overlay.hidden = true;
    document.body.classList.remove('admin-modal-open');
  }

  document.querySelector('[data-new-article]').addEventListener('click', function () {
    openModal(null);
  });

  listEl.addEventListener('click', function (event) {
    var editId = event.target.getAttribute('data-edit');
    var deleteId = event.target.getAttribute('data-delete');

    if (editId) {
      ArticlesStore.getById(editId).then(openModal).catch(function (err) {
        AdminAuth.handleError(err, 'Impossibile aprire l\'articolo.');
      });
    } else if (deleteId) {
      ArticlesStore.getById(deleteId).then(function (article) {
        if (!article) return;
        if (window.confirm('Eliminare definitivamente l\'articolo "' + article.title + '"? Questa azione non si può annullare.')) {
          return ArticlesStore.remove(deleteId).then(function () {
            return renderList();
          }).then(function () {
            AdminToast.show('Articolo eliminato.');
          });
        }
      }).catch(function (err) {
        AdminAuth.handleError(err, 'Impossibile eliminare l\'articolo.');
      });
    }
  });

  document.querySelectorAll('[data-close-modal]').forEach(function (btn) {
    btn.addEventListener('click', closeModal);
  });

  overlay.addEventListener('click', function (event) {
    if (event.target === overlay) closeModal();
  });

  imageSelect.addEventListener('change', function () {
    if (imageSelect.value === '__upload__') {
      imageUpload.click();
    } else {
      setImagePreview(imageSelect.value);
    }
  });

  imageUpload.addEventListener('change', function () {
    var file = imageUpload.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  });

  deleteBtn.addEventListener('click', function () {
    ArticlesStore.getById(fieldId.value).then(function (article) {
      if (!article) return;
      if (window.confirm('Eliminare definitivamente l\'articolo "' + article.title + '"? Questa azione non si può annullare.')) {
        return ArticlesStore.remove(fieldId.value).then(function () {
          closeModal();
          return renderList();
        }).then(function () {
          AdminToast.show('Articolo eliminato.');
        });
      }
    }).catch(function (err) {
      AdminAuth.handleError(err, 'Impossibile eliminare l\'articolo.');
    });
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;

    var body = fieldBody.value
      .split(/\n\s*\n/)
      .map(function (p) { return p.trim(); })
      .filter(Boolean);

    var article = {
      id: fieldId.value ? Number(fieldId.value) : null,
      title: fieldTitle.value.trim(),
      tag: fieldTag.value.trim(),
      dateISO: fieldDate.value,
      image: currentImage,
      excerpt: fieldExcerpt.value.trim(),
      body: body,
    };

    var submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    ArticlesStore.save(article).then(function () {
      closeModal();
      return renderList();
    }).then(function () {
      AdminToast.show('Articolo salvato.');
    }).catch(function (err) {
      AdminAuth.handleError(err, 'Impossibile salvare l\'articolo. Riprova.');
    }).finally(function () {
      submitBtn.disabled = false;
    });
  });

  document.querySelector('[data-export]').addEventListener('click', function () {
    ArticlesStore.exportJSON().then(function (json) {
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'articoli-backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }).catch(function (err) {
      AdminAuth.handleError(err, 'Impossibile esportare il backup.');
    });
  });

  document.querySelector('[data-import]').addEventListener('change', function (event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      ArticlesStore.importJSON(reader.result).then(function () {
        return renderList();
      }).then(function () {
        AdminToast.show('Backup importato.');
      }).catch(function (err) {
        if (AdminAuth.isUnauthorized(err)) {
          AdminAuth.handleError(err);
          return;
        }
        window.alert('Il file selezionato non è un backup valido.');
      });
    };
    reader.readAsText(file);
    event.target.value = '';
  });

  renderList();
});
