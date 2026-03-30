// 后端 API 地址 (确保它指向你的 Uvicorn 服务)
const API_BASE_URL = '/api';
let linksData = []; // 存储从后端获取的导航数据
let isLogged = false;
let currentToken = localStorage.getItem('access_token');

// 分组顺序存储
let groupOrder = JSON.parse(localStorage.getItem('group_order')) || [];

// 搜索引擎全局变量，默认使用 Google (与 index.html 中的 active 标签一致)
let currentSearchEngineUrl = 'https://www.google.com/search?q='; 

// ----------------------------------------------------
// I. 启动与初始化
// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 加载完成，开始初始化...');
    updateTime();
    setInterval(updateTime, 1000); // 每秒更新时间
    
    if (currentToken) {
        isLogged = true; 
        console.log("Found token, assuming logged in.");
    }
    
    fetchLinks();
    
    // 默认隐藏管理员按钮，当用户移动鼠标时显示
    const adminToggle = document.getElementById('adminToggle');
    document.addEventListener('mousemove', function(e) {
        if (!adminToggle) return;
        // 只有当鼠标靠近右上角时才显示按钮
        if (e.clientX > window.innerWidth - 100 && e.clientY < 100) {
            adminToggle.style.opacity = '1';
        } else if (adminToggle.style.opacity === '1' && e.clientX < window.innerWidth - 150) {
            // 只有当鼠标从边缘移开一段距离后才隐藏
            adminToggle.style.opacity = '0'; 
        }
    });

    adminToggle.addEventListener('click', openModal);
    
    initSearch(); // 初始化搜索引擎逻辑
	
	// 🌟 新增：回到顶部按钮逻辑 🌟
    const scrollToTopBtn = document.getElementById("scrollToTopBtn");

    if (scrollToTopBtn) {
        // 监听页面滚动事件，控制按钮显示/隐藏
        window.onscroll = function() {
            // 当页面向下滚动超过 300 像素时显示按钮
            if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
                scrollToTopBtn.style.opacity = "1";
                scrollToTopBtn.style.pointerEvents = "auto";
            } else {
                scrollToTopBtn.style.opacity = "0";
                scrollToTopBtn.style.pointerEvents = "none";
            }
        };

        // 按钮点击事件：平滑滚动到顶部
        scrollToTopBtn.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth' // 启用平滑滚动效果
            });
        });
    }	
});

// ----------------------------------------------------
// II. UI 辅助功能
// ----------------------------------------------------

function updateTime() {
    const now = new Date();
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const dateOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };
    
    document.getElementById('time').textContent = now.toLocaleTimeString('zh-CN', timeOptions);
    document.getElementById('date').textContent = now.toLocaleDateString('zh-CN', dateOptions);
}

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    
    if (!searchInput) return;
    
    // 1. 绑定回车键事件
    searchInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            performSearch();
        }
    });
    
    // 2. 绑定搜索引擎切换事件 (新增逻辑)
    const searchLinks = document.querySelectorAll('.search-tab .search-link');
    searchLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            // a. 切换 active 类
            searchLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // b. 更新当前搜索 URL
            currentSearchEngineUrl = this.getAttribute('data-url');
            
            // c. 更改输入框的占位符（可选）
            searchInput.placeholder = `正在使用 ${this.getAttribute('data-name')} 搜索...`;
            searchInput.focus();
        });
        
        // 初始化时设置默认搜索 URL（如果它带有 active 类）
        if (link.classList.contains('active')) {
             currentSearchEngineUrl = link.getAttribute('data-url');
        }
    });
}

function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim();
    
    if (searchTerm) {
        // 使用当前选择的 URL 进行搜索
        const finalSearchUrl = `${currentSearchEngineUrl}${encodeURIComponent(searchTerm)}`;
        window.open(finalSearchUrl, '_blank');
        
        // 搜索后清空输入框
        searchInput.value = ''; 
    } else {
        alert('请输入要搜索的内容');
        searchInput.focus();
    }
}

function openModal() {
    const modal = document.getElementById('adminModal');
    const loginForm = document.getElementById('loginForm');
    const linkManager = document.getElementById('linkManager');
    const modalTitle = document.getElementById('modalTitle');
    
    if (!modal || !loginForm || !linkManager || !modalTitle) return;

    modal.style.display = 'block';
    modalTitle.textContent = '管理面板';

    if (isLogged) {
        // 已登录：显示管理功能 (分组管理、账号设置)
        loginForm.style.display = 'none';
        linkManager.style.display = 'block';
        renderLinkManager(linksData); // 渲染分组管理界面
    } else {
        // 未登录：显示登录表单
        loginForm.style.display = 'block';
        linkManager.style.display = 'none';
    }
}

function closeModal() {
    document.getElementById('adminModal').style.display = 'none';
    document.getElementById('loginMessage').textContent = '';
}

function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const iconId = sectionId.replace('Settings', 'ToggleIcon');
    const icon = document.getElementById(iconId);
    
    if (section.style.display === 'none') {
        section.style.display = 'block';
        if (icon) icon.textContent = '▲';
    } else {
        section.style.display = 'none';
        if (icon) icon.textContent = '▼';
    }
}

// ----------------------------------------------------
// III. 导航链接渲染 (主页)
// ----------------------------------------------------

// 核心图标生成函数，兼容 图片 URL、Iconify、Simple Icons 和 Iconfont
function getIconHtml(iconName, url) {
    // 保持与您原代码一致的默认尺寸
    const defaultIconSize = '24px';
    const defaultIconColor = 'white'; 

    // 清理图标名
    const cleanIconName = iconName ? iconName.trim() : '';

    // 1. 如果图标名为空，回退到 Favicon 抓取 (保持不变)
    if (!cleanIconName) {
        try {
            const faviconUrl = new URL(url).origin + '/favicon.ico';
            return `<img src="${faviconUrl}" alt="Favicon" class="link-icon fallback-favicon" style="width: ${defaultIconSize}; height: ${defaultIconSize};">`;
        } catch (e) {
            return `<iconify-icon 
                        icon="mdi:link" 
                        class="link-icon dynamic-icon"
                        style="color: ${defaultIconColor}; font-size: ${defaultIconSize};"
                    ></iconify-icon>`;
        }
    }
    
    // 2. Iconfont (Symbol) 引用逻辑 (优化后：移除内联 style)
    // 约定：如果图标名以 "icon-" 开头，则视为 Iconfont Symbol 名称
    if (cleanIconName.startsWith('icon-')) {
        return `
            <svg class="icon iconfont-svg" aria-hidden="true">
                <use xlink:href="#${cleanIconName}"></use>
            </svg>
        `;
    }
    
    // 3. 图片 URL 逻辑 (保持不变)
    const isImageUrl = cleanIconName.startsWith('http') || cleanIconName.startsWith('/');
    const isImageFile = /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(cleanIconName);

    if (isImageUrl || isImageFile) {
        return `<img src="${cleanIconName}" alt="Link Icon" class="link-icon custom-image" style="width: ${defaultIconSize}; height: ${defaultIconSize};">`;
    }

    // 4. Iconify / Simple Icons 逻辑 (保持不变)
    let finalIconString = cleanIconName.toLowerCase();
    
    if (!finalIconString.includes(':')) {
        finalIconString = `simple-icons:${finalIconString.replace('logos:', '')}`;
    }
    
    // 使用 Iconify 组件渲染
    return `<iconify-icon 
                icon="${finalIconString}" 
                class="link-icon dynamic-icon"
                style="color: ${defaultIconColor}; font-size: ${defaultIconSize};"
            ></iconify-icon>`;
}

function renderLinks(links) {
    const container = document.getElementById('linksContainer');
    container.innerHTML = '';

    // 1. 根据链接数据，将链接归类到各自的分组
    const groupedLinks = links.reduce((acc, link) => {
        // 过滤掉标记为 is_public: false 的链接 (即我们创建的占位链接)
        if (!link.is_public) return acc; 
        
        const group = link.group || '其他';
        if (!acc[group]) acc[group] = [];
        acc[group].push(link);
        return acc;
    }, {});
    
    // 2. 获取所有分组名称，包括那些没有链接的分组 (空分组)
    const allGroups = [...new Set(links.map(link => link.group))].filter(g => g); 
    
    // 如果存在没有分组的链接，则添加 '其他' 分组
    if (links.some(link => !link.group && link.is_public)) {
        if (!groupedLinks['其他']) groupedLinks['其他'] = links.filter(link => !link.group && link.is_public);
        if (!allGroups.includes('其他')) allGroups.push('其他');
    }

    // 确保所有在 linksData 出现过的分组名都被渲染 (即使它在 groupedLinks 中是空的)
    const groupsToRender = [...new Set([...allGroups, ...Object.keys(groupedLinks)])].filter(g => g);
    
    // 使用拖动排序而不是字母排序
    const sortedGroups = getSortedGroups(groupsToRender);

    sortedGroups.forEach(group => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'link-group';
        
        // 分组标题和 "+" 按钮
        groupDiv.innerHTML = `
            <h2 class="group-title">
                <span>${group}</span> 
                <span class="add-link-btn" onclick="showAddLinkForm('${group}')" title="新增链接到此分组">+</span>
            </h2>
        `;

        const grid = document.createElement('ul');
        grid.className = 'links-grid';

        // 渲染链接
        const currentLinks = groupedLinks[group] || [];
        if (currentLinks.length > 0) {
            currentLinks.sort((a, b) => a.sort_order - b.sort_order);

            currentLinks.forEach(link => {
                const listItem = document.createElement('li');
                
                // 核心改动：调用 getIconHtml 函数处理图标逻辑
                const cardIconHtml = getIconHtml(link.icon, link.url);

                // 浮动编辑按钮逻辑
                const editButtonHtml = isLogged ? 
                    `<span class="link-edit-btn" onclick="event.preventDefault(); showAddLinkForm('${link.group}', '${link.id}')" title="编辑链接">⚙️</span>` : '';

                listItem.innerHTML = `
                    <a href="${link.url}" target="_blank" class="link-card" data-id="${link.id}">
                        ${editButtonHtml}
                        <div class="card-icon">
                            ${cardIconHtml} </div>
                        <span class="card-name">${link.name}</span>
                        <span class="card-url">${link.url.replace(/https?:\/\//, '').split('/')[0]}</span>
                    </a>
                `;
                grid.appendChild(listItem);
            });
        }

        groupDiv.appendChild(grid);
        container.appendChild(groupDiv);
    });
}

// ----------------------------------------------------
// IV. API 通信
// ----------------------------------------------------

async function fetchLinks() {
    try {
        const response = await fetch(`${API_BASE_URL}/links`);
        if (!response.ok) {
            throw new Error('Failed to fetch links');
        }
        linksData = await response.json();
        renderLinks(linksData);
    } catch (error) {
        console.error('Error fetching links:', error);
    }
}

// ----------------------------------------------------
// V. 认证与管理功能
// ----------------------------------------------------

// 通用响应处理，用于检查 401 (Token 过期)
async function handleResponse(response) {
    if (response.ok || response.status === 204) {
        return { success: true, data: response.status === 204 ? {} : await response.json() };
    }
    
    if (response.status === 401) {
        alert('权限已失效或 Token 过期，请重新登录！');
        localStorage.removeItem('access_token');
        isLogged = false;
        currentToken = null;
        // 强制返回登录界面
        document.getElementById('linkManager').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
        return { success: false, data: { detail: 'Token Expired' } };
    }
    
    const error = await response.json();
    return { success: false, data: error };
}

async function handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const msgElem = document.getElementById('loginMessage');
    
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });

        if (response.ok) {
            const data = await response.json();
            currentToken = data.access_token;
            localStorage.setItem('access_token', currentToken);
            isLogged = true;
            msgElem.textContent = '登录成功！正在进入管理界面...';
            
            // 切换 UI：隐藏登录表单，显示管理界面
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('linkManager').style.display = 'block';
            renderLinkManager(linksData);
            fetchLinks(); // 重新渲染主页以显示编辑按钮
        } else {
            msgElem.textContent = '登录失败，请检查用户名和密码。';
        }
    } catch (error) {
        msgElem.textContent = '网络错误或服务器连接失败。';
        console.error('Login error:', error);
    }
}

function handleLogout() {
    // 1. 清除本地存储的 Token
    localStorage.removeItem('access_token');
    // 2. 重置全局变量
    currentToken = null;
    isLogged = false;
    
    // 3. 切换 UI 回到登录界面
    document.getElementById('linkManager').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    
    alert('您已成功注销！');
    
    // 清空密码框，以便重新登录
    document.getElementById('password').value = '';
    document.getElementById('loginMessage').textContent = '';
    
    fetchLinks(); // 重新渲染主页以隐藏编辑按钮
}

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
    };
}

async function handleUserUpdate() {
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const newUsername = document.getElementById('newUsername').value;
    const updateMsgElem = document.getElementById('updateMessage');
    
    updateMsgElem.textContent = '';

    if (!oldPassword || !newPassword) {
        updateMsgElem.textContent = '请填写旧密码和新密码！';
        return;
    }

    const updateData = {
        old_password: oldPassword,
        new_password: newPassword,
        new_username: newUsername || undefined
    };

    try {
        const response = await fetch(`${API_BASE_URL}/admin/user/update`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(updateData)
        });

        const result = await handleResponse(response);

        if (result.success) {
            updateMsgElem.style.color = '#4CAF50';
            updateMsgElem.textContent = result.data.message; 
            
            // 强制用户重新登录
            localStorage.removeItem('access_token');
            currentToken = null;
            isLogged = false;
            
            // 清空输入框
            document.getElementById('oldPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('newUsername').value = '';
            
            setTimeout(() => {
                closeModal();
                handleLogout(); // 强制刷新并回到登录状态
            }, 2000); 

        } else if (result.data.detail !== 'Token Expired') {
            updateMsgElem.style.color = '#ff6b6b';
            updateMsgElem.textContent = '修改失败: ' + (result.data.detail || '未知错误');
        }
    } catch (error) {
        updateMsgElem.style.color = '#ff6b6b';
        updateMsgElem.textContent = '网络错误，无法连接服务器。';
        console.error('Update error:', error);
    }
}

// ----------------------------------------------------
// VI. 分组管理 (管理面板内)
// ----------------------------------------------------

// 渲染分组管理界面 (管理面板核心)
function renderLinkManager(links) {
    const managerDiv = document.getElementById('currentGroups');
    managerDiv.innerHTML = '';
    
    // 1. 渲染分组编辑/新增表单
    const groupForm = document.createElement('div');
    groupForm.id = 'manageGroupForm';
    groupForm.style.display = 'none';
    
    groupForm.innerHTML = `
        <h4 id="groupFormTitle">新增/编辑分组</h4>
        <input type="hidden" id="originalGroupName">
        <div class="form-group"><input type="text" id="newGroupName" placeholder="分组名称 (如: AI)"></div>
        <button onclick="updateGroupName()" class="primary-btn">保存</button>
        <button onclick="hideAddGroupForm()" class="primary-btn" style="background-color: #555;">取消</button>
    `;
    managerDiv.appendChild(groupForm);

    // 2. 获取并渲染分组列表
    const groups = [...new Set(links.map(link => link.group))].filter(g => g);
    
    // 使用拖动排序而不是字母排序
    const sortedGroups = getSortedGroups(groups);

    sortedGroups.forEach(groupName => {
        const item = document.createElement('div');
        item.className = 'manage-link-item';
        item.innerHTML = `
            <span>${groupName}</span>
            <div>
                <button onclick="editGroup('${groupName}')" class="manage-btn edit-btn">编辑</button>
                <button onclick="deleteGroup('${groupName}')" class="manage-btn delete-btn">删除</button>
            </div>
        `;
        managerDiv.appendChild(item);
    });
    
    // 3. 初始化拖动功能
    setTimeout(() => {
        initGroupDragAndDrop();
    }, 0);
}

function showAddGroupForm() {
    document.getElementById('manageGroupForm').style.display = 'block';
    document.getElementById('originalGroupName').value = ''; 
    document.getElementById('newGroupName').value = '';
    document.getElementById('groupFormTitle').textContent = '新增分组';
}

function hideAddGroupForm() {
    document.getElementById('manageGroupForm').style.display = 'none';
}

function editGroup(groupName) {
    document.getElementById('manageGroupForm').style.display = 'block';
    document.getElementById('originalGroupName').value = groupName;
    document.getElementById('newGroupName').value = groupName;
    document.getElementById('groupFormTitle').textContent = '编辑分组';
}

// 删除分组：删除该分组下的所有链接 (包括占位链接)
async function deleteGroup(groupName) {
    if (!confirm(`确定要删除分组 "${groupName}" 及其下所有链接吗？`)) return;

    // 1. 删除该分组下的所有链接 (包括 is_public: false 的占位链接)
    const linksToDelete = linksData.filter(l => l.group === groupName);

    for (const link of linksToDelete) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/links/${link.id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            const result = await handleResponse(response);
            if (!result.success && result.data.detail !== 'Token Expired') {
                alert(`删除链接 ${link.name} 失败: ` + (result.data.detail || '未知错误'));
                return;
            }
        } catch (error) {
            alert('网络错误，无法连接服务器。');
            return;
        }
    }
    
    // 从分组顺序中移除被删除的分组
    groupOrder = groupOrder.filter(group => group !== groupName);
    localStorage.setItem('group_order', JSON.stringify(groupOrder));
    
    alert(`分组 "${groupName}" 及其下所有链接已处理！`);
    await fetchLinks(); 
    openModal(); // 刷新管理界面
}

// 更新分组名或新增分组
async function updateGroupName() {
    const originalName = document.getElementById('originalGroupName').value;
    const newName = document.getElementById('newGroupName').value.trim();

    if (!newName) {
        alert('分组名称不能为空！');
        return;
    }
    
    // 检查新分组是否已存在 (无论是新增还是重命名，都不能重复)
    const existingGroups = [...new Set(linksData.map(link => link.group))].filter(g => g);
    if (existingGroups.includes(newName) && newName !== originalName) {
        alert(`分组 "${newName}" 已经存在！`);
        return;
    }

    if (!originalName) {
        // ------------------
        // A. 新增分组逻辑 (通过创建占位链接)
        // ------------------
        
        // 创建一个空的占位链接来强制后端数据库记录这个分组。
        const placeholderLink = {
            name: `(占位链接) ${newName}`,
            url: "http://placeholder.lelepanel.com",
            icon: "mdi:folder-plus",
            group: newName,
            sort_order: 9999,
            is_public: false // 标记为非公开，不显示在主页 (将在 renderLinks 中过滤)
        };
        
        try {
            const response = await fetch(`${API_BASE_URL}/admin/links`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(placeholderLink)
            });

            const result = await handleResponse(response);

            if (result.success) {
                 // 成功创建占位链接，现在删除它
                 const newLinkId = result.data.id;
                 await fetch(`${API_BASE_URL}/admin/links/${newLinkId}`, {
                     method: 'DELETE',
                     headers: getAuthHeaders()
                 });

                // 将新分组添加到顺序列表的末尾
                groupOrder.push(newName);
                localStorage.setItem('group_order', JSON.stringify(groupOrder));
                
                alert(`分组 "${newName}" 创建成功！`);
            } else if (result.data.detail !== 'Token Expired') {
                alert('新增分组失败: ' + (result.data.detail || '未知错误'));
                return;
            }
        } catch (error) {
            alert('网络错误，无法连接服务器。');
            return;
        }

    } else {
        // ------------------
        // B. 编辑/重命名分组逻辑
        // ------------------
        
        if (newName === originalName) {
            alert('分组名称未修改！');
            hideAddGroupForm();
            return;
        }

        // 弹出重命名确认框 (仅在重命名时)
        if (!confirm(`确定将所有 "${originalName}" 分组下的链接，更改为 "${newName}" 吗？`)) return;

        // 查找所有需要更新的链接 (包括 is_public: false 的占位链接，如果它们还没被删除的话)
        const linksToUpdate = linksData.filter(l => l.group === originalName);

        for (const link of linksToUpdate) {
            const updatedLink = { ...link, group: newName };
            try {
                const response = await fetch(`${API_BASE_URL}/admin/links/${link.id}`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(updatedLink)
                });

                const result = await handleResponse(response);
                if (!result.success && result.data.detail !== 'Token Expired') {
                    alert(`更新链接 ${link.name} 的分组失败: ` + (result.data.detail || '未知错误'));
                    return;
                }
            } catch (error) {
                alert('网络错误，无法连接服务器。');
                return;
            }
        }

        // 更新分组顺序
        const originalIndex = groupOrder.indexOf(originalName);
        if (originalIndex !== -1) {
            groupOrder[originalIndex] = newName;
            localStorage.setItem('group_order', JSON.stringify(groupOrder));
        }

        alert('分组名称更新成功！');
    }
    
    // 统一刷新 UI
    hideAddGroupForm();
    await fetchLinks(); 
    openModal();
}

// ----------------------------------------------------
// VII. 链接管理 (浮动表单)
// ----------------------------------------------------

/**
 * 显示新增/编辑链接的浮动表单
 * @param {string} groupName - 新增时预设的分组名
 * @param {string} linkId - 编辑时传入的链接ID，如果为空则是新增
 */
function showAddLinkForm(groupName = '', linkId = '') {
    if (!isLogged) {
        alert('请先登录管理员账号！');
        openModal();
        return;
    }
    
    const formContainer = document.getElementById('addLinkForm');
    if (!formContainer) return;

    if (linkId) {
        // 编辑模式
        const link = linksData.find(l => l.id == linkId); // 使用 == 确保类型匹配
        if (!link) {
            alert('未找到要编辑的链接。');
            return;
        }
        document.getElementById('linkId').value = link.id;
        document.getElementById('linkName').value = link.name;
        document.getElementById('linkUrl').value = link.url;
        document.getElementById('linkIcon').value = link.icon;
        document.getElementById('linkGroup').value = link.group;
        document.getElementById('linkSortOrder').value = link.sort_order;
        // 新增：添加删除按钮
        document.getElementById('deleteLinkBtn').style.display = 'inline-block';
        document.getElementById('deleteLinkBtn').onclick = () => deleteLink(link.id, link.name);
    } else {
        // 新增模式
        document.getElementById('linkId').value = '';
        document.getElementById('linkName').value = '';
        document.getElementById('linkUrl').value = '';
        document.getElementById('linkIcon').value = '';
        document.getElementById('linkGroup').value = groupName; // 预填分组
        document.getElementById('linkSortOrder').value = '100';
        // 隐藏删除按钮
        document.getElementById('deleteLinkBtn').style.display = 'none';
    }
    
    document.querySelector('#addLinkForm h4').textContent = linkId ? '编辑链接' : '新增链接';
    formContainer.style.display = 'block';
}

function hideAddLinkForm() {
    document.getElementById('addLinkForm').style.display = 'none';
}

// 链接的保存逻辑 (新增和编辑)
async function saveLink() {
    const linkId = document.getElementById('linkId').value;
    const newLink = {
        name: document.getElementById('linkName').value,
        url: document.getElementById('linkUrl').value,
        // 注意：这里保存到后端时，图标名不需要任何特殊处理，原样保存即可
        icon: document.getElementById('linkIcon').value, 
        group: document.getElementById('linkGroup').value,
        sort_order: parseInt(document.getElementById('linkSortOrder').value) || 100,
        is_public: true
    };
    
    let url = `${API_BASE_URL}/admin/links`;
    let method = 'POST';

    if (linkId) {
        url = `${API_BASE_URL}/admin/links/${linkId}`;
        method = 'PUT';
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: getAuthHeaders(),
            body: JSON.stringify(newLink)
        });

        const result = await handleResponse(response);

        if (result.success) {
            alert('链接保存成功！');
            hideAddLinkForm();
            await fetchLinks(); // 刷新主页和管理面板数据
        } else if (result.data.detail !== 'Token Expired') {
            alert('保存失败: ' + (result.data.detail || '未知错误'));
        }
    } catch (error) {
        alert('网络错误，无法连接服务器。');
    }
}

// 新增：链接删除功能
async function deleteLink(linkId, linkName) {
    if (!confirm(`确定要删除链接 "${linkName}" 吗？`)) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/links/${linkId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        const result = await handleResponse(response);

        if (result.success) {
            alert('链接删除成功！');
            hideAddLinkForm();
            await fetchLinks();
        } else if (result.data.detail !== 'Token Expired') {
            alert('删除失败: ' + (result.data.detail || '未知错误'));
        }
    } catch (error) {
        alert('网络错误，无法连接服务器。');
    }
}

// ----------------------------------------------------
// VIII. 数据备份与恢复
// ----------------------------------------------------

/**
 * 备份数据：将当前的 linksData 导出为 JSON 文件
 */
function backupData() {
    // 使用全局变量 linksData 作为备份内容
    const backupContent = JSON.stringify(linksData, null, 2); // 格式化 JSON，使其易读

    if (linksData.length === 0) {
        alert("错误：当前导航页没有任何链接数据可供备份！");
        return;
    }

    // 1. 创建 Blob 对象和 URL
    const blob = new Blob([backupContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // 2. 创建一个隐藏的 <a> 标签并模拟点击下载
    const a = document.createElement('a');
    
    // 命名文件: LelePanel_Backup_YYYYMMDD_HHMMSS.json
    const now = new Date();
    const timestamp = now.getFullYear().toString() + 
                        (now.getMonth() + 1).toString().padStart(2, '0') + 
                        now.getDate().toString().padStart(2, '0') + '_' +
                        now.getHours().toString().padStart(2, '0') + 
                        now.getMinutes().toString().padStart(2, '0') + 
                        now.getSeconds().toString().padStart(2, '0');
                         
    a.download = `LelePanel_Backup_${timestamp}.json`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    
    // 3. 清理
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert("数据备份成功，文件已下载！");
}

/**
 * 恢复数据：从上传的 JSON 文件中读取数据，并写入后端
 * 注意：这是一个破坏性操作，会删除现有链接并导入新数据。
 */
async function restoreData() {
    if (!isLogged) {
        alert("请先登录管理员账号再进行数据恢复！");
        return;
    }
    
    const fileInput = document.getElementById('restoreFileInput');
    const restoreMessage = document.getElementById('restoreMessage');
    const file = fileInput.files[0];
    
    restoreMessage.textContent = ''; // 清空旧消息
    restoreMessage.style.color = '#ff6b6b'; // 默认红色警告

    if (!file) {
        restoreMessage.textContent = "请先选择一个 JSON 备份文件。";
        return;
    }
    
    // 确认操作
    if (!confirm("🚨 警告：恢复操作将先删除所有现有链接，然后导入新数据。这会覆盖您的配置。是否继续？")) {
        return;
    }

    const reader = new FileReader();

    reader.onload = async function(event) {
        restoreMessage.textContent = "正在读取和处理文件...";
        try {
            const restoredJson = event.target.result;
            const newLinks = JSON.parse(restoredJson);
            
            // 简单验证：确保它是一个数组
            if (!Array.isArray(newLinks)) {
                throw new Error("文件内容格式不正确，不是一个链接数组。");
            }
            
            // 1. (破坏性操作) 删除所有现有链接
            restoreMessage.textContent = "正在删除所有现有链接...";
            await deleteAllExistingLinks();
            
            // 2. 导入新链接
            restoreMessage.textContent = `正在导入 ${newLinks.length} 条新链接...`;
            await importNewLinks(newLinks);
            
            // 3. 导入成功
            restoreMessage.textContent = "数据恢复成功！正在刷新页面...";
            restoreMessage.style.color = "#4CAF50"; // 成功绿色
            
            // 延迟刷新，让用户看到成功消息
            setTimeout(() => {
                location.reload(); 
            }, 1500);

        } catch (e) {
            console.error("恢复数据解析或操作失败:", e);
            restoreMessage.textContent = `恢复失败: ${e.message || '请确认文件是有效的 Lele-Panel 备份文件。'}`;
        }
    };

    reader.onerror = function() {
        restoreMessage.textContent = "文件读取失败。";
    };

    reader.readAsText(file);
}

/**
 * 辅助函数：删除所有当前链接
 */
async function deleteAllExistingLinks() {
    let successCount = 0;
    let failCount = 0;

    // linksData 存储着当前所有链接的 ID
    for (const link of linksData) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/links/${link.id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            const result = await handleResponse(response);
            if (result.success) {
                successCount++;
            } else if (result.data.detail !== 'Token Expired') {
                failCount++;
                console.error(`删除链接 ID ${link.id} 失败:`, result.data.detail);
            }
        } catch (error) {
            failCount++;
            console.error(`删除链接 ID ${link.id} 网络错误:`, error);
        }
    }
    
    if (failCount > 0) {
        throw new Error(`删除现有链接时发生错误。成功: ${successCount}，失败: ${failCount}。`);
    }
    return successCount;
}

/**
 * 辅助函数：将新的链接数组逐个 POST 到后端
 */
async function importNewLinks(newLinks) {
    let successCount = 0;
    let failCount = 0;

    for (const link of newLinks) {
        // 导入时必须移除 ID 字段，让后端数据库自动创建新的 ID
        const linkToPost = { ...link };
        delete linkToPost.id; 
        
        try {
            const response = await fetch(`${API_BASE_URL}/admin/links`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(linkToPost)
            });

            const result = await handleResponse(response);
            if (result.success) {
                successCount++;
            } else if (result.data.detail !== 'Token Expired') {
                failCount++;
                console.error(`导入链接 ${link.name} 失败:`, result.data.detail);
            }
        } catch (error) {
            failCount++;
            console.error(`导入链接 ${link.name} 网络错误:`, error);
        }
    }
    
    if (failCount > 0) {
        throw new Error(`导入新链接时发生错误。成功: ${successCount}，失败: ${failCount}。`);
    }
    return successCount;
}

// ----------------------------------------------------
// IX. 分组拖动排序功能
// ----------------------------------------------------

/**
 * 初始化分组拖动功能
 */
function initGroupDragAndDrop() {
    const managerDiv = document.getElementById('currentGroups');
    if (!managerDiv) return;

    const groupItems = managerDiv.querySelectorAll('.manage-link-item');
    
    groupItems.forEach(item => {
        // 设置拖动属性
        item.setAttribute('draggable', 'true');
        item.classList.add('draggable-item');
        
        // 拖动事件
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
    });
}

/**
 * 拖动开始
 */
function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', this.textContent.split('编辑')[0].trim());
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

/**
 * 拖动经过
 */
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

/**
 * 放置
 */
function handleDrop(e) {
    e.preventDefault();
    
    const draggedGroup = e.dataTransfer.getData('text/plain');
    const targetGroup = this.textContent.split('编辑')[0].trim();
    
    if (draggedGroup !== targetGroup) {
        reorderGroups(draggedGroup, targetGroup);
    }
    
    return false;
}

/**
 * 拖动结束
 */
function handleDragEnd(e) {
    const items = document.querySelectorAll('.manage-link-item');
    items.forEach(item => {
        item.classList.remove('dragging', 'drag-over');
    });
}

/**
 * 拖动进入
 */
function handleDragEnter(e) {
    this.classList.add('drag-over');
}

/**
 * 拖动离开
 */
function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

/**
 * 重新排序分组
 */
function reorderGroups(draggedGroup, targetGroup) {
    // 从当前分组顺序中移除被拖动的分组
    const newOrder = groupOrder.filter(group => group !== draggedGroup);
    
    // 找到目标分组的位置
    const targetIndex = newOrder.indexOf(targetGroup);
    
    // 在被拖动分组的位置插入
    if (targetIndex !== -1) {
        newOrder.splice(targetIndex, 0, draggedGroup);
    } else {
        newOrder.push(draggedGroup);
    }
    
    // 更新分组顺序
    groupOrder = newOrder;
    localStorage.setItem('group_order', JSON.stringify(groupOrder));
    
    // 重新渲染管理界面
    renderLinkManager(linksData);
    
    // 显示成功消息
    showTemporaryMessage('分组顺序已更新！');
}

/**
 * 显示临时消息
 */
function showTemporaryMessage(message) {
    const existingMessage = document.querySelector('.temp-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'temp-message';
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 1000;
        animation: fadeInOut 3s ease-in-out;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

/**
 * 获取排序后的分组列表
 */
function getSortedGroups(groups) {
    if (groupOrder.length === 0) {
        // 如果没有保存的顺序，使用字母排序并保存
        const sorted = [...groups].sort();
        groupOrder = sorted;
        localStorage.setItem('group_order', JSON.stringify(groupOrder));
        return sorted;
    }
    
    // 按照保存的顺序排序，新分组添加到末尾
    const sortedGroups = [];
    const remainingGroups = new Set(groups);
    
    // 首先添加已排序的分组
    groupOrder.forEach(group => {
        if (remainingGroups.has(group)) {
            sortedGroups.push(group);
            remainingGroups.delete(group);
        }
    });
    
    // 然后添加新分组（如果有）
    if (remainingGroups.size > 0) {
        const newGroups = Array.from(remainingGroups).sort();
        sortedGroups.push(...newGroups);
        // 更新保存的顺序
        groupOrder = sortedGroups;
        localStorage.setItem('group_order', JSON.stringify(groupOrder));
    }
    
    return sortedGroups;
}