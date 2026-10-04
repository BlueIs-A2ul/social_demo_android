package com.metasocial.demo;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView == null) {
                    moveTaskToBack(true);
                    return;
                }

                String url = webView.getUrl();
                if (url != null && url.contains("index.html")) {
                    // 主页壳：由网页侧决定——iframe 内有历史则逐页返回，回到根页则回桌面
                    String js =
                        "(function(){try{return (window.__appBack&&window.__appBack())||'root';}" +
                        "catch(e){return 'root';}})()";
                    webView.evaluateJavascript(js, result -> {
                        if (result == null || result.contains("root")) {
                            moveTaskToBack(true);
                        }
                    });
                } else if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    moveTaskToBack(true);
                }
            }
        });
    }
}
