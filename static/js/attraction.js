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
    const response = await fetch(`/api/attraction/${id}`);
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

// 開啟 popup（點右上角「登入/註冊」）
const loginTrigger = document.getElementById("login-trigger");
const popupOverlay = document.getElementById("user-pop");
const closeBtn = document.querySelector(".popup-close");
const popupBox = document.querySelector(".popup-box");  // 新增彈窗動畫

loginTrigger.addEventListener("click", () => {
    popupOverlay.style.display = "flex";
    // 新增登入/註冊彈窗動畫
    setTimeout(() => {
      popupBox.classList.add("active");
  }, 10);
});

// 關閉 popup（點 ×）
closeBtn.addEventListener("click", () => {
  popupBox.classList.remove("active");  
  popupOverlay.style.display = "none";
});


// 登入 <-> 註冊 表單切換
const loginForm = document.querySelector(".popup-login");
const signupForm = document.querySelector(".popup-signup");
const showSignup = document.getElementById("show-signup");
const showLogin = document.getElementById("show-login");

// 點「點此註冊」→ 顯示註冊表單
showSignup.addEventListener("click", () => {
    loginForm.style.display = "none";
    signupForm.style.display = "block";
    document.getElementById("signup-msg").style.display = "none";
});

// 點「點此登入」→ 顯示登入表單
showLogin.addEventListener("click", () => {
    signupForm.style.display = "none";
    loginForm.style.display = "block";
    document.getElementById("login-msg").style.display = "none";
});


// 註冊功能：串接 POST /api/user

const signupBtn = document.getElementById("signup-btn");
const signupMsg = document.getElementById("signup-msg");

signupBtn.addEventListener("click", async () => {
    // 取得使用者輸入
    const name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;

    // 簡單檢查欄位
    if (!name || !email || !password) {
        signupMsg.textContent = "請填寫所有欄位";
        signupMsg.style.color = "red";
        signupMsg.style.display = "block";
        return;
    }

    try {
        const response = await fetch("/api/user", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email, password })
        });

        const result = await response.json();

        if (response.ok) {
            signupMsg.textContent = "註冊成功！請重新登入";
            signupMsg.style.color = "green";
            signupMsg.style.display = "block";

            // 清空欄位
            document.getElementById("signup-name").value = "";
            document.getElementById("signup-email").value = "";
            document.getElementById("signup-password").value = "";

            // 過 2 秒切回登入表單
            setTimeout(() => {
                signupForm.style.display = "none";
                loginForm.style.display = "block";
                signupMsg.textContent = "";
                signupMsg.style.display = "none";
            }, 2000);
        } else {
            signupMsg.textContent = result.message || "註冊失敗";
            signupMsg.style.color = "red";
            signupMsg.style.display = "block";
        }
    } catch (error) {
        signupMsg.textContent = "伺服器連線失敗";
        signupMsg.style.color = "red";
        signupMsg.style.display = "block";
        console.error("Signup error:", error);
    }
});

// 登入功能：串接 PUT /api/user/auth
const loginBtn = document.getElementById("login-btn");
const loginMsg = document.getElementById("login-msg");

loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    // 檢查欄位
    if (!email || !password) {
        loginMsg.textContent = "請輸入帳號和密碼";
        loginMsg.style.color = "red";
        loginMsg.style.display = "block";
        return;
    }

    try {
        const response = await fetch("/api/user/auth", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok) {
            // 成功登入，儲存 token
            localStorage.setItem("token", result.token);

            // 清空欄位 + 顯示訊息
            document.getElementById("login-email").value = "";
            document.getElementById("login-password").value = "";

            loginMsg.textContent = "登入成功！重新整理畫面...";
            loginMsg.style.color = "green";
            loginMsg.style.display = "block";

            // 過一秒重新整理頁面
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            // 失敗：顯示錯誤訊息
            loginMsg.textContent = result.message || "登入失敗";
            loginMsg.style.color = "red";
            loginMsg.style.display = "block";
        }
    } catch (error) {
        loginMsg.textContent = "無法連線伺服器";
        loginMsg.style.color = "red";
        loginMsg.style.display = "block";
        console.error("Login error:", error);
    }
});


// 登入狀態判斷
window.addEventListener("DOMContentLoaded", async () => {
    const loginTrigger = document.getElementById("login-trigger");
    const token = localStorage.getItem("token");

    if (!token) {
        // 沒 token → 顯示登入/註冊
        loginTrigger.textContent = "登入 / 註冊";
        return;
    }

    try {
        const response = await fetch("/api/user/auth", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (result.data) {
            // 有登入 → 顯示登出系統
            loginTrigger.textContent = "登出系統";

            // 點擊登出時，移除 token 並刷新頁面
            loginTrigger.addEventListener("click", () => {
                localStorage.removeItem("token");
                window.location.reload();
            });
        } else {
            // Token 無效 → 顯示登入/註冊
            loginTrigger.textContent = "登入 / 註冊";
        }
    } catch (error) {
        console.error("登入狀態檢查失敗：", error);
        loginTrigger.textContent = "登入 / 註冊";
    }
});

// 綁定預約按鈕
const bookingBtn = document.querySelector(".booking-btn");
bookingBtn.addEventListener("click", handleBooking);

async function handleBooking(){
  const token = localStorage.getItem("token");
  if (!token) {
    popupOverlay.style.display = "flex";
    // 新增登入/註冊彈窗動畫
    setTimeout(() => {
      popupBox.classList.add("active");
    }, 10);
    return;
  }
  //抓取使用者輸入
  const date = document.getElementById("date").value;
  const time = document.getElementById("morning").checked ? "morning" : "afternoon";
  const price = time === "morning" ? 2000 : 2500;

  if (!date){
    alert("請選擇日期");
    return;
  }
  //發送post請求
  const attractionId = window.location.pathname.split("/")[2];
  
  try {
    const response = await fetch("/api/booking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        attractionId: parseInt(attractionId),
        date,
        time,
        price
      })
    });

    const result = await response.json();

    if (response.ok){
      //預約成功，導向booking頁面
      window.location.href = "/booking"; 
    } else {
      alert(result.message || "預約失敗");
    }

  }catch (error) {
    console.error("預約錯誤", error);
    alert("預約發生錯誤");
  }
}