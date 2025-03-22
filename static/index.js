let currentPage = 0;
let nextPage = 1;
let isLoading = false;

async function getMrtList() {
    let response = await fetch("http://18.177.65.105:8000/api/mrts");
    let result = await response.json();
    // console.log(result.data);
    let mrtList = document.querySelector(".mrts")
    result.data.forEach((item) => {
        // console.log(item);
        let mrt = document.createElement("div");
        mrt.classList.add("each-mrt");
        mrt.textContent = item;
        mrt.addEventListener("click", () => handleMrtClick(item)); //點擊事件
        mrtList.appendChild(mrt);
    });

}
// 取得景點資料
async function getData(page, keyword = "") {
    if (isLoading || page === null) return; // 避免重複請求
    isLoading = true;
    try {
        let url = `http://18.177.65.105:8000/api/attractions?page=${page}`;
        if (keyword){
            url += `&keyword=${encodeURIComponent(keyword)}`;
        }
        let response = await fetch(url);
        let result = await response.json();
        const container = document.getElementById("attraction-container");

        if (page === 0){
            container.innerHTML = ""; // 若是新搜尋，清空現有內容
        }

        result.data.forEach((item) => {
            let card = document.createElement("div");
            card.classList.add("attraction-frame");
            
            let imgBox = document.createElement("div");
            imgBox.classList.add("attraction-box");
            imgBox.style.backgroundImage = `url('${item.images[0]}')`;
            
            let name = document.createElement("div");
            name.classList.add("attraction-name");
            name.textContent = item.name;
            imgBox.appendChild(name);
            
            let mrtCategory = document.createElement("div");
            mrtCategory.classList.add("mrt-and-category");
            
            let mrt = document.createElement("div");
            mrt.classList.add("mrt");
            mrt.textContent = item.mrt || "無捷運站";
            
            let category = document.createElement("div");
            category.classList.add("category");
            category.textContent = item.category;
            
            mrtCategory.appendChild(mrt);
            mrtCategory.appendChild(category);
            
            card.appendChild(imgBox);
            card.appendChild(mrtCategory);
            
            container.appendChild(card);
        });

        // 更新下一頁頁碼
        nextPage = result.nextPage;
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        isLoading = false;
    }
}

// 處理 MRT 點擊
function handleMrtClick(mrtName){
    let searchInput = document.querySelector(".slogan-search-form input");
    searchInput.value = mrtName; // 將捷運站名填入輸入框
    currentPage = 0; //重置頁碼
    nextPage = null; // 讓 getData 重新獲取正確的 nextPage
    getData(currentPage, mrtName); //重新搜尋
}

// 監聽搜尋按鈕
const searchBtn = document.querySelector(".search-btn");
searchBtn.addEventListener("click", (e) => {
    e.preventDefault(); // 防止提交表單刷新頁面
    let keyword = document.querySelector(".slogan-search-form input").value.trim();
    currentPage = 0; //重置頁碼
    nextPage = null; // 讓 getData 重新獲取正確的 nextPage
    getData(currentPage, keyword);
});

// 滾動偵測，自動載入下一頁
function handleScroll() {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100 && nextPage !== null) {
        let keyword = document.querySelector(".slogan-search-form input").value.trim();
        getData(nextPage, keyword);
    }
}

window.addEventListener('scroll', handleScroll);

// 捷運列表左右滾動
const leftArrow = document.querySelector(".left-arrow");
const rightArrow = document.querySelector(".right-arrow");
const mrtList = document.querySelector(".mrts");
const scrollAmount = 100; //每次移動的距離100

leftArrow.addEventListener("click", () => {
    mrtList.scrollBy({ left: -scrollAmount, behavior: "smooth" });
});

rightArrow.addEventListener("click", () => {
    mrtList.scrollBy({ left: scrollAmount, behavior: "smooth" });
});

// 初始加載第0頁數據
getData(currentPage);
getMrtList();