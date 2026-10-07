/**
 * 统一返回逻辑：
 * - 页内返回按钮调用 appBack()
 * - 原生返回键调用 window.__appBack()
 * - 浮层/特殊流程通过 BackLayers.register 注册，后注册先处理
 */
(function () {
    var isIframe = false;
    try { isIframe = window.self !== window.top; } catch (e) { isIframe = true; }

    var layers = [];
    var EXIT_WINDOW_MS = 2000;
    var exitAt = 0;
    var toastEl = null;

    function ensureToast() {
        if (toastEl) return toastEl;
        toastEl = document.createElement('div');
        toastEl.setAttribute('id', 'app-back-toast');
        toastEl.style.cssText = 'position:fixed;left:50%;bottom:100px;transform:translateX(-50%);' +
            'background:rgba(0,0,0,0.8);color:#fff;padding:12px 24px;font-size:14px;' +
            'z-index:99999;display:none;white-space:nowrap;';
        document.body.appendChild(toastEl);
        return toastEl;
    }

    function showToast(message) {
        var el = ensureToast();
        el.textContent = message;
        el.style.display = 'block';
        clearTimeout(el._timer);
        el._timer = setTimeout(function () { el.style.display = 'none'; }, 1500);
    }

    function register(def) {
        if (def) layers.push(def);
    }

    // 关闭最上层浮层（后注册先处理）；返回是否有浮层被关闭
    function closeTop() {
        for (var i = layers.length - 1; i >= 0; i--) {
            var item = layers[i];
            if (!item || typeof item.isOpen !== 'function') continue;
            try {
                if (item.isOpen()) {
                    if (typeof item.close === 'function') item.close();
                    return true;
                }
            } catch (e) {}
        }
        return false;
    }

    // 页面自定义返回流程（如"建房完成页返回消息中心"）
    function runCustom() {
        for (var i = layers.length - 1; i >= 0; i--) {
            var item = layers[i];
            if (!item || typeof item.handle !== 'function') continue;
            try {
                if (item.handle()) return true;
            } catch (e) {}
        }
        return false;
    }

    // 双击退出：第一次提示，窗口内第二次返回 'exit'
    function requestExit() {
        var now = Date.now();
        if (now < exitAt) {
            exitAt = 0;
            return 'exit';
        }
        exitAt = now + EXIT_WINDOW_MS;
        showToast('再按一次退出应用');
        return 'handled';
    }

    // 非主壳页面的本地返回判定
    function localBack() {
        if (closeTop()) { exitAt = 0; return 'handled'; }
        if (runCustom()) { exitAt = 0; return 'handled'; }
        if (window.history.length > 1) {
            exitAt = 0;
            window.history.back();
            return 'handled';
        }
        return requestExit();
    }

    // 统一入口：iframe 内委托主壳，否则本地判定
    function appBack() {
        if (isIframe) {
            try {
                if (window.parent && typeof window.parent.appBack === 'function') {
                    return window.parent.appBack();
                }
            } catch (e) {}
        }
        return localBack();
    }

    window.BackLayers = {
        register: register,
        closeTop: closeTop
    };
    window.appBack = appBack;
    window.__appBack = appBack;
    window.__backOverlayClose = closeTop;
    window.__pageCustomBack = runCustom;
})();
