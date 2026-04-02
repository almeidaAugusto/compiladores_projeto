(() => {
    const LALG = window.LALG = window.LALG || {};

    function initMainTabs() {
        document.addEventListener("DOMContentLoaded", () => {
            const navItems = document.querySelectorAll(".nav-item");
            const tabPanels = document.querySelectorAll(".tab-panel");

            navItems.forEach((item) => {
                item.addEventListener("click", () => {
                    const targetId = item.dataset.tab;
                    if (!targetId) return;

                    navItems.forEach((nav) => nav.classList.remove("active"));
                    tabPanels.forEach((panel) => panel.classList.remove("active"));

                    item.classList.add("active");
                    const targetPanel = document.getElementById(targetId);
                    if (targetPanel) targetPanel.classList.add("active");
                });
            });
        });
    }

    LALG.initMainTabs = initMainTabs;
})();
