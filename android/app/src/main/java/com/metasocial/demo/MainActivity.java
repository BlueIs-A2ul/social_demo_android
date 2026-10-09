package com.metasocial.demo;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 锁定 WebView 文本缩放：忽略系统「字体大小」，避免大字号真机文字撑破固定高度容器
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.getSettings().setTextZoom(100);
        }

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView wv = getBridge() != null ? getBridge().getWebView() : null;
                if (wv == null) {
                    moveTaskToBack(true);
                    return;
                }

                // 所有返回行为统一由网页侧 back.js / 主壳 BackManager 判定：
                // 'handled' = 已处理；'exit' = 请求最小化到桌面
                String js = "(function(){try{return (window.__appBack&&window.__appBack())||'exit';}catch(e){return 'exit';}})()";
                wv.evaluateJavascript(js, result -> {
                    if (result == null) {
                        moveTaskToBack(true);
                        return;
                    }
                    String value = result.replace("\"", "").trim();
                    if (value.equals("exit")) {
                        moveTaskToBack(true);
                    }
                });
            }
        });
    }
}
