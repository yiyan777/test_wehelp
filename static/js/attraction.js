console.log("哈哈");

// 取得 URL 中的 id 參數
const path = window.location.pathname;
const attractionId = path.split('/')[2];  // 提取 URL 中的 ID

// 確保有 id 時再進行資料請求
if (attractionId) {
  fetchAttractionData(attractionId);
} else {
  console.error("無法取得景點 id");
}

// 根據景點 id 請求資料
async function fetchAttractionData(id) {
  try {
    // 發送 GET 請求來取得景點詳細資料
    const response = await fetch(`http://18.177.65.105:8000/api/attraction/${id}`);
    const result = await response.json();

    if (result && result.data) {
      const attraction = result.data;
      displayAttractionData(attraction);
      setupSlideshow(attraction.images); //設定輪播
    } else {
      console.error("無法取得景點資料");
    }
  } catch (error) {
    console.error("資料載入失敗:", error);
  }
}

// 顯示景點資料到頁面
function displayAttractionData(attraction) {
  // 取得 main 中的元素
  const container = document.querySelector(".attraction-container");
  const imgElement = container.querySelector("#slideshow-image");
  const nameElement = container.querySelector(".name");
  const categoryMrtElement = container.querySelector(".category-mrt");
  const descElement = document.querySelector(".desc");
  const addressElement = document.querySelector(".address");
  const transportElement = document.querySelector(".transport");

  // 更新圖片
  imgElement.src = attraction.images[0]; // 圖片是陣列
  imgElement.alt = attraction.name;

  // 更新景點名稱
  nameElement.textContent = attraction.name;

  // 更新類別和捷運站資訊
  categoryMrtElement.textContent = `${attraction.category} at ${attraction.mrt || "無捷運站"}`;

  // 更新描述
  descElement.textContent = attraction.description;

  // 更新地址
  addressElement.textContent = attraction.address;

  // 更新交通方式
  transportElement.textContent = attraction.transport;
}

// 訂購區域：更改導覽費用
const morningRadio = document.getElementById("morning");
const afternoonRadio = document.getElementById("afternoon");
const feeElement = document.querySelector(".user-fee");

morningRadio.addEventListener("change", () => {
  if (morningRadio.checked) {
    feeElement.textContent = "新台幣2000元";
  }
});

afternoonRadio.addEventListener("change", () => {
  if (afternoonRadio.checked) {
    feeElement.textContent = "新台幣2500元";
  }
});

// 輪播功能
function setupSlideshow(images){
  const imgElement = document.getElementById("slideshow-image");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const dotsContainer = document.querySelector(".dots-container");

  let currentIndex = 0;

  //生成對應數量的圓點
  dotsContainer.innerHTML = "";
  images.forEach((_, index) => {
    const dot = document.createElement("span");
    dot.classList.add("dot");
    if (index === 0 ) dot.classList.add("active");
    dot.addEventListener("click", () => showImage(index));
    dotsContainer.appendChild(dot);
  });

  function showImage(index){
    currentIndex = index;
    imgElement.src = images[currentIndex];

    // 更新圓點樣式
    document.querySelectorAll(".dot").forEach((dot, i) => {
      dot.classList.toggle("active", i === currentIndex);
    });
  }

  prevBtn.addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    showImage(currentIndex);
  });

  nextBtn.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % images.length;
    showImage(currentIndex);
  });

  // 初次載入第一張圖片
  showImage(0);
}