"use strict";
// ---------- Detail Modal ----------
var currentDetailId = null;

function openDetailModal(id) {
  var o = state.orders.find(function (x) { return x.id === id; });
  if (!o) return;
  currentDetailId = id;
  var style = STATUS_STYLE[o.status] || STATUS_STYLE.deposit;
  var remain = remainingOf(o);

  var hero = o.mainImage
    ? '<img src="' + o.mainImage.replace(/"/g, "&quot;") + '" alt="' + escapeHtml(o.productName) + '">'
    : placeholderSvg();

  var proofsHtml = "";
  if (o.proofImages && o.proofImages.length) {
    var proofAlt = t("proofImageAlt");
    proofsHtml = '<div class="detail-proofs"><div class="lbl">' + t("detailProofImages") + '</div><div class="proof-thumbs">' +
      o.proofImages.map(function (src) {
        return '<img src="' + src.replace(/"/g, "&quot;") + '" alt="' + proofAlt + '" data-full="' + src.replace(/"/g, "&quot;") + '">';
      }).join("") + "</div></div>";
  }

  var trackingHtml;
  if (o.trackingNumber) {
    var courierKey = (o.courier && COURIER_INFO[o.courier]) ? o.courier : "other";
    var courierName = t(COURIER_INFO[courierKey].nameKey);
    var trackUrl = COURIER_INFO[courierKey].urlFn(o.trackingNumber, state.lang);
    var trackHost = trackUrl.replace(/^https?:\/\//, "").split(/[\/?#]/)[0];
    trackingHtml =
      '<div class="detail-tracking">' +
        '<div class="k">' + t("labelTrackingNumber") + '</div>' +
        '<div class="v">' + escapeHtml(o.trackingNumber) + ' <span class="track-courier">(' + escapeHtml(courierName) + ')</span></div>' +
        '<a class="btn-track" id="btnTrackLink" href="' + trackUrl + '" target="_blank" rel="noopener"' + (COURIER_INFO[courierKey].copy ? ' data-copy="1"' : "") + ">" + t("trackPackageBtn") + "</a>" +
        '<div class="track-dest">' + t("trackOpensAt") + " <b>" + escapeHtml(trackHost) + "</b>" +
          (COURIER_INFO[courierKey].aggregator ? "<br>" + t("trackAggregatorNote") : "") + "</div>" +
      "</div>";
  } else {
    var courierOptionsHtml = ["other", "thailandpost", "kerry", "flash", "jt", "ninjavan", "dhl"].map(function (key) {
      return '<option value="' + key + '"' + (key === "other" ? " selected" : "") + '>' + t(COURIER_INFO[key].nameKey) + "</option>";
    }).join("");
    trackingHtml =
      '<div class="detail-tracking">' +
        '<div class="k">' + t("labelTrackingNumber") + '</div>' +
        '<div class="tracking-input-row">' +
          '<select id="detailCourierInput">' + courierOptionsHtml + '</select>' +
          '<input type="text" id="detailTrackingInput" placeholder="' + t("placeholderTrackingNumber") + '">' +
          '<button type="button" class="btn-track" id="btnSaveTracking">' + t("saveBtn") + '</button>' +
        "</div>" +
      "</div>";
  }

  var full = Number(o.fullPrice) || 0, cancelled = o.status === "cancelled";
  var paid = o.status === "wishlist" ? 0 : (o.status === "deposit" ? (Number(o.depositPaid) || 0) : (cancelled ? orderPaidTotal(o) : full));
  var pct = full > 0 ? Math.max(0, Math.min(100, Math.round(paid / full * 100))) : 0;
  var cur = ORD_STEP_OF[o.status], steps = "";
  if (!cancelled) {
    for (var i = 0; i < 5; i++) {
      var cls = i < cur ? "done" : (i === cur ? "now" : "");
      steps += '<div class="stp ' + cls + '"><i>' + (i < cur ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg>' : (i + 1)) + "</i><span>" + t("ordStep" + (i + 1)) + "</span></div>" +
        (i < 4 ? '<em class="' + (i < cur ? "done" : "") + '"></em>' : "");
    }
  }
  var body =
    '<div class="od-hero' + (o.mainImage ? " has-img" : "") + '"' + (o.mainImage ? ' data-full="' + o.mainImage.replace(/"/g, "&quot;") + '"' : "") + ">" + hero + "</div>" +
    '<div class="op-head od-head"><div class="op-tt"><div class="op-name">' + nameHtml(o) + '</div><div class="op-sub">' + escapeHtml(o.shopName || t("noShop")) +
      (o.shopLink ? ' · <a href="' + escapeHtml(o.shopLink) + '" target="_blank" rel="noopener">' + t("openShopLink") + "</a>" : "") + "</div>" + statusSelectHtml(o) + "</div></div>" +
    (cancelled ? "" : '<div class="op-k">' + t("ordSideProgress") + '</div><div class="op-steps">' + steps + "</div>") +
    '<div class="op-nums"><div><div class="op-k">' + t("ordSideTotal") + '</div><div class="op-v">' + priceHtml(o) + '</div></div><div><div class="op-k">' + t("ordSidePaid") + '</div><div class="op-v pos">฿' + money(paid) +
      '</div></div><div><div class="op-k">' + t("ordSideDue") + '</div><div class="op-v' + (remain > 0 ? " neg" : "") + '">' + (remain > 0 ? "฿" + money(remain) : "\u2014") + "</div></div></div>" +
    '<div class="pbar op-bar"><i style="width:' + pct + '%"></i></div>' +
    '<div class="detail-grid">' +
      '<div class="detail-item"><div class="k">' + t("detailPurchaseDate") + '</div><div class="v">' + formatDateLong(o.purchaseDate) + "</div></div>" +
      (o.dueDate && remain > 0 ? '<div class="detail-item"><div class="k">' + t("detailDueDate") + '</div><div class="v">' + formatDateLong(o.dueDate) + "</div></div>" : "") +
      (!o.depositPaid && o.status === "wishlist" ? '<div class="detail-item"><div class="k">' + t("detailDepositLabel") + '</div><div class="v">' + t("detailNoDeposit") + "</div></div>" : "") +
    "</div>" +
    trackingHtml +
    (o.notes ? '<div class="detail-notes">' + escapeHtml(o.notes) + "</div>" : "") +
    proofsHtml;

  document.getElementById("detailBody").innerHTML = body;
  if (typeof finBindDetail === "function") finBindDetail(o);
  var dsel = document.querySelector("#detailBody .status-select");
  if (dsel) {
    dsel.addEventListener("change", function () { updateOrderStatus(id, dsel.value); if (state.orders.some(function (x) { return x.id === id; })) openDetailModal(id); });
  }
  var heroEl = document.querySelector("#detailBody .od-hero.has-img");
  if (heroEl) heroEl.addEventListener("click", function () { openLightbox(heroEl.getAttribute("data-full")); });
  var oldPay = document.getElementById("btnPaidFromDetail"); if (oldPay) oldPay.remove();
  if (o.status === "deposit" || o.status === "wishlist") {
    var pb = document.createElement("button");
    pb.type = "button"; pb.className = "btn-primary"; pb.id = "btnPaidFromDetail"; pb.style.marginLeft = "0"; pb.textContent = t("ordSideMarkPaid");
    pb.addEventListener("click", function () { updateOrderStatus(id, "full"); openDetailModal(id); });
    var fr = document.querySelector("#detailModalOverlay .footer-right"); fr.insertBefore(pb, fr.firstChild);
  }
  var trackLink = document.getElementById("btnTrackLink");
  if (trackLink && trackLink.getAttribute("data-copy")) {
    trackLink.addEventListener("click", function () {
      var code = o.trackingNumber || "";
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(function () { showToast(t("toastTrackCopied")); }, function () {});
        }
      } catch (err) { /* clipboard unavailable: the link still opens */ }
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll(".proof-thumbs img"), function (img) {
    img.addEventListener("click", function () { openLightbox(img.getAttribute("data-full")); });
  });

  var saveTrackingBtn = document.getElementById("btnSaveTracking");
  if (saveTrackingBtn) {
    var doSaveTracking = function () {
      var trackingVal = document.getElementById("detailTrackingInput").value.trim();
      if (!trackingVal) return;
      var courierVal = document.getElementById("detailCourierInput").value;
      var ord = state.orders.find(function (x) { return x.id === id; });
      if (!ord) return;
      ord.courier = courierVal;
      ord.trackingNumber = trackingVal;
      if (saveData()) {
        showToast(t("toastTrackingSaved"));
        openDetailModal(id);
      }
    };
    saveTrackingBtn.addEventListener("click", doSaveTracking);
    document.getElementById("detailTrackingInput").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); doSaveTracking(); }
    });
  }

  document.getElementById("detailModalOverlay").classList.add("open");
}

function closeDetailModal() {
  document.getElementById("detailModalOverlay").classList.remove("open");
  currentDetailId = null;
}

function openLightbox(src) {
  var img = document.getElementById("lightboxImg");
  img.src = src;
  img.alt = t("lightboxAlt");
  document.getElementById("lightbox").classList.add("open");
}
function closeLightbox() {
  document.getElementById("lightbox").classList.remove("open");
  document.getElementById("lightboxImg").src = "";
}
