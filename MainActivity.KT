package com.example.swaraggyani // <-- change this line to match YOUR project's package name

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.GeolocationPermissions
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : AppCompatActivity() {

    // Your live website (GitHub Pages). It must be this address, not a local file,
    // because the chat server only accepts requests from this origin.
    private val siteUrl = "https://noerror2311-glitch.github.io/Swarag-Gyani/"
    private val siteHost = "noerror2311-glitch.github.io"

    private lateinit var web: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var geoOrigin: String? = null
    private var geoCallback: GeolocationPermissions.Callback? = null
    private var stoppedAt = 0L

    // Photo / video picker for the chatbot's paperclip button.
    private val fileLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
            filePathCallback?.onReceiveValue(uris)
            filePathCallback = null
        }

    // Location permission for the "Use my location" button.
    private val locationLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { grants ->
            val ok = grants.values.any { it }
            geoCallback?.invoke(geoOrigin, ok, false)
            geoCallback = null
            geoOrigin = null
        }

    private val offlineHtml = """
        <html><head><meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
        body{font-family:sans-serif;background:#f6f4ef;color:#14213d;text-align:center;padding:32px 20px}
        a.call{display:block;background:#e11d48;color:#fff;font-size:1.6rem;font-weight:bold;padding:18px;border-radius:16px;text-decoration:none;margin:24px 0}
        a.retry{color:#14213d;font-weight:bold}
        </style></head><body>
        <h2>No internet connection</h2>
        <p>You can still call the emergency number.</p>
        <a class="call" href="tel:112">Call 112</a>
        <a class="retry" href="$siteUrl">Try again</a>
        </body></html>
    """.trimIndent()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Keep the page clear of the status bar, navigation bar and keyboard.
        val root = findViewById<View>(R.id.root)
        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.ime()
            )
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            insets
        }

        web = findViewById(R.id.web)
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true          // needed for saved area and recent searches
            setGeolocationEnabled(true)
            allowFileAccess = false
            mediaPlaybackRequiresUserGesture = true
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                return when (uri.scheme) {
                    "tel" -> { open(Intent(Intent.ACTION_DIAL, uri)); true }
                    "mailto", "sms" -> { open(Intent(Intent.ACTION_VIEW, uri)); true }
                    "http", "https" ->
                        if (uri.host == siteHost) false
                        else { open(Intent(Intent.ACTION_VIEW, uri)); true }
                    else -> true
                }
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                if (request.isForMainFrame) {
                    view.loadDataWithBaseURL(null, offlineHtml, "text/html", "UTF-8", null)
                }
            }
        }

        web.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(
                origin: String,
                callback: GeolocationPermissions.Callback
            ) {
                val fine = ContextCompat.checkSelfPermission(
                    this@MainActivity, Manifest.permission.ACCESS_FINE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED
                val coarse = ContextCompat.checkSelfPermission(
                    this@MainActivity, Manifest.permission.ACCESS_COARSE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED
                if (fine || coarse) {
                    callback.invoke(origin, true, false)
                } else {
                    geoOrigin = origin
                    geoCallback = callback
                    locationLauncher.launch(
                        arrayOf(
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                        )
                    )
                }
            }

            override fun onShowFileChooser(
                webView: WebView,
                callback: ValueCallback<Array<Uri>>,
                params: FileChooserParams
            ): Boolean {
                filePathCallback?.onReceiveValue(null)
                filePathCallback = callback
                return try {
                    fileLauncher.launch(params.createIntent())
                    true
                } catch (e: ActivityNotFoundException) {
                    filePathCallback = null
                    false
                }
            }
        }

        // Back button goes back inside the website first, then closes the app.
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (web.canGoBack()) web.goBack() else finish()
            }
        })

        if (savedInstanceState == null) web.loadUrl(siteUrl) else web.restoreState(savedInstanceState)
    }

    override fun onStop() {
        super.onStop()
        stoppedAt = System.currentTimeMillis()
    }

    // If the app was away for more than 10 minutes, load a fresh page.
    // This starts a new chat and wakes the sleeping AI server.
    override fun onStart() {
        super.onStart()
        val away = if (stoppedAt > 0) System.currentTimeMillis() - stoppedAt else 0L
        if (away > 10 * 60 * 1000 && ::web.isInitialized) web.loadUrl(siteUrl)
        stoppedAt = 0L
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    private fun open(intent: Intent) {
        try { startActivity(intent) } catch (e: ActivityNotFoundException) { /* no app to handle it */ }
    }

    override fun onDestroy() {
        filePathCallback?.onReceiveValue(null)
        filePathCallback = null
        web.destroy()
        super.onDestroy()
    }
}