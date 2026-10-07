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
 * 返回上一页（已统一为 back.js 的 appBack 逻辑，保留签名以兼容旧调用点）
 * @param {string} defaultPage - 已废弃，仅兼容旧调用
 * @param {Object} customMap - 已废弃，仅兼容旧调用
 */
function goBack() {
    if (typeof window.appBack === 'function') {
        return window.appBack();
    }
    if (window.history.length > 1) {
        window.history.back();
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
