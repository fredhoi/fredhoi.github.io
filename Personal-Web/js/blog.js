// 網誌數據結構
const blogPosts = [];

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

// 加載文章列表
function loadBlogList() {
    const blogList = document.getElementById('blog-list');
    if (!blogList) return;

    // 清空容器
    blogList.innerHTML = '';

    // 按日期排序文章
    const sortedPosts = [...blogPosts].sort((a, b) => new Date(b.date) - new Date(a.date));

    // 為每個網誌創建卡片
    sortedPosts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'blog-post';
        
        // 獲取第一段文字作為預覽
        const previewText = post.content.find(item => item.type === "text")?.content || '';
        
        card.innerHTML = `
            <h3>${post.title}</h3>
            <div class="post-meta">
                <span>作者：${post.author}</span>
                <span>日期：${post.date}</span>
                ${post.category ? `<span class="post-category">分類：${post.category}</span>` : ''}
            </div>
            <div class="post-preview">
                ${previewText}
            </div>
            <a href="posts/${post.id}.html" class="read-more">閱讀更多</a>
        `;
        
        blogList.appendChild(card);
    });
}

// 加載首頁最近文章
function loadRecentPosts() {
    const recentBlogs = document.querySelector('.recent-blogs');
    if (!recentBlogs) return;

    // 按日期排序並取前5篇
    const recentPosts = [...blogPosts]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    recentBlogs.innerHTML = recentPosts.map(post => `
        <div class="blog-post">
            <h3>${post.title}</h3>
            <div class="post-meta">
                <span>日期：${post.date}</span>
                ${post.category ? `<span class="post-category">分類：${post.category}</span>` : ''}
            </div>
            <div class="post-preview">
                ${post.content.find(item => item.type === "text")?.content || ''}
            </div>
            <a href="blog/posts/${post.id}.html" class="read-more">閱讀更多</a>
        </div>
    `).join('');
}

// 加載單篇文章內容
function loadPostContent(post, container) {
    if (!container) return;

    // 清空容器
    container.innerHTML = '';
    
    // 創建網誌標題
    const title = document.createElement('h1');
    title.textContent = post.title;
    container.appendChild(title);
    
    // 創建網誌元數據
    const meta = document.createElement('div');
    meta.className = 'post-meta';
    meta.innerHTML = `
        <span>作者：${post.author}</span>
        <span>日期：${post.date}</span>
        ${post.category ? `<span class="post-category">分類：${post.category}</span>` : ''}
    `;
    container.appendChild(meta);
    
    // 創建網誌內容
    const content = document.createElement('div');
    content.className = 'post-content';
    
    // 遍歷內容數組，根據類型創建不同的元素
    post.content.forEach(item => {
        if (item.type === "text") {
            const paragraph = document.createElement('p');
            paragraph.textContent = item.content;
            content.appendChild(paragraph);
        } else if (item.type === "image") {
            const imageContainer = document.createElement('div');
            imageContainer.className = 'blog-image-container';
            
            const image = document.createElement('img');
            image.src = item.src;
            image.alt = item.alt;
            image.className = 'blog-image';
            
            if (item.caption) {
                const caption = document.createElement('p');
                caption.className = 'image-caption';
                caption.textContent = item.caption;
                imageContainer.appendChild(image);
                imageContainer.appendChild(caption);
            } else {
                imageContainer.appendChild(image);
            }
            
            content.appendChild(imageContainer);
        }
    });
    
    container.appendChild(content);
    
    // 創建返回按鈕
    const backButton = document.createElement('a');
    backButton.href = '../index.html';
    backButton.className = 'back-to-blog';
    backButton.textContent = '返回網誌列表';
    container.appendChild(backButton);
}

// 當文檔加載完成時執行
document.addEventListener('DOMContentLoaded', function() {
    // 檢查是否在文章列表頁面
    const blogList = document.getElementById('blog-list');
    if (blogList) {
        loadBlogList();
    }
    
    // 檢查是否在首頁
    const recentBlogs = document.querySelector('.recent-blogs');
    if (recentBlogs) {
        loadRecentPosts();
    }
    
    // 檢查是否在單篇文章頁面
    const blogPost = document.querySelector('.full-blog-post');
    if (blogPost) {
        // 從當前頁面的 script 標籤中獲取文章數據
        const postScript = document.querySelector('script[type="application/json"]');
        if (postScript) {
            try {
                const postData = JSON.parse(postScript.textContent);
                loadPostContent(postData, blogPost);
            } catch (e) {
                console.error('Error parsing post data:', e);
            }
        }
    }
}); 