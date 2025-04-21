document.addEventListener("DOMContentLoaded", async () => {
    const loginTrigger = document.getElementById("login-trigger");
    const showBooking = document.getElementById("booking");
    const token = localStorage.getItem("token");
    if (token) {
        loginTrigger.textContent = "登出系統";
        loginTrigger.addEventListener("click", () => {
            localStorage.removeItem("token");
            window.location.href = "/";
        });
    } else {
        loginTrigger.textContent = "登入/註冊";
        loginTrigger.addEventListener("click", () => {
            window.location.href = "/";
        });
    }

    showBooking.addEventListener("click", () => {
        window.location.href = "/booking";
    });

    // 未登入者擋住不給查詢訂單
    if (!token) {
      alert("請先登入系統");
      window.location.href = "/";
      return;
    }
  
    const urlParams = new URLSearchParams(window.location.search);
    const orderNumber = urlParams.get("number");
    if (!orderNumber) {
      document.getElementById("order-info").innerHTML = "<p>無效的訂單編號</p>";
      return;
    }
  
    try {
      const res = await fetch(`/api/order/${orderNumber}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const result = await res.json();
  
      if (result.data === null) {
        document.getElementById("order-info").innerHTML = "<p>找不到訂單資訊</p>";
        return;
      }
      
      document.getElementById("success-text").textContent = "行程預訂成功";

      const data = result.data;
      document.getElementById("order-number").textContent = `您的訂單編號：${data.number}`;
      
      const orderInfo = document.getElementById("order-info");
      orderInfo.innerHTML = ""; //清空
      const p1 = document.createElement("p");
      p1.textContent = `付款狀態：${data.status === 1 ? "付款成功" : "付款失敗"}`;
      orderInfo.append(p1);

      const p2 = document.createElement("p");
      p2.textContent = `金額：新台幣 ${data.price} 元`;
      orderInfo.append(p2);

      const p3 = document.createElement("p");
      p3.textContent = `景點：${data.trip.attraction.name}`;
      orderInfo.append(p3);

      const p4 = document.createElement("p");
      p4.textContent = `地址：${data.trip.attraction.address}`;
      orderInfo.append(p4);

      const p5 = document.createElement("p");
      p5.textContent = `日期：${data.trip.date}`;
      orderInfo.append(p5);

      const p6 = document.createElement("p");
      p6.textContent = `時間：${data.trip.time === "morning" ? "早上 9 點至下午 4 點" : "下午 2 點至晚上 9 點"}`;
      orderInfo.append(p6);

      const p7 = document.createElement("p");
      p7.textContent = `聯絡人：${data.contact.name}`;
      orderInfo.append(p7);

      const p8 = document.createElement("p");
      p8.textContent = `手機：${data.contact.phone}`;
      orderInfo.append(p8);

      const p9 = document.createElement("p");
      p9.textContent = `信箱：${data.contact.email}`;
      orderInfo.append(p9);
  
    } catch (error) {
      console.error("取得訂單失敗", error);
      document.getElementById("order-info").innerHTML = "<p>系統錯誤，請稍後再試</p>";
    }
});
  