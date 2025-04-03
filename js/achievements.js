// 比賽成績數據
const achievements = [
    {
        year: "2025",
        date: "2025/02",
        title: "2025港澳數學奧林匹克公開賽(港澳盃)(中三組)",
        score: "銅獎",
        type: "bronze"
    },
    {
        year: "2024",
        date: "2024/12",
        title: "2024澳門北斗導航系統知識競賽",
        score: "三等獎",
        type: "bronze"
    },
    {
        year: "2024",
        date: "2024/11",
        title: "2024年全澳中學生資訊科技知識問答比賽(初中組)",
        score: "冠軍",
        type: "gold"
    },
    {
        year: "2024",
        date: "2024/11",
        title: "2024粵港澳青少年人工智能追夢營",
        score: "三等獎",
        type: "bronze"
    },
    {
        year: "2024",
        date: "2024/07",
        title: "2024港澳青少年網絡技能競賽",
        score: "金獎",
        type: "gold"
    }
];

// 當文檔加載完成時執行
document.addEventListener('DOMContentLoaded', function() {
    // 獲取顯示比賽成績的容器
    const achievementsContainer = document.getElementById('achievements-list');
    
    // 如果容器存在，則顯示比賽成績
    if (achievementsContainer) {
        // 清空容器
        achievementsContainer.innerHTML = '';
        
        // 只顯示最近的5個比賽成績
        const recentAchievements = achievements.slice(0, 5);
        
        // 為每個比賽成績創建卡片
        recentAchievements.forEach(achievement => {
            const card = document.createElement('div');
            card.className = `achievement-card ${achievement.type}`;
            
            card.innerHTML = `
                <div class="achievement-date">${achievement.date}</div>
                <h4 class="achievement-title">${achievement.title}</h4>
                <div class="achievement-content">
                    <p class="achievement-score">${achievement.score}</p>
                </div>
            `;
            
            // 將卡片添加到容器中
            achievementsContainer.appendChild(card);
        });
    }
    
    // 如果當前頁面是About頁面，則顯示所有比賽成績
    const aboutAchievementsContainer = document.querySelector('.achievements');
    if (aboutAchievementsContainer) {
        // 按年份分組比賽成績
        const achievementsByYear = {};
        achievements.forEach(achievement => {
            if (!achievementsByYear[achievement.year]) {
                achievementsByYear[achievement.year] = [];
            }
            achievementsByYear[achievement.year].push(achievement);
        });
        
        // 清空容器
        aboutAchievementsContainer.innerHTML = '<h2>比賽經歷與成績</h2>';
        
        // 按年份順序顯示比賽成績
        Object.keys(achievementsByYear).sort((a, b) => b - a).forEach(year => {
            const yearSection = document.createElement('div');
            yearSection.className = 'year-section';
            
            yearSection.innerHTML = `<h3 class="year-title">${year}年</h3>`;
            
            const achievementsGrid = document.createElement('div');
            achievementsGrid.className = 'achievements-grid';
            
            achievementsByYear[year].forEach(achievement => {
                const card = document.createElement('div');
                card.className = `achievement-card ${achievement.type}`;
                
                card.innerHTML = `
                    <div class="achievement-date">${achievement.date}</div>
                    <h4 class="achievement-title">${achievement.title}</h4>
                    <div class="achievement-content">
                        <p class="achievement-score">${achievement.score}</p>
                    </div>
                `;
                
                achievementsGrid.appendChild(card);
            });
            
            yearSection.appendChild(achievementsGrid);
            aboutAchievementsContainer.appendChild(yearSection);
        });
    }
}); 