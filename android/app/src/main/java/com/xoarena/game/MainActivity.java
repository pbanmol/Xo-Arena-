package com.xoarena.game;

import android.Manifest;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int REQUEST_MEDIA_PERMISSION_CODE = 1001;
    private View rootContentView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Respect status bar, navigation bar, display cutout, and keyboard insets on Android 10-16+
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        rootContentView = findViewById(android.R.id.content);
        if (rootContentView != null) {
            // Default to Crimson Light theme until WebView syncs user's saved theme
            applySystemBarColors("#FFE4E6", "#FFE4E6", "#FFF1F2", false);
            rootContentView.post(() -> applySystemBarColors("#FFE4E6", "#FFE4E6", "#FFF1F2", false));

            ViewCompat.setOnApplyWindowInsetsListener(rootContentView, (view, windowInsets) -> {
                Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars()
                    | WindowInsetsCompat.Type.displayCutout()
                );
                Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
                boolean imeVisible = windowInsets.isVisible(WindowInsetsCompat.Type.ime()) && ime.bottom > 0;

                // Prevent double keyboard padding on OEMs (ColorOS/MIUI/OneUI) where the OS
                // already shrinks the window height when the keyboard opens!
                int screenHeight = view.getRootView() != null ? view.getRootView().getHeight() : 0;
                int[] loc = new int[2];
                view.getLocationOnScreen(loc);
                int viewBottomOnScreen = loc[1] + view.getHeight();
                int alreadyShrunkByOs = screenHeight > 0 ? Math.max(0, screenHeight - viewBottomOnScreen) : 0;

                int bottomPadding;
                if (imeVisible) {
                    int neededImePadding = Math.max(0, ime.bottom - alreadyShrunkByOs);
                    bottomPadding = neededImePadding;
                } else {
                    bottomPadding = bars.bottom;
                }

                view.setPadding(bars.left, bars.top, bars.right, bottomPadding);
                notifyWebViewKeyboardState(imeVisible, ime.bottom);
                return WindowInsetsCompat.CONSUMED;
            });
        }

        // Expose native Android system bar theme bridge to WebView JavaScript
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            webView.addJavascriptInterface(new SystemBarThemeBridge(), "AndroidTheme");
        }

        requestImageAccessPermission();
    }

    private void notifyWebViewKeyboardState(final boolean open, final int heightPx) {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        final WebView webView = getBridge().getWebView();
        webView.post(() -> {
            String js = "window.dispatchEvent(new CustomEvent('nativeKeyboard',{detail:{open:"
                + (open ? "true" : "false")
                + ",height:" + heightPx + "}}));";
            webView.evaluateJavascript(js, null);
        });
    }

    private void applySystemBarColors(String statusHex, String navHex, String bgBaseHex, boolean isDarkBars) {
        try {
            int statusColor = Color.parseColor(statusHex);
            int navColor = Color.parseColor(navHex);
            Window window = getWindow();
            if (window == null) return;

            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(statusColor);
            window.setNavigationBarColor(navColor);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                window.setNavigationBarContrastEnforced(false);
            }

            if (rootContentView != null) {
                // On Android 15+ edge-to-edge, content padding area displays rootContentView background
                rootContentView.setBackgroundColor(statusColor);
                WindowInsetsControllerCompat controller =
                    WindowCompat.getInsetsController(window, rootContentView);
                if (controller != null) {
                    controller.setAppearanceLightStatusBars(!isDarkBars);
                    controller.setAppearanceLightNavigationBars(!isDarkBars);
                }
            }
        } catch (IllegalArgumentException ignored) {
            // Ignore invalid hex values
        }
    }

    private class SystemBarThemeBridge {
        @JavascriptInterface
        public void setSystemBars(
            final String statusHex,
            final String navHex,
            final String bgBaseHex,
            final boolean isDarkBars
        ) {
            runOnUiThread(() -> applySystemBarColors(statusHex, navHex, bgBaseHex, isDarkBars));
        }
    }

    private void requestImageAccessPermission() {
        String permission;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permission = Manifest.permission.READ_MEDIA_IMAGES;
        } else {
            permission = Manifest.permission.READ_EXTERNAL_STORAGE;
        }

        if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{permission}, REQUEST_MEDIA_PERMISSION_CODE);
        }
    }
}
