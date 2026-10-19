const revenuePage = document.querySelector("[data-revenue-page]");

if (revenuePage) {
    const loginPanel = revenuePage.querySelector("[data-revenue-login]");
    const loginForm = revenuePage.querySelector("[data-revenue-login-form]");
    const dashboard = revenuePage.querySelector("[data-revenue-dashboard]");
    const filter = revenuePage.querySelector("[data-revenue-filter]");
    const loginStatus = revenuePage.querySelector("[data-revenue-login-status]");
    const reportStatus = revenuePage.querySelector("[data-revenue-status]");
    const formatMoney = (value) => new Intl.NumberFormat("vi-VN").format(value) + "₫";

    async function request(url, options = {}) {
        const response = await fetch(url, { ...options, credentials: "same-origin" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Không thể xử lý yêu cầu.");
        return result;
    }

    function localDate(value) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, "0");
        const day = String(value.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    async function loadReport() {
        const query = new URLSearchParams({ from: filter.elements.from.value, to: filter.elements.to.value });
        const rows = revenuePage.querySelector("[data-revenue-daily]");
        const empty = revenuePage.querySelector("[data-revenue-empty]");
        reportStatus.textContent = "Đang tải báo cáo...";
        try {
            const result = await request("/api/admin/revenue?" + query);
            revenuePage.querySelector("[data-revenue-total]").textContent = formatMoney(result.revenue);
            revenuePage.querySelector("[data-revenue-orders]").textContent = result.order_count;
            revenuePage.querySelector("[data-revenue-average]").textContent = formatMoney(result.average_order);
            rows.replaceChildren();
            result.daily.forEach((day) => {
                const row = document.createElement("tr");
                const date = document.createElement("td");
                date.textContent = new Date(day.day + "T00:00:00").toLocaleDateString("vi-VN");
                const count = document.createElement("td");
                count.textContent = day.order_count;
                const total = document.createElement("td");
                total.className = "admin-total";
                total.textContent = formatMoney(day.revenue);
                row.append(date, count, total);
                rows.append(row);
            });
            empty.hidden = result.daily.length > 0;
            reportStatus.textContent = `Báo cáo từ ${new Date(result.from + "T00:00:00").toLocaleDateString("vi-VN")} đến ${new Date(result.to + "T00:00:00").toLocaleDateString("vi-VN")}.`;
        } catch (error) {
            reportStatus.textContent = error.message;
            if (error.message.includes("đăng nhập")) {
                dashboard.hidden = true;
                loginPanel.hidden = false;
            }
        }
    }

    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    filter.elements.from.value = localDate(start);
    filter.elements.to.value = localDate(today);
    loginPanel.hidden = false;

    request("/api/admin/revenue?" + new URLSearchParams({ from: filter.elements.from.value, to: filter.elements.to.value }))
        .then(() => {
            loginPanel.hidden = true;
            dashboard.hidden = false;
            loadReport();
        })
        .catch(() => {
            loginPanel.hidden = false;
            dashboard.hidden = true;
        });

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submit = loginForm.querySelector('[type="submit"]');
        submit.disabled = true;
        loginStatus.textContent = "Đang xác thực...";
        try {
            await request("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(Object.fromEntries(new FormData(loginForm)))
            });
            loginForm.reset();
            loginStatus.textContent = "";
            dashboard.hidden = false;
            await loadReport();
            loginPanel.hidden = dashboard.hidden;
        } catch (error) {
            loginStatus.textContent = error.message;
        } finally {
            submit.disabled = false;
        }
    });

    filter.addEventListener("submit", (event) => {
        event.preventDefault();
        loadReport();
    });
    revenuePage.querySelector("[data-revenue-refresh]").addEventListener("click", loadReport);
    revenuePage.querySelector("[data-revenue-logout]").addEventListener("click", async () => {
        try {
            await request("/api/admin/logout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "{}"
            });
        } finally {
            dashboard.hidden = true;
            loginPanel.hidden = false;
            loginStatus.textContent = "Bạn đã đăng xuất.";
        }
    });
}
