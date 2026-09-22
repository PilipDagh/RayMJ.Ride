package com.example

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.webkit.JavascriptInterface
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Engineering
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.ui.theme.MyApplicationTheme
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SimulationViewModel : ViewModel() {
    private val pitService = GeminiPitCrewService()

    private val _telemetryContext = MutableStateFlow("Vehicle: Porsche 911 GT3 (992), Speed: 0 km/h, Broken Beams: 0, Temp: 90°C")
    val telemetryContext: StateFlow<String> = _telemetryContext.asStateFlow()

    private val _aiResponse = MutableStateFlow<String?>(null)
    val aiResponse: StateFlow<String?> = _aiResponse.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    fun updateTelemetry(contextStr: String) {
        _telemetryContext.value = contextStr
    }

    fun consultAI(query: String, isDeepAnalysis: Boolean = false, onComplete: ((String) -> Unit)? = null) {
        viewModelScope.launch {
            _isLoading.value = true
            val response = pitService.consultPitCrew(
                userQuery = query,
                telemetryContext = _telemetryContext.value,
                isDeepAnalysis = isDeepAnalysis
            )
            _aiResponse.value = response
            _isLoading.value = false
            onComplete?.invoke(response)
        }
    }
}

class MainActivity : ComponentActivity() {
    private var webViewInstance: WebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestedOrientation = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        enableEdgeToEdge()

        setContent {
            MyApplicationTheme {
                val viewModel: SimulationViewModel = viewModel()
                SimulationScreen(
                    viewModel = viewModel,
                    onWebViewReady = { webViewInstance = it }
                )
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        webViewInstance?.destroy()
        webViewInstance = null
    }
}

class AndroidBridge(
    private val context: Context,
    private val onCrashEvent: (Double, Int, Double) -> Unit,
    private val onTelemetryReceived: (String) -> Unit
) {
    private val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
        manager?.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }

    private var lastVibrateTime = 0L
    private var lastCrashTime = 0L

    @JavascriptInterface
    fun vibrate(durationMs: Long) {
        val now = System.currentTimeMillis()
        if (now - lastVibrateTime < 80) return // Throttle vibrations to prevent IPC flooding
        lastVibrateTime = now
        if (vibrator != null && vibrator.hasVibrator()) {
            val dur = durationMs.coerceIn(5, 200)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(dur, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(dur)
            }
        }
    }

    @JavascriptInterface
    fun onCrash(speedKmh: Double, brokenBeams: Int, gForce: Double) {
        val now = System.currentTimeMillis()
        if (now - lastCrashTime < 300) return // Debounce crash triggers
        lastCrashTime = now
        vibrate(80)
        onCrashEvent(speedKmh, brokenBeams, gForce)
    }

    @JavascriptInterface
    fun onTelemetryUpdate(dataJson: String) {
        onTelemetryReceived(dataJson)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun SimulationScreen(
    viewModel: SimulationViewModel,
    onWebViewReady: (WebView) -> Unit
) {
    val context = LocalContext.current
    var showPitDialog by remember { mutableStateOf(false) }
    var webViewRef by remember { mutableStateOf<WebView?>(null) }
    val coroutineScope = rememberCoroutineScope()

    Scaffold(
        modifier = Modifier.fillMaxSize()
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // Android WebView hosting the BeamNG.drive simulation engine
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { ctx ->
                    WebView(ctx).apply {
                        webViewRef = this
                        onWebViewReady(this)

                        setBackgroundColor(android.graphics.Color.parseColor("#050811"))

                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.KITKAT) {
                            WebView.setWebContentsDebuggingEnabled(true)
                        }

                        settings.apply {
                            javaScriptEnabled = true
                            domStorageEnabled = true
                            databaseEnabled = true
                            allowFileAccess = true
                            allowContentAccess = true
                            allowFileAccessFromFileURLs = true
                            allowUniversalAccessFromFileURLs = true
                            cacheMode = WebSettings.LOAD_DEFAULT
                            useWideViewPort = true
                            loadWithOverviewMode = true
                            displayZoomControls = false
                            builtInZoomControls = false
                            mediaPlaybackRequiresUserGesture = false
                        }

                        webChromeClient = object : WebChromeClient() {
                            override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
                                android.util.Log.d("SimWebView", "${consoleMessage?.message()} -- line ${consoleMessage?.lineNumber()}")
                                return true
                            }
                        }
                        webViewClient = object : WebViewClient() {
                            override fun onReceivedError(
                                view: WebView?,
                                errorCode: Int,
                                description: String?,
                                failingUrl: String?
                            ) {
                                android.util.Log.e("SimWebView", "Error: $errorCode, $description, url: $failingUrl")
                            }

                            override fun onRenderProcessGone(
                                view: WebView?,
                                detail: RenderProcessGoneDetail?
                            ): Boolean {
                                android.util.Log.w("SimWebView", "Render process crashed or terminated. Reloading simulation...")
                                view?.let { wv ->
                                    try {
                                        wv.post {
                                            wv.loadUrl("file:///android_asset/simulation/index.html")
                                        }
                                    } catch (e: Exception) {
                                        android.util.Log.e("SimWebView", "Failed to reload after render process gone", e)
                                    }
                                }
                                return true
                            }
                        }

                        addJavascriptInterface(
                            AndroidBridge(
                                context = ctx,
                                onCrashEvent = { speed, broken, gForce ->
                                    val crashCtx = "CRASH IMPACT: Speed=${speed.toInt()} km/h, BrokenBeams=$broken, Peak G-Force=${String.format("%.2f", gForce)}"
                                    viewModel.updateTelemetry(crashCtx)
                                },
                                onTelemetryReceived = { json ->
                                    viewModel.updateTelemetry(json)
                                }
                            ),
                            "AndroidBridge"
                        )

                        loadUrl("file:///android_asset/simulation/index.html")
                    }
                }
            )

            // Floating AI Pit Crew Chief Action Button
            FloatingActionButton(
                onClick = { showPitDialog = true },
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 16.dp, end = 16.dp)
                    .size(48.dp),
                containerColor = Color(0xFF00E5FF),
                contentColor = Color(0xFF0A192F),
                shape = CircleShape
            ) {
                Icon(
                    imageVector = Icons.Default.Engineering,
                    contentDescription = "AI Pit Crew & Diagnostics"
                )
            }

            // AI Pit Crew Dialogue Dialog
            if (showPitDialog) {
                AIPitCrewDialog(
                    viewModel = viewModel,
                    onDismiss = { showPitDialog = false },
                    onBroadcastToHud = { message ->
                        val escaped = message.replace("'", "\\'").replace("\n", " ")
                        webViewRef?.evaluateJavascript(
                            "window.simApp && window.simApp.ui && window.simApp.ui.setAIPitMessage('$escaped');",
                            null
                        )
                    }
                )
            }
        }
    }
}

@Composable
fun AIPitCrewDialog(
    viewModel: SimulationViewModel,
    onDismiss: () -> Unit,
    onBroadcastToHud: (String) -> Unit
) {
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
    val aiResponse by viewModel.aiResponse.collectAsStateWithLifecycle()
    var userPrompt by remember { mutableStateOf("") }

    val promptPresets = listOf(
        "Diagnose my crash damage and chassis deformation",
        "How should I tune the Porsche 911 GT3 for Mount Akina Touge?",
        "Forensic analysis of the Hydraulic Car Crusher test",
        "Optimize gear ratios & differential for top speed"
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Engineering,
                        contentDescription = null,
                        tint = Color(0xFF00E5FF),
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "AI PIT CREW CHIEF",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        letterSpacing = 1.sp,
                        color = Color(0xFFF1F5F9)
                    )
                }
                IconButton(onClick = onDismiss) {
                    Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = Color.Gray)
                }
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
            ) {
                Text(
                    text = "Powered by Gemini 3.1 Pro (Thinking Mode) & Gemini 3.5 Flash for high-fidelity vehicle dynamics & mechanical diagnostics.",
                    fontSize = 11.sp,
                    color = Color(0xFF94A3B8),
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                // Quick Prompt Preset Chips
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.padding(bottom = 12.dp)
                ) {
                    items(promptPresets) { preset ->
                        Surface(
                            onClick = {
                                userPrompt = preset
                                viewModel.consultAI(preset, isDeepAnalysis = true) { reply ->
                                    onBroadcastToHud(reply)
                                }
                            },
                            shape = RoundedCornerShape(16.dp),
                            color = Color(0xFF1E293B),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155))
                        ) {
                            Text(
                                text = preset,
                                fontSize = 11.sp,
                                color = Color(0xFFE2E8F0),
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                        }
                    }
                }

                // AI Response Card
                if (isLoading) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 16.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        CircularProgressIndicator(
                            color = Color(0xFF00E5FF),
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "Analyzing structural lattice & telemetry...",
                            fontSize = 12.sp,
                            color = Color(0xFF94A3B8)
                        )
                    }
                } else if (!aiResponse.isNullOrBlank()) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF0B192C)),
                        shape = RoundedCornerShape(8.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF00E5FF).copy(alpha = 0.3f)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 12.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                text = "RACE ENGINEER DIAGNOSTIC:",
                                fontWeight = FontWeight.Bold,
                                fontSize = 10.sp,
                                letterSpacing = 1.sp,
                                color = Color(0xFF00E5FF)
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = aiResponse ?: "",
                                fontSize = 12.sp,
                                lineHeight = 18.sp,
                                color = Color(0xFFE2E8F0)
                            )
                        }
                    }
                }

                // Custom Query Input
                OutlinedTextField(
                    value = userPrompt,
                    onValueChange = { userPrompt = it },
                    placeholder = { Text("Ask the pit crew about tuning or crash damage...", fontSize = 12.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    trailingIcon = {
                        IconButton(
                            onClick = {
                                if (userPrompt.isNotBlank()) {
                                    viewModel.consultAI(userPrompt, isDeepAnalysis = true) { reply ->
                                        onBroadcastToHud(reply)
                                    }
                                }
                            }
                        ) {
                            Icon(imageVector = Icons.Default.Send, contentDescription = "Send", tint = Color(0xFF00E5FF))
                        }
                    },
                    maxLines = 3
                )
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Dismiss", color = Color(0xFF94A3B8))
            }
        },
        containerColor = Color(0xFF0F172A)
    )
}
