// Notebook pages: the finance pages are rendered into one body element (#finBody ...). On a wide screen the notebook shows them as an
// open spread, so after every render the body's children are sorted into three wrappers:
//   .nb-hl = header zone of the left page (tabs, filters)   .nb-cl = the ruled left page   .nb-r = the dotted right page.
// Wrappers stay INSIDE the body element, so every click handler that listens on the body keeps working. Phone/tablet: wrappers are display:contents.
(function () {
  var MAP = {
    finBody:     { hl: [".fin-subnav", ".fin-filters"], r: [".fin-sumcard", ".fin-more"] },
    finAccBody:  { hl: [".fin-subnav"], r: [".acc-moves"] },
    finDebtBody: { hl: [".fin-subnav", ".debt-seg"], r: [".nw-strip"] },
    finCatsBody: { hl: [".fin-subnav", ".fin-hint"], r: ["section.fin-catsec@1"] },
    finRecBody:  { hl: [".fin-subnav"], wide: true }
  };
  function pick(body, sel) {
    var at = sel.split("@"), list = body.querySelectorAll(at[0]);
    return at[1] != null ? (list[+at[1]] ? [list[+at[1]]] : []) : Array.prototype.slice.call(list);
  }
  function sort(id) {
    var body = document.getElementById(id), cfg = MAP[id];
    if (!body || !cfg || body.querySelector(":scope > .nb-cl, :scope > .nb-wide")) return;
    var hl = document.createElement("div"), main = document.createElement("div"), r = document.createElement("div");
    hl.className = "nb-hl"; main.className = cfg.wide ? "nb-wide" : "nb-cl"; r.className = "nb-r";
    var taken = [];
    function take(list, to) { list.forEach(function (sel) { pick(body, sel).forEach(function (el) { if (taken.indexOf(el) === -1 && el.parentNode) { taken.push(el); to.appendChild(el); } }); }); }
    take(cfg.hl || [], hl); take(cfg.r || [], r);
    // everything else (except wrappers) goes to the main page; leftovers like an emptied .fin-layout are dropped
    Array.prototype.slice.call(body.children).forEach(function (el) {
      if (el === hl || el === main || el === r) return;
      if (el.classList.contains("fin-layout")) { Array.prototype.slice.call(el.children).forEach(function (c) { main.appendChild(c); }); el.remove(); return; }
      main.appendChild(el);
    });
    body.appendChild(hl); body.appendChild(main); if (!cfg.wide) body.appendChild(r);
  }
  function init() {
    Object.keys(MAP).forEach(function (id) {
      var body = document.getElementById(id); if (!body) return;
      var busy = false, mo = new MutationObserver(function () { if (busy) return; busy = true; try { sort(id); } finally { busy = false; } });
      mo.observe(body, { childList: true });
      sort(id);
    });
  }
  init();
})();
