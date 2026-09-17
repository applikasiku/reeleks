package com.reeleks.app

import android.os.Bundle
import android.view.WindowManager
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Strong Android-side screenshot / screen-recording protection.
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )

        val webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.mediaPlaybackRequiresUserGesture = false

        // Replace with your production Cloudflare Pages URL.
        webView.loadUrl("https://reeleks.example.com")

        setContentView(webView)
    }
}
