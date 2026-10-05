let stores = [];

async function loadStores() {
  const response = await fetch("data/stores.json");
  stores = await response.json();
}

function calcStore(store, settings) {
  const plan = store.samplePlan;
  let extra = 0;
  const extras = [];

  if (settings.potato) {
    if (store.options.potato.type === "all_you_can_eat") {
      extras.push("ポテト食べ放題");
    } else {
      const servings = Math.ceil(settings.partySize / (store.options.potato.serves || 1));
      extra += store.options.potato.price * servings;
      extras.push(`ポテト ${servings}人前`);
    }
  }

  if (settings.alcohol && store.options.alcohol.available) {
    extra += store.options.alcohol.price * settings.partySize;
    extras.push("アルコール飲み放題");
  }

  const roomPrice = plan.pricePerPersonPerHour * settings.duration * settings.partySize;
  const total = roomPrice + extra;

  // 現段階ではルートAPI未接続なので、サンプルの移動時間を使用。
  const travel = settings.transport === "car"
    ? store.travel.carMinutes
    : settings.transport === "walk"
      ? store.travel.walkMinutes
      : store.travel.transitMinutes;

  const totalElapsedHours = settings.duration + travel / 60;
  const yenPerHour = total / totalElapsedHours;

  return { ...store, total, travel, yenPerHour, extras };
}

function makeComment(a, b) {
  const comments = [];
  if (a.travel + 5 < b.travel) comments.push(`${a.name}は移動時間が短めです。`);
  if (a.travel > b.travel + 5) comments.push(`${b.name}の方が移動時間は短めです。`);

  if (a.options.potato.type === "all_you_can_eat" &&
      b.options.potato.type !== "all_you_can_eat") {
    comments.push(`${a.name}ではポテト食べ放題があります。`);
  }

  return comments.join(" ");
}

function render(results) {
  const root = document.querySelector("#results");
  document.querySelector("#resultCount").textContent = `${results.length}店舗`;

  root.innerHTML = results.map((r, i) => {
    const previous = results[i - 1];
    const comment = previous ? makeComment(r, previous) : "";

    return `
      <article class="card">
        <div>
          <div class="rank">#${i + 1}</div>
          <h3 class="store-name">${r.name}</h3>
          <div class="metrics">
            <span class="tag">🚶 ${r.travel}分</span>
            <span class="tag">🎤 ${document.querySelector("#duration").value}時間</span>
            ${r.extras.map(x => `<span class="tag">${x}</span>`).join("")}
          </div>
        </div>
        <div class="price">
          <strong>${Math.round(r.yenPerHour)}円/h</strong>
          <span>合計 ${Math.round(r.total).toLocaleString()}円</span>
        </div>
        ${comment ? `<div class="comment">💡 ${comment}</div>` : ""}
      </article>
    `;
  }).join("");
}

document.querySelector("#compare").addEventListener("click", () => {
  const settings = {
    partySize: Math.max(1, Number(document.querySelector("#partySize").value)),
    duration: Number(document.querySelector("#duration").value),
    transport: document.querySelector("#transport").value,
    potato: document.querySelector("#potato").checked,
    alcohol: document.querySelector("#alcohol").checked
  };

  const results = stores
    .map(store => calcStore(store, settings))
    .sort((a, b) => a.yenPerHour - b.yenPerHour);

  render(results);
});

loadStores();
