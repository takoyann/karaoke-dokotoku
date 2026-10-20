"use strict";

const DATA_URL = "./data/stores.json";

const app = {
  stores: []
};

const $ = selector => document.querySelector(selector);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function normalize(value) {
  return String(value ?? "").normalize("NFKC").toLowerCase().trim();
}

function getStations(store) {
  if (!Array.isArray(store.stations)) return [];

  return store.stations.map(station =>
    typeof station === "string" ? station : station.name ?? ""
  ).filter(Boolean);
}

function getPricing(store) {
  return Array.isArray(store.pricing) ? store.pricing : [];
}

function getConditions() {
  return {
    people: Number($("#people")?.value || 1),
    hours: Number($("#hours")?.value || 1),
    dayType: $("#day-type")?.value || "weekday",
    timeType: $("#time-type")?.value || "daytime",
    plan: $("#plan")?.value || "normal"
  };
}

/*
 * 料金データの形式
 *
 * {
 *   "dayType": "weekday",
 *   "timeType": "daytime",
 *   "plan": "normal",
 *   "unit": "30min",
 *   "price": 150,
 *   "minimumPeople": 1,
 *   "mandatoryFee": 0
 * }
 *
 * unit:
 *   "30min" = 30分ごとの1人あたり料金
 *   "hour"  = 1時間ごとの1人あたり料金
 *   "flat"  = 1人あたりの固定料金
 *
 * ※店舗の実際の料金表を確認してから登録すること。
 */

function calculatePrice(store, conditions) {
  const pricing = getPricing(store);

  const candidates = pricing.filter(item =>
    item.dayType === conditions.dayType &&
    item.timeType === conditions.timeType &&
    item.plan === conditions.plan &&
    Number.isFinite(Number(item.price)) &&
    Number(item.price) >= 0 &&
    Number(item.minimumPeople ?? 1) <= conditions.people
  );

  if (!candidates.length) return null;

  const estimates = candidates.map(item => {
    const price = Number(item.price);
    const fee = Number(item.mandatoryFee ?? 0);
    const minimumCharge = Number(item.minimumCharge ?? 0);

    let total;

    switch (item.unit) {
      case "30min":
        total = price * conditions.hours * 2 * conditions.people;
        break;

      case "hour":
        total = price * conditions.hours * conditions.people;
        break;

      case "flat":
        total = price * conditions.people;
        break;

      default:
        return null;
    }

    total = Math.max(total, minimumCharge);
    total += fee * conditions.people;

    return {
      total: Math.ceil(total),
      pricing: item
    };
  }).filter(Boolean);

  if (!estimates.length) return null;

  estimates.sort((a, b) => a.total - b.total);

  return estimates[0];
}

function storeMatches(store) {
  const query = normalize($("#search")?.value || "");
  const prefecture = $("#prefecture")?.value || "";
  const city = $("#city")?.value || "";

  const text = [
    store.chain,
    store.storeName,
    store.prefecture,
    store.city,
    store.address,
    ...getStations(store)
  ].join(" ");

  return (
    (!query || normalize(text).includes(query)) &&
    (!prefecture || store.prefecture === prefecture) &&
    (!city || store.city === city)
  );
}

function renderStore(store, conditions) {
  const result = calculatePrice(store, conditions);

  const priceHTML = result
    ? `
      <div class="store-price">
        <span>条件に基づく料金目安</span>
        <strong>${result.total.toLocaleString("ja-JP")}円</strong>
        <small>${conditions.people}名・${conditions.hours}時間</small>
      </div>
    `
    : `
      <div class="store-price">
        <span>料金未確認</span>
        <p>指定条件に対応する料金データがありません。</p>
      </div>
    `;

  return {
    price: result?.total ?? Infinity,
    html: `
      <article class="store-card">
        <div class="store-card-header">
          <span class="store-chain">${escapeHTML(store.chain || "チェーン未登録")}</span>
          <span class="store-status">${result ? "料金比較可能" : "料金未確認"}</span>
        </div>

        <h3>${escapeHTML(store.storeName || "店舗名未登録")}</h3>

        <p class="store-location">
          ${escapeHTML(store.prefecture || "")}
          ${escapeHTML(store.city || "")}
          ${escapeHTML(store.address || "")}
        </p>

        ${
          getStations(store).length
            ? `<p class="store-stations">最寄り駅：${getStations(store).map(escapeHTML).join("・")}</p>`
            : ""
        }

        ${priceHTML}

        ${
          store.officialUrl
            ? `<a href="${escapeHTML(store.officialUrl)}" target="_blank" rel="noopener noreferrer">公式サイトを見る ↗</a>`
            : ""
        }

        ${
          store.verifiedAt
            ? `<p class="store-verified">料金確認日：${escapeHTML(store.verifiedAt)}</p>`
            : ""
        }
      </article>
    `
  };
}

function populateSelect(selector, values, firstLabel) {
  const select = $(selector);
  if (!select) return;

  const previous = select.value;

  select.innerHTML =
    `<option value="">${escapeHTML(firstLabel)}</option>` +
    values.map(value =>
      `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`
    ).join("");

  if (values.includes(previous)) select.value = previous;
}

function populateLocations() {
  const prefectures = [
    ...new Set(app.stores.map(store => store.prefecture).filter(Boolean))
  ].sort((a, b) => a.localeCompare(b, "ja"));

  populateSelect("#prefecture", prefectures, "すべての都道府県");
  populateCities();
}

function populateCities() {
  const prefecture = $("#prefecture")?.value || "";

  const cities = [
    ...new Set(
      app.stores
        .filter(store => !prefecture || store.prefecture === prefecture)
        .map(store => store.city)
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b, "ja"));

  populateSelect("#city", cities, "すべての市区町村");
}

function renderStores() {
  const container = $("#store-list");
  if (!container) return;

  const conditions = getConditions();

  const results = app.stores
    .filter(storeMatches)
    .map(store => renderStore(store, conditions))
    .sort((a, b) => a.price - b.price);

  const count = $("#result-count");
  if (count) count.textContent = `${results.length}店舗`;

  if (!results.length) {
    container.innerHTML = `
      <p class="empty-message">条件に一致する店舗はありません。</p>
    `;
    return;
  }

  container.innerHTML = results.map(result => result.html).join("");
}

async function loadStores() {
  const container = $("#store-list");

  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`店舗データの読み込みに失敗しました: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.stores)) {
      throw new Error("stores.jsonの形式が正しくありません。");
    }

    app.stores = data.stores;
    populateLocations();
    renderStores();
  } catch (error) {
    console.error(error);

    if (container) {
      container.innerHTML = `
        <p class="error-message">
          店舗情報を読み込めませんでした。時間をおいて再読み込みしてください。
        </p>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  [
    "#search",
    "#prefecture",
    "#city",
    "#people",
    "#hours",
    "#day-type",
    "#time-type",
    "#plan"
  ].forEach(selector => {
    $(selector)?.addEventListener("input", () => {
      if (selector === "#prefecture") populateCities();
      renderStores();
    });

    $(selector)?.addEventListener("change", () => {
      if (selector === "#prefecture") populateCities();
      renderStores();
    });
  });

  loadStores();
});
