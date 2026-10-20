"use strict";

const DATA_URL = "./data/stores.json";

const app = {
  stores: [],
  error: null
};

function getElement(...selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) return element;
  }
  return null;
}

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
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .trim();
}

function getStations(store) {
  return Array.isArray(store.stations)
    ? store.stations.map(station =>
        typeof station === "string"
          ? station
          : station.name ?? ""
      ).filter(Boolean)
    : [];
}

function matchesSearch(store, query) {
  if (!query) return true;

  const searchable = [
    store.chain,
    store.storeName,
    store.prefecture,
    store.city,
    store.address,
    ...getStations(store)
  ].join(" ");

  return normalize(searchable).includes(normalize(query));
}

function getPricingStatus(store) {
  if (!Array.isArray(store.pricing) || store.pricing.length === 0) {
    return "料金未登録";
  }

  return "料金データあり";
}

function renderStore(store) {
  const stations = getStations(store);

  return `
    <article class="store-card">
      <div class="store-card-header">
        <span class="store-chain">${escapeHTML(store.chain || "チェーン未登録")}</span>
        <span class="store-status">${escapeHTML(getPricingStatus(store))}</span>
      </div>

      <h3>${escapeHTML(store.storeName || "店舗名未登録")}</h3>

      <p class="store-location">
        ${escapeHTML(store.prefecture || "")}
        ${escapeHTML(store.city || "")}
        ${escapeHTML(store.address || "")}
      </p>

      ${
        stations.length
          ? `<p class="store-stations">最寄り駅：${stations.map(escapeHTML).join("・")}</p>`
          : ""
      }

      <div class="store-price">
        ${
          Array.isArray(store.pricing) && store.pricing.length
            ? "料金データを確認できます"
            : "料金情報はまだ登録されていません"
        }
      </div>

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
  `;
}

function renderStores() {
  const container = getElement(
    "#store-list",
    "#stores",
    ".store-list",
    "[data-store-list]"
  );

  if (!container) {
    console.error(
      "店舗表示欄が見つかりません。index.htmlの構造を確認してください。"
    );
    return;
  }

  const query = getElement(
    "#search",
    "#search-input",
    "#store-search",
    "[data-store-search]"
  )?.value ?? "";

  const prefecture = getElement("#prefecture")?.value ?? "";
  const city = getElement("#city")?.value ?? "";

  const results = app.stores.filter(store => {
    const matchesPrefecture =
      !prefecture || store.prefecture === prefecture;

    const matchesCity =
      !city || store.city === city;

    return (
      matchesPrefecture &&
      matchesCity &&
      matchesSearch(store, query)
    );
  });

  container.innerHTML = results.length
    ? results.map(renderStore).join("")
    : `<p class="empty-message">条件に一致する店舗はありません。</p>`;

  const count = getElement(
    "#result-count",
    "#store-count",
    "[data-result-count]"
  );

  if (count) {
    count.textContent = `${results.length}店舗`;
  }
}

function populatePrefectures() {
  const select = getElement("#prefecture");
  if (!select) return;

  const currentValue = select.value;

  const prefectures = [
    ...new Set(
      app.stores
        .map(store => store.prefecture)
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b, "ja"));

  select.innerHTML =
    `<option value="">すべての都道府県</option>` +
    prefectures.map(prefecture =>
      `<option value="${escapeHTML(prefecture)}">${escapeHTML(prefecture)}</option>`
    ).join("");

  if (prefectures.includes(currentValue)) {
    select.value = currentValue;
  }
}

function populateCities() {
  const select = getElement("#city");
  if (!select) return;

  const prefecture = getElement("#prefecture")?.value ?? "";

  const cities = [
    ...new Set(
      app.stores
        .filter(store =>
          !prefecture || store.prefecture === prefecture
        )
        .map(store => store.city)
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b, "ja"));

  const currentValue = select.value;

  select.innerHTML =
    `<option value="">すべての市区町村</option>` +
    cities.map(city =>
      `<option value="${escapeHTML(city)}">${escapeHTML(city)}</option>`
    ).join("");

  if (cities.includes(currentValue)) {
    select.value = currentValue;
  }
}

async function loadStores() {
  const container = getElement(
    "#store-list",
    "#stores",
    ".store-list",
    "[data-store-list]"
  );

  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`店舗データの読み込みに失敗しました (${response.status})`);
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.stores)) {
      throw new Error("stores.jsonの形式が正しくありません");
    }

    app.stores = data.stores;

    populatePrefectures();
    populateCities();
    renderStores();

    console.log(`${app.stores.length}店舗を読み込みました`);
  } catch (error) {
    console.error(error);

    if (container) {
      container.innerHTML = `
        <p class="error-message">
          店舗データを読み込めませんでした。時間をおいて再読み込みしてください。
        </p>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const search = getElement(
    "#search",
    "#search-input",
    "#store-search",
    "[data-store-search]"
  );

  const prefecture = getElement("#prefecture");
  const city = getElement("#city");

  search?.addEventListener("input", renderStores);

  prefecture?.addEventListener("change", () => {
    populateCities();
    renderStores();
  });

  city?.addEventListener("change", renderStores);

  loadStores();
});
