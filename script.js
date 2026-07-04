const BUSINESS_CONFIG = {
  logistics: 250000,
  margin: 150000,
  defaultRates: {
    CNY: 13.42,
    KRW: 0.068,
    JPY: 0.62,
    EUR: 96.5,
  },
  defaults: {
    price: 165000,
    volume: 2000,
  },
};

let currentRates = { ...BUSINESS_CONFIG.defaultRates };

const CURRENCY_DATA = [
  {
    name: "china",
    get rate() {
      return currentRates.CNY;
    },
    symbol: "¥",
    label: "Цена в Китае (¥)",
    min: 50000,
    max: 1000000,
    step: 5000,
    defaultPrice: 165000,
  },
  {
    name: "korea",
    get rate() {
      return currentRates.KRW;
    },
    symbol: "₩",
    label: "Цена в Корее (₩)",
    min: 10000000,
    max: 150000000,
    step: 500000,
    defaultPrice: 35000000,
  },
  {
    name: "japan",
    get rate() {
      return currentRates.JPY;
    },
    symbol: "¥",
    label: "Цена в Японии (¥)",
    min: 1000000,
    max: 15000000,
    step: 50000,
    defaultPrice: 3800000,
  },
];

const countryTabs = document.querySelectorAll(".control-tab");
const carCards = document.querySelectorAll(".preset-card");
const priceInput = document.getElementById("priceInput");
const priceValue = document.getElementById("priceValue");
const volumeInput = document.getElementById("volumeInput");
const volumeValue = document.getElementById("volumeValue");
const ageButtons = document.querySelectorAll(".age-btn");
const resetBtn = document.getElementById("resetBtn");
const totalPriceDisplay = document.getElementById("totalPriceDisplay");
const presetsSlider = document.getElementById("presetsSlider");
const segmentedControl = document.querySelector(".segmented-control");
const sliderBg = document.querySelector(".slider-bg");
const ageToggleGroup = document.querySelector(".age-toggle-group");
const ageSliderBg = document.querySelector(".age-slider-bg");
const inputLabel = document.getElementById("inputLabel");
const rateDisplay = document.getElementById("rateDisplay");
const submitOrderBtn = document.getElementById("submitOrderBtn");

let isDown = false;
let startX;
let scrollLeft;

let isDraggingTab = false;
let startTabX = 0;
let startTransformX = 0;
let hasMovedTab = false;

let isDraggingAge = false;
let startAgeX = 0;
let startAgeTransformX = 0;
let hasMovedAge = false;

let selectedCarName = "Индивидуальный подбор (по параметрам)";

async function fetchActualExchangeRates() {
  try {
    const response = await fetch("https://www.cbr-xml-daily.ru/daily_json.js");
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (data && data.Valute) {
      currentRates.CNY = data.Valute.CNY.Value;
      currentRates.EUR = data.Valute.EUR.Value;
      currentRates.KRW = data.Valute.KRW.Value / data.Valute.KRW.Nominal;
      currentRates.JPY = data.Valute.JPY.Value / data.Valute.JPY.Nominal;
    }
  } catch (error) {
  } finally {
    updateTabActive(0);
    updateAgeActive(0);
  }
}

function calculateTotalCost() {
  const activeTab = document.querySelector(".control-tab.active");
  const tabsArray = Array.from(countryTabs);
  const countryIndex = Math.max(0, tabsArray.indexOf(activeTab));
  const currentCountry = CURRENCY_DATA[countryIndex];

  rateDisplay.textContent = `${currentCountry.symbol}1 = ${Number(currentCountry.rate)} ₽`;
  inputLabel.textContent = currentCountry.label;

  const priceLocal = Number(priceInput.value);
  const volume = Number(volumeInput.value);
  const activeAgeBtn = document.querySelector(".age-btn.active");
  const age = Number(activeAgeBtn.dataset.age);

  const autoPriceRUB = priceLocal * currentCountry.rate;
  let customsDuty = 0;

  if (volume === 0) {
    customsDuty = autoPriceRUB * 0.2;
  } else {
    if (age < 3) {
      customsDuty = autoPriceRUB * 0.48;
    } else if (age >= 3 && age <= 5) {
      let euroPerCc = 1.5;
      if (volume > 1000 && volume <= 1500) euroPerCc = 1.7;
      else if (volume > 1500 && volume <= 1800) euroPerCc = 2.5;
      else if (volume > 1800 && volume <= 2300) euroPerCc = 2.7;
      else if (volume > 2300 && volume <= 3000) euroPerCc = 3.0;
      else if (volume > 3000) euroPerCc = 3.6;

      customsDuty = volume * euroPerCc * currentRates.EUR;
    } else {
      let euroPerCc = 3.0;
      if (volume > 1000 && volume <= 1500) euroPerCc = 3.2;
      else if (volume > 1500 && volume <= 1800) euroPerCc = 3.5;
      else if (volume > 1800 && volume <= 2300) euroPerCc = 4.8;
      else if (volume > 2300 && volume <= 3000) euroPerCc = 5.0;
      else if (volume > 3000) euroPerCc = 5.7;

      customsDuty = volume * euroPerCc * currentRates.EUR;
    }
  }

  let utilSbor = 0;
  if (volume === 0) {
    utilSbor = age < 3 ? 32600 : 122000;
  } else if (volume <= 2000) {
    utilSbor = age < 3 ? 306000 : 528000;
  } else if (volume <= 3000) {
    utilSbor = age < 3 ? 844000 : 1279000;
  } else {
    utilSbor = age < 3 ? 1235000 : 1620000;
  }

  const totalFinalPrice =
    autoPriceRUB +
    customsDuty +
    utilSbor +
    BUSINESS_CONFIG.logistics +
    BUSINESS_CONFIG.margin;
  totalPriceDisplay.textContent =
    Math.round(totalFinalPrice).toLocaleString("ru-RU") + " ₽";
}

function updateTabActive(index) {
  countryTabs.forEach((t, idx) => {
    t.classList.toggle("active", idx === index);
  });
  const rect = segmentedControl.getBoundingClientRect();
  const tabWidth = (rect.width - 6) / 3;
  const finalX = index * tabWidth;
  sliderBg.style.transform = `translateX(${finalX}px)`;

  const data = CURRENCY_DATA[index];
  priceInput.min = data.min;
  priceInput.max = data.max;
  priceInput.step = data.step;
  priceInput.value = data.defaultPrice;
  priceValue.textContent = data.defaultPrice.toLocaleString("ru-RU");

  calculateTotalCost();
}

function updateAgeActive(index) {
  ageButtons.forEach((b, idx) => {
    b.classList.toggle("active", idx === index);
  });
  const rect = ageToggleGroup.getBoundingClientRect();
  const tabWidth = (rect.width - 8) / 3;
  const finalX = index * tabWidth;
  ageSliderBg.style.transform = `translateX(${finalX}px)`;
  calculateTotalCost();
}

function handleTabSwipe(clientX) {
  const rect = segmentedControl.getBoundingClientRect();
  const deltaX = clientX - startTabX;
  if (Math.abs(deltaX) > 2) hasMovedTab = true;
  if (hasMovedTab) {
    let currentX = startTransformX + deltaX;
    const tabWidth = (rect.width - 6) / 3;
    const maxLeft = rect.width - tabWidth - 6;
    currentX = Math.max(0, Math.min(maxLeft, currentX));
    sliderBg.style.transform = `translateX(${currentX}px)`;
  }
}

function handleAgeSwipe(clientX) {
  const rect = ageToggleGroup.getBoundingClientRect();
  const deltaX = clientX - startAgeX;
  if (Math.abs(deltaX) > 2) hasMovedAge = true;
  if (hasMovedAge) {
    let currentX = startAgeTransformX + deltaX;
    const tabWidth = (rect.width - 8) / 3;
    const maxLeft = rect.width - tabWidth - 8;
    currentX = Math.max(0, Math.min(maxLeft, currentX));
    ageSliderBg.style.transform = `translateX(${currentX}px)`;
  }
}

priceInput.addEventListener("input", (e) => {
  priceValue.textContent = Number(e.target.value).toLocaleString("ru-RU");
  selectedCarName = "Индивидуальный подбор (по параметрам)";
  calculateTotalCost();
});

volumeInput.addEventListener("input", (e) => {
  volumeValue.textContent =
    e.target.value == 0
      ? "Электро / Гибрид"
      : Number(e.target.value).toLocaleString("ru-RU");
  selectedCarName = "Индивидуальный подбор (по параметрам)";
  calculateTotalCost();
});

segmentedControl.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
  },
  { passive: false },
);
ageToggleGroup.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
  },
  { passive: false },
);

segmentedControl.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 && e.pointerType === "mouse") return;
  isDraggingTab = true;
  hasMovedTab = false;
  startTabX = e.clientX;
  const style = window.getComputedStyle(sliderBg);
  const matrix = new DOMMatrix(style.transform);
  startTransformX = matrix.m41;
  sliderBg.style.transition = "none";
});

ageToggleGroup.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 && e.pointerType === "mouse") return;
  isDraggingAge = true;
  hasMovedAge = false;
  startAgeX = e.clientX;
  const style = window.getComputedStyle(ageSliderBg);
  const matrix = new DOMMatrix(style.transform);
  startAgeTransformX = matrix.m41;
  ageSliderBg.style.transition = "none";
});

window.addEventListener("pointermove", (e) => {
  if (isDraggingTab) handleTabSwipe(e.clientX);
  if (isDraggingAge) handleAgeSwipe(e.clientX);
});

window.addEventListener("pointerup", (e) => {
  if (isDraggingTab) {
    isDraggingTab = false;
    sliderBg.style.transition = "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)";
    const rect = segmentedControl.getBoundingClientRect();
    const tabWidth = (rect.width - 6) / 3;
    const style = window.getComputedStyle(sliderBg);
    const matrix = new DOMMatrix(style.transform);
    let targetIndex = hasMovedTab
      ? Math.round(matrix.m41 / tabWidth)
      : Math.floor((startTabX - rect.left) / (rect.width / 3));
    selectedCarName = "Индивидуальный подбор (по параметрам)";
    updateTabActive(Math.max(0, Math.min(2, targetIndex)));
  }

  if (isDraggingAge) {
    isDraggingAge = false;
    ageSliderBg.style.transition =
      "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)";
    const rect = ageToggleGroup.getBoundingClientRect();
    const tabWidth = (rect.width - 8) / 3;
    const style = window.getComputedStyle(ageSliderBg);
    const matrix = new DOMMatrix(style.transform);
    let targetIndex = hasMovedAge
      ? Math.round(matrix.m41 / tabWidth)
      : Math.floor((startAgeX - rect.left) / (rect.width / 3));
    selectedCarName = "Индивидуальный подбор (по параметрам)";
    updateAgeActive(Math.max(0, Math.min(2, targetIndex)));
  }
});

carCards.forEach((card) => {
  card.addEventListener("click", () => {
    const countryIdx = card.dataset.countryIndex
      ? Number(card.dataset.countryIndex)
      : 0;
    updateTabActive(countryIdx);
    const price = Number(card.dataset.price);
    const volume = Number(card.dataset.volume);
    priceInput.value = price;
    volumeInput.value = volume;
    priceValue.textContent = price.toLocaleString("ru-RU");
    volumeValue.textContent =
      volume === 0 ? "Электро / Гибрид" : volume.toLocaleString("ru-RU");

    const nameElement = card.querySelector(".card-name");
    if (nameElement) {
      selectedCarName = nameElement.textContent;
    }

    updateAgeActive(0);
  });
});

resetBtn.addEventListener("click", () => {
  updateTabActive(0);
  updateAgeActive(0);
  priceInput.value = BUSINESS_CONFIG.defaults.price;
  volumeInput.value = BUSINESS_CONFIG.defaults.volume;
  priceValue.textContent =
    BUSINESS_CONFIG.defaults.price.toLocaleString("ru-RU");
  volumeValue.textContent =
    BUSINESS_CONFIG.defaults.volume.toLocaleString("ru-RU");
  selectedCarName = "Индивидуальный подбор (по параметрам)";
});

presetsSlider.addEventListener("mousedown", (e) => {
  isDown = true;
  presetsSlider.style.cursor = "grabbing";
  startX = e.pageX - presetsSlider.offsetLeft;
  scrollLeft = presetsSlider.scrollLeft;
  e.preventDefault();
});

presetsSlider.addEventListener("mouseleave", () => {
  isDown = false;
  presetsSlider.style.cursor = "grab";
});
presetsSlider.addEventListener("mouseup", () => {
  isDown = false;
  presetsSlider.style.cursor = "grab";
});

presetsSlider.addEventListener("mousemove", (e) => {
  if (!isDown) return;
  e.preventDefault();
  const x = e.pageX - presetsSlider.offsetLeft;
  presetsSlider.scrollLeft = scrollLeft - (x - startX) * 1.5;
});

presetsSlider.addEventListener("wheel", (e) => {
  if (e.deltaY !== 0) {
    e.preventDefault();
    presetsSlider.scrollLeft += e.deltaY * 1.2;
  }
});

submitOrderBtn.addEventListener("click", () => {
  const activeTab = document.querySelector(".control-tab.active");
  const tabsArray = Array.from(countryTabs);
  const countryIndex = Math.max(0, tabsArray.indexOf(activeTab));
  const currentCountry = CURRENCY_DATA[countryIndex];

  const priceLocal = Number(priceInput.value);
  const volume = Number(volumeInput.value);
  const activeAgeBtn = document.querySelector(".age-btn.active");
  const ageText = activeAgeBtn ? activeAgeBtn.textContent : "";
  const totalPrice = totalPriceDisplay.textContent;

  const countryNameRu =
    currentCountry.name === "china"
      ? "Китай"
      : currentCountry.name === "korea"
        ? "Корея"
        : "Япония";
  const volumeText =
    volume === 0
      ? "Электро / Гибрид"
      : `${volume.toLocaleString("ru-RU")} куб. см`;

  try {
    window.Telegram.WebApp.showPopup(
      {
        title: "Проверка спецификации",
        message:
          `Вы отправляете заявку на расчет стоимости:\n\n` +
          `🚗 Модель: ${selectedCarName}\n` +
          `📍 Страна: ${countryNameRu}\n` +
          `💰 Цена: ${priceLocal.toLocaleString("ru-RU")} ${currentCountry.symbol}\n` +
          `🔌 Двигатель: ${volumeText}\n` +
          `📅 Возраст: ${ageText}\n\n` +
          `💵 Итоговая стоимость: ${totalPrice}\n\n` +
          `Всё верно?`,
        buttons: [
          { id: "submit", type: "default", text: "Да, отправить заявку" },
          { id: "cancel", type: "cancel", text: "Отмена" },
        ],
      },
      (buttonId) => {
        if (buttonId === "submit") {
          window.Telegram.WebApp.showAlert(
            "Заявка успешно сформирована! Менеджер свяжется с вами для уточнения деталей.",
            () => {
              window.Telegram.WebApp.close();
            },
          );
        }
      },
    );
  } catch (e) {
    alert(
      "Заявка сформирована (Вне Telegram): " +
        selectedCarName +
        " - " +
        totalPrice,
    );
  }
});

window.addEventListener("DOMContentLoaded", () => {
  presetsSlider.style.cursor = "grab";
  fetchActualExchangeRates();
});

window.addEventListener("resize", () => {
  const activeTab = document.querySelector(".control-tab.active");
  if (activeTab) updateTabActive(Array.from(countryTabs).indexOf(activeTab));
  const activeAge = document.querySelector(".age-btn.active");
  if (activeAge) updateAgeActive(Array.from(ageButtons).indexOf(activeAge));
});
