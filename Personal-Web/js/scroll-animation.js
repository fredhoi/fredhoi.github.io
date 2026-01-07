// 滾動動畫功能
document.addEventListener('DOMContentLoaded', function() {
    // 獲取所有需要動畫的元素
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
    // 創建觀察器
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    }, {
        threshold: 0.1
    });
    
    // 觀察所有需要動畫的元素
    animatedElements.forEach(element => {
        observer.observe(element);
    });
}); 