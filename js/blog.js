// 網誌數據結構
let blogPosts = [];

// 添加新網誌
function addBlogPost(title, content, date) {
    const post = {
        id: Date.now(),
        title,
        content,
        date,
        preview: content.substring(0, 100) + '...'
    };
    
    blogPosts.unshift(post);
    saveBlogPosts();
    updateBlogDisplay();
}

// 保存網誌到localStorage
function saveBlogPosts() {
    localStorage.setItem('blogPosts', JSON.stringify(blogPosts));
}

// 從localStorage加載網誌
function loadBlogPosts() {
    const savedPosts = localStorage.getItem('blogPosts');
    if (savedPosts) {
        blogPosts = JSON.parse(savedPosts);
    }
}

// 更新網誌顯示
function updateBlogDisplay() {
    const isBlogPage = window.location.pathname.includes('/blog/');
    const container = isBlogPage ? document.querySelector('.blog-container') : document.querySelector('.recent-blogs');
    
    if (!container) return;

    const postsToShow = isBlogPage ? blogPosts : blogPosts.slice(0, 5);
    
    container.innerHTML = postsToShow.map(post => `
        <article class="blog-post">
            <h3>${post.title}</h3>
            <div class="post-meta">
                <span class="date">${new Date(post.date).toLocaleDateString('zh-TW')}</span>
            </div>
            <div class="post-preview">${post.preview}</div>
            <a href="/website/blog/post.html?id=${post.id}" class="read-more">閱讀更多</a>
        </article>
    `).join('');
}

// 顯示完整網誌內容
function displayFullPost() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = parseInt(urlParams.get('id'));
    
    if (!postId) return;
    
    const post = blogPosts.find(p => p.id === postId);
    if (!post) return;
    
    const container = document.querySelector('.blog-post-container');
    if (container) {
        container.innerHTML = `
            <article class="full-blog-post">
                <h1>${post.title}</h1>
                <div class="post-meta">
                    <span class="date">${new Date(post.date).toLocaleDateString('zh-TW')}</span>
                </div>
                <div class="post-content">${post.content}</div>
                <a href="/website/blog/index.html" class="back-to-blog">返回網誌列表</a>
            </article>
        `;
    }
}

// 頁面加載時初始化
document.addEventListener('DOMContentLoaded', () => {
    loadBlogPosts();
    if (window.location.pathname.includes('/blog/post.html')) {
        displayFullPost();
    } else {
        updateBlogDisplay();
    }
}); 