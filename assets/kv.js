/*
 * kv.js – gemeinsame Logik für alle Seiten des BSW-Kreisverbands Wiesbaden
 *
 * - baut das Seitenmenü (links) an EINER Stelle auf (MENU unten anpassen)
 * - lädt die Inhalte jeder Seite aus ihrer JSON-Datei
 * - wandelt Texte mit einfacher Formatierung in HTML um (Absätze, Listen,
 *   **fett**, *kursiv*, [Linktext](https://…), ### Zwischenüberschrift, > Zitat)
 *
 * Die Texte selbst werden über das CMS unter /admin/ gepflegt.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Seitenmenü – Reihenfolge hier ändern, gilt dann für alle Seiten
  // ---------------------------------------------------------------------------
  var MENU = [
    { id: 'kreisverband', label: 'Kreisverband Wiesbaden', path: '/Kreisverband_Wiesbaden/' },
    { id: 'aktuelles', label: 'Aktuelles', path: '/Aktuelles/' },
    { id: 'program', label: 'Programm', path: '/Program/' },
    { id: 'fraktion', label: 'Fraktion', path: '/Fraktion/' },
    { id: 'vorstand', label: 'Menschen', path: '/Vorstand/' },
    { id: 'termine', label: 'Termine', path: '/Termine/' },
    { id: 'social', label: 'Social Media', path: '/Social_Media/' },
    { id: 'downloads', label: 'Downloadbereich', path: '/Downloadbereich/' },
    { id: 'mitreden', label: 'Mitreden', path: '/Mitreden/' },
    { id: 'kontakt', label: 'Kontakt', path: '/Kontakt/' }
  ];

  // ---------------------------------------------------------------------------
  // Hilfsfunktionen
  // ---------------------------------------------------------------------------
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeUrl(url) {
    var u = String(url || '').trim();
    if (/^(https?:|mailto:|tel:|\/|\.\.?\/|#)/i.test(u)) return u;
    if (/^[\w.\-]+$/.test(u)) return u; // reiner Dateiname
    return '#';
  }

  // Inline-Formatierung: **fett**, *kursiv*, [Text](URL)
  function inline(text) {
    var s = esc(text);
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, url) {
      var href = safeUrl(url.replace(/&amp;/g, '&'));
      var external = /^https?:/i.test(href);
      return '<a href="' + esc(href) + '"' + (external ? ' target="_blank" rel="noopener"' : '') + '>' + label + '</a>';
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>');
    return s;
  }

  // Block-Formatierung: jede Zeile ein Absatz; "- " Liste; "### " Überschrift; "> " Zitat
  function md(text) {
    if (!text) return '';
    var lines = String(text).replace(/\r\n?/g, '\n').split('\n');
    var html = '';
    var list = null;
    function closeList() {
      if (list) { html += '<ul>' + list.join('') + '</ul>'; list = null; }
    }
    lines.forEach(function (raw) {
      var line = raw.trim();
      if (!line) { closeList(); return; }
      if (/^[-•]\s+/.test(line)) {
        list = list || [];
        list.push('<li>' + inline(line.replace(/^[-•]\s+/, '')) + '</li>');
        return;
      }
      closeList();
      if (/^###\s+/.test(line)) html += '<h3>' + inline(line.replace(/^###\s+/, '')) + '</h3>';
      else if (/^>\s?/.test(line)) html += '<blockquote class="kv-quote"><p>' + inline(line.replace(/^>\s?/, '')) + '</p></blockquote>';
      else html += '<p>' + inline(line) + '</p>';
    });
    closeList();
    return html;
  }

  function el(id) { return document.getElementById(id); }

  function setHtml(id, html) {
    var node = el(id);
    if (node) node.innerHTML = html;
  }

  function load(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' für ' + url);
      return r.json();
    });
  }

  function items(data) {
    if (Array.isArray(data)) return data; // altes Format (reine Liste)
    return (data && Array.isArray(data.eintraege)) ? data.eintraege : [];
  }

  function showError(containerId, err) {
    console.error(err);
    setHtml(containerId, '<p class="kv-error">Die Inhalte konnten gerade nicht geladen werden. Bitte laden Sie die Seite neu.</p>');
  }

  // Überschrift und Einleitung (für alle Seiten gleich)
  function header(data) {
    if (!data || Array.isArray(data)) return;
    if (data.ueberschrift && el('kv-heading')) el('kv-heading').textContent = data.ueberschrift;
    setHtml('kv-intro', md(data.einleitung));
  }

  function emptyNote(text) {
    return '<p class="kv-empty">' + esc(text) + '</p>';
  }

  // ---------------------------------------------------------------------------
  // Menü
  // ---------------------------------------------------------------------------
  function buildMenu(activeId) {
    var ul = el('kv-menu');
    if (!ul) return;
    ul.innerHTML = MENU.map(function (m) {
      return '<li' + (m.id === activeId ? ' class="active"' : '') + '><a href="' + m.path + '" class="noUnderline">' + esc(m.label) + '</a></li>';
    }).join('');
  }

  // ---------------------------------------------------------------------------
  // Renderer je Seite
  // ---------------------------------------------------------------------------
  function personCards(list) {
    return list.map(function (p) {
      var foto = p.foto ? '<img class="kv-foto" src="' + esc(safeUrl(p.foto)) + '" alt="' + esc(p.name) + '">' : '';
      return '<div class="kv-person">' + foto +
        '<h3 style="margin-bottom:0.2em;">' + esc(p.name) + '</h3>' +
        '<p style="margin-bottom:0.8em;"><b>' + esc(p.role) + '</b></p>' +
        md(p.bio) + '</div>';
    }).join('');
  }

  var RENDER = {
    start: function () {
      var kv = load('/Kreisverband_Wiesbaden/kreisverband.json').then(function (data) {
        var s = data.startseite || {};
        var html = '';
        if (s.titel) html += '<h2 class="kv-hero">' + esc(s.titel) + '</h2>';
        html += md(s.text);
        if (Array.isArray(data.leitlinien) && data.leitlinien.length) {
          html += '<div class="kv-tiles">' + data.leitlinien.map(function (l) {
            return '<div class="kv-tile"><h3>' + esc(l.titel) + '</h3>' + md(l.text) + '</div>';
          }).join('') + '</div>';
        }
        setHtml('kv-start', html);
      }).catch(function (e) { console.error(e); });

      var news = load('/Aktuelles/aktuelles.json').then(function (data) {
        var list = items(data).slice(0, 3);
        setHtml('news-container', list.length ? list.map(newsItem).join('') : emptyNote('Neue Meldungen folgen in Kürze.'));
      }).catch(function (e) { showError('news-container', e); });
      return Promise.all([kv, news]);
    },

    kreisverband: function () {
      return load('kreisverband.json').then(function (data) {
        header(data);
        var html = '';
        if (Array.isArray(data.leitlinien) && data.leitlinien.length) {
          html += '<div class="kv-tiles">' + data.leitlinien.map(function (l) {
            return '<div class="kv-tile"><h3>' + esc(l.titel) + '</h3>' + md(l.text) + '</div>';
          }).join('') + '</div>';
        }
        html += md(data.rathaus);
        setHtml('intro-container', html);
        var sp = data.spenden || {};
        setHtml('spenden-container',
          '<p><b>Kontoinhaber:</b> ' + esc(sp.kontoinhaber) + '</p>' +
          '<p><b>IBAN:</b> ' + esc(sp.iban) + '</p>' +
          '<p><b>Verwendungszweck:</b> ' + esc(sp.verwendungszweck) + '</p>' +
          (sp.hinweis ? '<p class="placeholder">' + esc(sp.hinweis) + '</p>' : ''));
      }).catch(function (e) { showError('intro-container', e); });
    },

    vorstand: function () {
      return load('vorstand.json').then(function (data) {
        header(data);
        var list = items(data);
        setHtml('vorstand-container', list.length ? personCards(list) : emptyNote('Die Vorstellung des Vorstands folgt in Kürze.'));
        setHtml('kv-outro', md(data.schlusswort));
                var m = data.menschen || {};
        setHtml('kv-menschen', (m.ueberschrift ? '<h2>' + esc(m.ueberschrift) + '</h2>' : '') + md(m.einleitung) + (m.hinweis ? emptyNote(m.hinweis) : ''));
      }).catch(function (e) { showError('vorstand-container', e); });
    },

    fraktion: function () {
      return load('fraktion.json').then(function (data) {
        header(data);
        var list = items(data);
        setHtml('fraktion-container', (list.length ? personCards(list) : '') + md(data.arbeit));
      }).catch(function (e) { showError('fraktion-container', e); });
    },

    menschen: function () {
      return load('menschen.json').then(function (data) {
        header(data);
        var list = items(data);
        setHtml('menschen-container', list.length ? personCards(list) : emptyNote('Porträts unserer Mitglieder folgen in Kürze.'));
      }).catch(function (e) { showError('menschen-container', e); });
    },

    program: function () {
      return load('program.json').then(function (data) {
        header(data);
        setHtml('program-container', items(data).map(function (t) {
          return '<div class="kv-topic"><h3>' + esc(t.title) + '</h3>' + md(t.text) +
            (t.gut_zu_sagen ? '<blockquote class="kv-quote"><p><b>Gut zu sagen:</b> ' + inline(t.gut_zu_sagen) + '</p></blockquote>' : '') +
            '</div>';
        }).join(''));
      }).catch(function (e) { showError('program-container', e); });
    },

    termine: function () {
      return load('termine.json').then(function (data) {
        header(data);
        var list = items(data);
        setHtml('termine-container', list.length ? list.map(function (t) {
          return '<div class="kv-termin"><h3>' + esc(t.titel) + '</h3>' +
            '<div class="termin-meta"><b>Wann:</b> ' + esc(t.datum) + (t.uhrzeit ? ', ' + esc(t.uhrzeit) : '') + '<br>' +
            '<b>Wo:</b> ' + esc(t.ort) + '</div>' + md(t.beschreibung) + '</div>';
        }).join('') : emptyNote('Neue Termine werden in Kürze bekanntgegeben.'));
      }).catch(function (e) { showError('termine-container', e); });
    },

    mitreden: function () {
      return load('mitreden.json').then(function (data) {
        header(data);
        var cards = items(data).map(function (m) {
          return '<div><h3>' + esc(m.title) + '</h3>' + md(m.text) +
            (m.link ? '<a href="' + esc(safeUrl(m.link)) + '" class="btn-bsw">' + esc(m.action || 'Mehr') + '</a>' : '') + '</div>';
        }).join('');
        var faq = (data.fragen || []).map(function (f) {
          return '<div class="kv-faq"><h3>' + esc(f.frage) + '</h3>' + md(f.antwort) + '</div>';
        }).join('');
        setHtml('mitreden-container', cards);
        setHtml('kv-faq', faq ? '<h2>' + esc(data.fragen_ueberschrift || 'Häufige Fragen') + '</h2>' + faq : '');
      }).catch(function (e) { showError('mitreden-container', e); });
    },

    aktuelles: function () {
      load('aktuelles.json').then(function (data) {
        header(data);
        var list = items(data);
        setHtml('aktuelles-container', list.length ? list.map(newsItem).join('') : emptyNote('Neue Meldungen folgen in Kürze.'));
      }).catch(function (e) { showError('aktuelles-container', e); });

      // Lesetipps: NachDenkSeiten (stündlich per GitHub Action aktualisiert)
      load('nachdenkseiten.json').then(function (feed) {
        var list = (feed && feed.eintraege) || [];
        if (!list.length) return;
        setHtml('kv-feed',
          '<h2>Lesetipps: ' + esc(feed.quelle || 'NachDenkSeiten') + '</h2>' +
          '<ul class="kv-feed-list">' + list.map(function (f) {
            return '<li><span class="news-date">' + esc(f.datum) + (f.autor ? ' · ' + esc(f.autor) : '') + '</span>' +
              '<a href="' + esc(safeUrl(f.link)) + '" target="_blank" rel="noopener">' + esc(f.titel) + '</a></li>';
          }).join('') + '</ul>' +
          '<p class="kv-feed-note">Externe Beiträge von <a href="' + esc(safeUrl(feed.quelle_url)) + '" target="_blank" rel="noopener">nachdenkseiten.de</a>. ' +
          'Für die Inhalte ist der jeweilige Anbieter verantwortlich; sie geben nicht zwingend die Position des BSW wieder.</p>');
      }).catch(function (e) { console.warn('Feed nicht geladen', e); });
    },

    social: function () {
      return load('social_media.json').then(function (data) {
        header(data);
        var list = items(data).filter(function (s) { return s.url && s.url !== '#'; });
        setHtml('social-container', '<div class="social-grid">' + list.map(function (s) {
          return '<a class="social-card" href="' + esc(safeUrl(s.url)) + '" target="_blank" rel="noopener">' +
            '<div class="social-platform">' + esc(s.platform) + '</div>' +
            '<div class="social-desc">' + esc(s.description) + '</div></a>';
        }).join('') + '</div>' + md(data.netiquette));
      }).catch(function (e) { showError('social-container', e); });
    },

    kontakt: function () {
      return load('kontakt.json').then(function (data) {
        header(data);
        setHtml('kontakt-container', '<div class="contact-grid">' + items(data).map(function (p) {
          var phone = p.phone ? '<div class="contact-detail"><span>📞</span> <a href="tel:' + esc(String(p.phone).replace(/\s/g, '')) + '">' + esc(p.phone) + '</a></div>' : '';
          var mail = !p.email ? '' : (/@/.test(p.email)
            ? '<div class="contact-detail"><span>✉️</span> <a href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a></div>'
            : '<div class="contact-detail"><span>✉️</span> ' + esc(p.email) + '</div>');
          return '<div class="contact-card"><div class="contact-role">' + esc(p.role) + '</div>' +
            '<h3 class="contact-name">' + esc(p.name) + '</h3>' + mail + phone + '</div>';
        }).join('') + '</div>' + md(data.hinweis));
      }).catch(function (e) { showError('kontakt-container', e); });
    },

    downloads: function () {
      return load('downloads.json').then(function (data) {
        header(data);
        var list = items(data);
        setHtml('downloads-container', list.length ? '<div class="download-list">' + list.map(function (d) {
          var meta = [d.type, d.size].filter(Boolean).map(esc).join(' • ');
          return '<div class="download-item">' + downloadThumb(d) + '<div class="download-info">' +
            '<div class="download-title">' + esc(d.title) + '</div>' +
            '<div class="download-desc">' + esc(d.description) + '</div>' +
            (meta ? '<div class="download-meta">' + meta + '</div>' : '') + '</div>' +
            '<div class="download-action"><a href="' + esc(safeUrl(d.file)) + '" target="_blank" class="btn-download" download>Herunterladen</a></div></div>';
        }).join('') + '</div>' : emptyNote('Materialien folgen in Kürze.'));
      }).catch(function (e) { showError('downloads-container', e); });
    }
  };

  // Vorschaubild für den Downloadbereich: anklickbar, öffnet die Datei in neuem Tab.
  // Reihenfolge: eigenes Vorschaubild (Feld "vorschau") > Bilddatei selbst > Symbol mit Dateityp
  function downloadThumb(d) {
    var file = safeUrl(d.file);
    var isImage = /\.(jpe?g|png|gif|webp|svg)$/i.test(file);
    var isVideo = /\.(mp4|webm|mov|m4v)$/i.test(file);
    var src = d.vorschau ? safeUrl(d.vorschau) : (isImage ? file : '');
    var label = 'Vorschau öffnen: ' + (d.title || file);
    var inner = src
      ? '<img src="' + esc(src) + '" alt="' + esc(label) + '" loading="lazy">'
      : '<span class="kv-thumb-type">' + esc((file.split('.').pop() || 'Datei').toUpperCase()) + '</span>';
    return '<a class="kv-thumb' + (isVideo ? ' kv-thumb-video' : '') + '" href="' + esc(file) + '" target="_blank" rel="noopener" title="' + esc(label) + '">' + inner + '</a>';
  }

    function newsItem(n) {
    // Optional: Link (z. B. PDF) mit kleinem Vorschaubild unter dem Text
    var flyer = '';
    if (n.link) {
      var linkText = n.link_text || 'Als PDF ansehen';
      flyer = '<a class="kv-flyer" href="' + esc(safeUrl(n.link)) + '" target="_blank" rel="noopener">' +
        (n.bild ? '<img src="' + esc(safeUrl(n.bild)) + '" alt="' + esc(linkText) + '" loading="lazy">' : '') +
        '<span>' + esc(linkText) + '</span></a>';
    }
    return '<div class="news-item"><span class="news-date">' + esc(n.datum) + '</span>' +
      '<h3 class="news-title">' + esc(n.titel) + '</h3>' + md(n.text) + flyer + '</div>';
  }

  // Darstellung des Flyer-Links (kleines Vorschaubild, in der Hausfarbe beschriftet)
  (function () {
    var s = document.createElement('style');
    s.textContent = '.kv-flyer{display:inline-flex;flex-direction:column;align-items:flex-start;gap:.5em;margin-top:.5em;text-decoration:none!important}' +
      '.kv-flyer img{width:170px;height:auto;border:1px solid #e5dbe1;border-radius:4px;box-shadow:0 2px 6px rgba(0,0,0,.12);transition:transform .2s ease,box-shadow .2s ease}' +
      '.kv-flyer:hover img{transform:translateY(-2px);box-shadow:0 4px 10px rgba(0,0,0,.2)}' +
      '.kv-flyer span{color:#661d4d;font-weight:600;font-size:.9em}' +
      '.kv-flyer:hover span{text-decoration:underline}';
    document.head.appendChild(s);
  })();


  // ---------------------------------------------------------------------------
  // Einstieg: KV.init('program') im HTML der jeweiligen Seite
  // ---------------------------------------------------------------------------
  var STYLE = '.kv-quote{border-left:4px solid #661d4d;margin:1em 0;padding:.5em 1em;background:#faf6f8}' +
    '.kv-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;margin:1.5em 0}' +
    '.kv-tile{background:#fcfcfc;border:1px solid #eee;border-top:4px solid #661d4d;border-radius:4px;padding:1.2em}' +
    '.kv-tile h3{margin-top:0;color:#661d4d}.kv-hero{color:#661d4d}' +
    '.kv-person,.kv-topic,.kv-termin,.kv-faq{margin-bottom:2rem}' +
    '.kv-foto{width:120px;height:120px;object-fit:cover;border-radius:50%;float:right;margin:0 0 1em 1em}' +
    '.kv-person:after{content:"";display:block;clear:both}' +
    '.kv-empty{color:#666;font-style:italic}.kv-error{color:#b33}' +
    '.kv-text ul{margin:0 0 1em 1.2em;list-style:disc}.kv-text li{margin-bottom:.4em;line-height:1.5}' +
    '.kv-thumb{position:relative;flex:0 0 120px;width:120px;height:160px;margin-right:20px;border-radius:4px;overflow:hidden;' +
    'background:#f3eef1;border:1px solid #e5dbe1;display:flex;align-items:center;justify-content:center;text-decoration:none!important;transition:transform .2s ease,box-shadow .2s ease}' +
    '.kv-thumb:hover{transform:translateY(-2px);box-shadow:0 4px 10px rgba(0,0,0,.15)}' +
    '.kv-thumb img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}' +
    '.kv-thumb-type{font-weight:bold;color:#661d4d;font-size:1.1em;letter-spacing:.05em}' +
    '.kv-thumb-video:after{content:"";position:absolute;top:50%;left:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;' +
    'background:rgba(102,29,77,.85) url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath fill=%27white%27 d=%27M8 5v14l11-7z%27/%3E%3C/svg%3E") center/22px no-repeat}' +
    '#kv-feed{margin-top:3em;padding-top:1.5em;border-top:1px solid #eee}' +
    '.kv-text ul.kv-feed-list{list-style:none;margin:0 0 1em 0;padding:0}' +
    '.kv-feed-list li{padding:.7em 0;border-bottom:1px solid #f0f0f0}' +
    '.kv-feed-list .news-date{margin-bottom:.2em}' +
    '.kv-feed-list a{color:#661d4d;font-weight:600;text-decoration:none}.kv-feed-list a:hover{text-decoration:underline}' +
    '.kv-feed-note{font-size:.85em;color:#777}' +
    '@media (max-width:600px){.kv-thumb{width:100%;flex-basis:auto;height:220px;margin:0 0 15px 0}}';

  function init(page) {
    var st = document.createElement('style');
    st.textContent = STYLE;
    document.head.appendChild(st);
    buildMenu(page === 'start' ? 'kreisverband' : page);
    if (RENDER[page]) RENDER[page]();
  }

  // ---------------------------------------------------------------------------
  // Downloadbereich mit Kategorien (überschreibt den Download-Renderer weiter oben)
  // Neue Struktur der JSON: { kategorien: [ { titel, eintraege: [ ... ] } ] }
  // Die alte flache Struktur { eintraege: [ ... ] } wird weiterhin dargestellt.
  // Überschriften-Design wie im Programm: BSW-Farbe, kleiner Abstand nach unten.
  // ---------------------------------------------------------------------------
  RENDER.downloads = function () {
    function itemHtml(d) {
      var meta = [d.type, d.size].filter(Boolean).map(esc).join(' • ');
      return '<div class="download-item">' + downloadThumb(d) + '<div class="download-info">' +
        '<div class="download-title">' + esc(d.title) + '</div>' +
        '<div class="download-desc">' + esc(d.description) + '</div>' +
        (meta ? '<div class="download-meta">' + meta + '</div>' : '') + '</div>' +
        '<div class="download-action"><a href="' + esc(safeUrl(d.file)) + '" target="_blank" class="btn-download" download>Herunterladen</a></div></div>';
    }
    function listHtml(list) {
      return '<div class="download-list">' + list.map(itemHtml).join('') + '</div>';
    }
    return load('downloads.json').then(function (data) {
      header(data);
      var cats = (data && Array.isArray(data.kategorien)) ? data.kategorien : [];
      var html = '';
      cats.forEach(function (c) {
        var list = items(c);
        if (!list.length) return;
        html += '<div class="kv-kategorie" style="margin-bottom:2rem;padding-bottom:1rem;">' +
          '<h3 style="color:#661d4d;margin-bottom:0.5em;">' + esc(c.titel) + '</h3>' + listHtml(list) + '</div>';
      });
      if (!html) {
        var flat = items(data);
        if (flat.length) html = listHtml(flat);
      }
      setHtml('downloads-container', html || emptyNote('Materialien folgen in Kürze.'));
    }).catch(function (e) { showError('downloads-container', e); });
  };


  window.KV = { init: init, md: md };
})();
