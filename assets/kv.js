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
    { id: 'vorstand', label: 'Vorstand', path: '/Vorstand/' },
    { id: 'fraktion', label: 'Fraktion', path: '/Fraktion/' },
    { id: 'menschen', label: 'Menschen', path: '/Menschen/' },
    { id: 'program', label: 'Programm', path: '/Program/' },
    { id: 'termine', label: 'Termine', path: '/Termine/' },
    { id: 'mitreden', label: 'Mitreden', path: '/Mitreden/' },
    { id: 'aktuelles', label: 'Aktuelles', path: '/Aktuelles/' },
    { id: 'social', label: 'Social Media', path: '/Social_Media/' },
    { id: 'kontakt', label: 'Kontakt', path: '/Kontakt/' },
    { id: 'downloads', label: 'Downloadbereich', path: '/Downloadbereich/' }
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
      return load('aktuelles.json').then(function (data) {
        header(data);
        var list = items(data);
        setHtml('aktuelles-container', list.length ? list.map(newsItem).join('') : emptyNote('Neue Meldungen folgen in Kürze.'));
      }).catch(function (e) { showError('aktuelles-container', e); });
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
          return '<div class="download-item"><div class="download-info">' +
            '<div class="download-title">' + esc(d.title) + '</div>' +
            '<div class="download-desc">' + esc(d.description) + '</div>' +
            (meta ? '<div class="download-meta">' + meta + '</div>' : '') + '</div>' +
            '<div class="download-action"><a href="' + esc(safeUrl(d.file)) + '" target="_blank" class="btn-download" download>Herunterladen</a></div></div>';
        }).join('') + '</div>' : emptyNote('Materialien folgen in Kürze.'));
      }).catch(function (e) { showError('downloads-container', e); });
    }
  };

  function newsItem(n) {
    return '<div class="news-item"><span class="news-date">' + esc(n.datum) + '</span>' +
      '<h3 class="news-title">' + esc(n.titel) + '</h3>' + md(n.text) + '</div>';
  }

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
    '.kv-text ul{margin:0 0 1em 1.2em;list-style:disc}.kv-text li{margin-bottom:.4em;line-height:1.5}';

  function init(page) {
    var st = document.createElement('style');
    st.textContent = STYLE;
    document.head.appendChild(st);
    buildMenu(page === 'start' ? 'kreisverband' : page);
    if (RENDER[page]) RENDER[page]();
  }

  window.KV = { init: init, md: md };
})();
