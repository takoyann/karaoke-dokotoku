const DATA_URL = "./data/stores.json";

const $ = (selector) => document.querySelector(selector);

let stores = [];

const durationInput = $("#duration");
const durationDisplay = $("#duration-display");
const minusButton = $("#duration-minus");
const plusButton = $("#duration-plus");

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes}分`;
  if (remainingMinutes === 0) return `${hours}時間`;

  return `${hours}時間${remainingMinutes}分`;
}

function updateDuration() {
  const min = Number(durationInput.min);
  const max = Number(durationInput.max);
  const value = Number(durationInput.value);

  durationInput.value = Math.max(min, Math.min(max, value));
  durationDisplay.textContent = formatDuration(
    Number(durationInput.value)
  );

  minusButton.disabled = Number(durationInput.value) <= min;
  plusButton.disabled = Number(durationInput.value) >= max;

  renderStores();
}

function changeDuration(amount) {
  const min = Number(durationInput.min);
  const max = Number(durationInput.max);
  const current = Number(durationInput.value);

  durationInput.value = Math.max(
    min,
    Math.min(max, current + amount)
  );

  updateDuration();
}

function getConditions() {
  return {
    people: Number($("#people")?.value || 2),
    durationMinutes: Number(durationInput.value),
    dayType: $("#day-type")?.value || "weekday",
    timeType: $("#time-type")?.value || "daytime",
    plan: $("#plan")?.value || "normal",
    search: ($("#search")?.value || "").trim().toLowerCase(),
    prefecture: $("#prefecture")?.value || "",
    city: $("#city")?.value || ""
  };
}

function calculatePrice(store, conditions) {
  if (!Array.isArray(store.pricing)) return null;

  const matchingPrices = store.pricing.filter((item) => {
    return (
      item.dayType === conditions.dayType &&
      item.timeType === conditions.timeType &&
      item.plan === conditions.plan &&
      Number(item.minimumPeople || 1) <= conditions.people &&
      Number(item.price) >= 0
    );
  });

  if (matchingPrices.length === 0) return null;

  const estimates = matchingPrices.map((item) => {
    const price = Number(item.price);
    const people = conditions.people;
    const duration = conditions.durationMinutes;
    const mandatoryFee = Number(item.mandatoryFee || 0);

    let total;

    if (item.unit === "30min" || item.unit === "hour") {
      const billingMinutes = Number(
        item.billingMinutes ||
        (item.unit === "30min" ? 30 : 60)
      );

      const minimumMinutes = Number(
        item.minimumMinutes || billingMinutes
      );

      const blocks = Math.ceil(
        Math.max(duration, minimumMinutes) / billingMinutes
      );

      total = price * blocks * people;
    } else if (item.unit === "flat") {
      total = price * people;
    } else {
      return null;
    }

    total += mandatoryFee * people;

    if (Number.isFinite(Number(item.minimumCharge))) {
      total = Math.max(total, Number(item.minimumCharge));
    }

    return { total, unit: item.unit };
  }).filter(Boolean);

  if (estimates.length === 0) return null;

  return estimates.reduce((cheapest, current) =>
    current.total < cheapest.total ? current : cheapest
  );
}

function renderStores() {
  const conditions = getConditions();
  const list = $("#store-list");
  const count = $("#result-count");

  if (!list || !count) return;

  const filteredStores = stores
    .filter((store) => {
      const searchableText = [
        store.chain,
        store.storeName,
        store.prefecture,
        store.city,
        store.address,
        ...(store.stations || [])
      ].join(" ").toLowerCase();

      return (
        (!conditions.search ||
          searchableText.includes(conditions.search)) &&
        (!conditions.prefecture ||
          store.prefecture === conditions.prefecture) &&
        (!conditions.city ||
          store.city === conditions.city)
      );
    })
    .map((store) => ({
      ...store,
      estimate: calculatePrice(store, conditions)
    }))
    .sort((a, b) => {
      if (a.estimate === null && b.estimate === null) return 0;
      if (a.estimate === null) return 1;
      if (b.estimate === null) return -1;
      return a.estimate.total - b.estimate.total;
    });

  count.textContent = `${filteredStores.length}店舗`;
    const cheapestStoreId = filteredStores.find(
    (store) => store.estimate !== null
  )?.id;

  if (filteredStores.length === 0) {
    list.innerHTML = "<p>該当する店舗がありません。</p>";
    return;
  }

  list.innerHTML = filteredStores.map((store) => {
        const isCheapest =
      store.estimate !== null &&
      store.id === cheapestStoreId;

    const cheapestBadge = isCheapest
      ? '<span class="cheapest-badge">最安値</span>'
      : "";
       const priceHtml = store.estimate
      ? `
        <div class="store-price">
          <strong>約${store.estimate.total.toLocaleString("ja-JP")}円</strong>
          <small>
            ${conditions.people}名での合計目安
          </small>
          <small>
            1人あたり約${Math.ceil(
              store.estimate.total / conditions.people
            ).toLocaleString("ja-JP")}円
          </small>
          <small>
            利用時間：${formatDuration(conditions.durationMinutes)}
          </small>
        </div>
      `
            : `
        <div class="store-price">
          <strong>料金未登録</strong>
          <small>この条件の料金はまだ比較できません。</small>
          <small>公式サイトで最新の料金をご確認ください。</small>
        </div>
      `;
    const officialLink = store.officialUrl
      ? `<a href="${escapeHtml(store.officialUrl)}"
            target="_blank" rel="noopener noreferrer">
            公式サイト
         </a>`
      : "";

    return `
      <article class="store-card">
        <div>
        　 <h3>
            ${escapeHtml(store.storeName || "店舗名未登録")}
            ${cheapestBadge}
          </h3>
          <p>${escapeHtml(store.chain || "")}</p>
          <p>
            ${escapeHtml(store.prefecture || "")}
            ${escapeHtml(store.city || "")}
            ${escapeHtml(store.address || "")}
          </p>
          ${officialLink}
        </div>
        ${priceHtml}
      </article>
    `;
  }).join("");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function populatePrefectures() {
  const select = $("#prefecture");
  if (!select) return;

  const currentValue = select.value;

  const prefectures = [
    ...new Set(
      stores.map((store) => store.prefecture).filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b, "ja"));

  select.innerHTML =
    '<option value="">すべての都道府県</option>' +
    prefectures.map((prefecture) =>
      `<option value="${escapeHtml(prefecture)}">${escapeHtml(prefecture)}</option>`
    ).join("");

  if (prefectures.includes(currentValue)) {
    select.value = currentValue;
  }
}

function populateCities() {
  const select = $("#city");
  if (!select) return;

  const selectedPrefecture = $("#prefecture")?.value || "";
  const currentValue = select.value;

  const cities = [
    ...new Set(
      stores
        .filter((store) =>
          !selectedPrefecture ||
          store.prefecture === selectedPrefecture
        )
        .map((store) => store.city)
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b, "ja"));

  select.innerHTML =
    '<option value="">すべての市区町村</option>' +
    cities.map((city) =>
      `<option value="${escapeHtml(city)}">${escapeHtml(city)}</option>`
    ).join("");

  if (cities.includes(currentValue)) {
    select.value = currentValue;
  }
}

async function initialize() {
  const list = $("#store-list");

  try {
    const response = await fetch(DATA_URL);

    if (!response.ok) {
      throw new Error("店舗データを読み込めませんでした。");
    }

    const data = await response.json();
    stores = Array.isArray(data.stores) ? data.stores : [];

    populatePrefectures();
    populateCities();
    updateDuration();
  } catch (error) {
    console.error(error);

    if (list) {
      list.innerHTML =
        "<p>店舗データを読み込めませんでした。時間をおいて再読み込みしてください。</p>";
    }
  }
}

durationInput.addEventListener("input", updateDuration);

minusButton.addEventListener("click", () => {
  changeDuration(-5);
});

plusButton.addEventListener("click", () => {
  changeDuration(5);
});

$("#search").addEventListener("input", renderStores);

$("#prefecture").addEventListener("change", () => {
  populateCities();
  renderStores();
});

$("#city").addEventListener("change", renderStores);

["#people", "#day-type", "#time-type", "#plan"].forEach(
  (selector) => {
    $(selector)?.addEventListener("change", renderStores);
  }
);

initialize();
