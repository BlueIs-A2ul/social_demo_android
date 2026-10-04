/**
 * 统一导航工具函数
 */

/**
 * 为当前页面内的站内链接追加 back 参数（即当前页面自身的 from），
 * 使多级返回路径（房间 -> 信息中心 -> 聊天）能逐级还原，
 * 不依赖 document.referrer（Android WebView 的 iframe 内该值不可靠）
 */
(function propagateBackParam() {
    function run() {
        const from = new URLSearchParams(window.location.search).get('from');
        if (!from) return;
        document.querySelectorAll('a[href]').forEach(function (link) {
            const href = link.getAttribute('href');
            if (!href || /^([a-z]+:|#|\/)/i.test(href)) return;
            if (!href.split('?')[0].split('#')[0].endsWith('.html')) return;
            if (/[?&]back=/.test(href)) return;
            link.setAttribute('href', href + (href.indexOf('?') === -1 ? '?' : '&') + 'back=' + encodeURIComponent(from));
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();

/**
 * 返回上一页，根据from参数判定
 * @param {string} defaultPage - 默认返回页面
 * @param {Object} customMap - 自定义映射（可选）
 */
function goBack(defaultPage = 'index.html', customMap = {}) {
    const params = new URLSearchParams(window.location.search);
    const from = params.get('from');
    const back = params.get('back');
    const base = customMap[from] || (from ? from + '.html' : '');
    // 来源页若也有自己的来源(back)，返回时透传该 from，
    // 否则来源页的返回按钮会因丢失 from 而错误地回退到当前页
    const target = base && back
        ? base + (base.indexOf('?') === -1 ? '?' : '&') + 'from=' + encodeURIComponent(back)
        : base;

    // 上一页正是来源页时走真实回退，保留页面状态且不新增历史记录
    if (base) {
        const prevPage = document.referrer
            ? document.referrer.split('?')[0].split('#')[0].split('/').pop()
            : '';
        if (prevPage === base.split('?')[0]) {
            window.history.back();
            return;
        }
        window.location.href = target;
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
