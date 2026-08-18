/**
 * 统一导航工具函数
 */

/**
 * 返回上一页，根据from参数判定
 * @param {string} defaultPage - 默认返回页面
 * @param {Object} customMap - 自定义映射（可选）
 */
function goBack(defaultPage = 'index.html', customMap = {}) {
    const params = new URLSearchParams(window.location.search);
    const from = params.get('from');
    
    if (customMap[from]) {
        window.location.href = customMap[from];
        return;
    }
    
    if (from) {
        window.location.href = from + '.html';
        return;
    }
    
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = defaultPage;
    }
}

/**
 * 切换tab并保留所有URL参数
 * @param {string} url - 目标页面
 */
function switchTab(url) {
    const params = new URLSearchParams(window.location.search);
    const queryString = params.toString();
    window.location.href = url + (queryString ? '?' + queryString : '');
}

/**
 * 获取URL参数值
 * @param {string} key - 参数名
 * @returns {string|null}
 */
function getUrlParam(key) {
    return new URLSearchParams(window.location.search).get(key);
}

/**
 * 跳转页面并携带from参数
 * @param {string} url - 目标页面
 * @param {string} from - 来源标识
 */
function navigateTo(url, from) {
    if (from) {
        window.location.href = url + '?from=' + from;
    } else {
        window.location.href = url;
    }
}
