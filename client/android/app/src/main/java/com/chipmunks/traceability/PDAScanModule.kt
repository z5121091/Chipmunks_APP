package com.chipmunks.traceability

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * PDA 扫码器广播接收器
 * 接收斯维尔扫码器的广播数据
 * 
 * 广播配置：
 * - 广播名称: com.tlsj.scan.result
 * - 广播键值: scan_result
 */
class PDAScanModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var broadcastReceiver: BroadcastReceiver? = null
    private var localBroadcastReceiver: BroadcastReceiver? = null
    private var isRegistered = false
    private var lastScanTime = 0L
    private var lastScanData = ""
    private val localAction = "com.chipmunks.LOCAL_SCAN_RESULT"

    override fun getName(): String = "PDAService"

    /**
     * 获取模块信息
     */
    @ReactMethod
    fun getModuleInfo(promise: Promise) {
        val info = Arguments.createMap().apply {
            putString("name", name)
            putString("androidVersion", Build.VERSION.SDK_INT.toString())
            putBoolean("isRegistered", isRegistered)
        }
        promise.resolve(info)
    }

    /**
     * 启动扫码监听
     */
    @ReactMethod
    fun startScan(action: String, promise: Promise) {
        try {
            android.util.Log.d("PDAService", "startScan called, action: $action")
            
            if (isRegistered) {
                android.util.Log.d("PDAService", "Already registered, unregistering first")
                stopScanInternal()
            }

            val filter = IntentFilter(action)
            // 设置优先级，确保能收到广播
            filter.priority = IntentFilter.SYSTEM_HIGH_PRIORITY
            
            broadcastReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    android.util.Log.d("PDAService", "Broadcast received! Action: ${intent?.action}")
                    
                    intent?.let {
                        android.util.Log.d("PDAService", "Intent extras: ${it.extras?.keySet()?.joinToString()}")
                        
                        // 斯维尔扫码器：scan_result 字段
                        var scanResult: String? = it.getStringExtra("scan_result")
                        
                        android.util.Log.d("PDAService", "scan_result value: $scanResult")
                        
                        // 如果 scan_result 为空，尝试其他常见字段
                        if (scanResult.isNullOrEmpty()) {
                            scanResult = it.getStringExtra("data")
                            android.util.Log.d("PDAService", "data value: $scanResult")
                        }
                        if (scanResult.isNullOrEmpty()) {
                            scanResult = it.getStringExtra("barcode")
                            android.util.Log.d("PDAService", "barcode value: $scanResult")
                        }
                        if (scanResult.isNullOrEmpty()) {
                            scanResult = it.getStringExtra("content")
                        }
                        if (scanResult.isNullOrEmpty()) {
                            scanResult = it.getStringExtra("value")
                        }
                        if (scanResult.isNullOrEmpty()) {
                            scanResult = it.getStringExtra("barcode_string")
                        }
                        if (scanResult.isNullOrEmpty()) {
                            scanResult = it.getStringExtra("scannerdata")
                        }
                        
                        val data = scanResult ?: ""

                        if (data.isNotEmpty()) {
                            android.util.Log.d("PDAService", "Processing scan data: $data")
                            
                            // 防止重复扫码（500ms内相同数据忽略）
                            val currentTime = System.currentTimeMillis()
                            if (data == lastScanData && currentTime - lastScanTime < 500) {
                                android.util.Log.d("PDAService", "Duplicate scan ignored")
                                return
                            }
                            lastScanData = data
                            lastScanTime = currentTime

                            // 发送事件到 JS
                            sendEvent("onBarcodeScan", Arguments.createMap().apply {
                                putString("data", data)
                                putString("action", action)
                                putDouble("timestamp", currentTime.toDouble())
                            })
                            android.util.Log.d("PDAService", "Event sent to JS")
                        } else {
                            android.util.Log.w("PDAService", "No scan data found in broadcast")
                        }
                    }
                }
            }

            // 动态注册广播接收器
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                reactApplicationContext.registerReceiver(broadcastReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                reactApplicationContext.registerReceiver(broadcastReceiver, filter)
            }
            
            // 同时注册本地广播接收器（接收静态注册的转发）
            val localFilter = IntentFilter(localAction)
            localBroadcastReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    val data = intent?.getStringExtra("data") ?: return
                    val act = intent?.getStringExtra("action") ?: action
                    android.util.Log.d("PDAService", "Local broadcast received: $data")
                    
                    // 防止重复
                    val currentTime = System.currentTimeMillis()
                    if (data == lastScanData && currentTime - lastScanTime < 500) {
                        return
                    }
                    lastScanData = data
                    lastScanTime = currentTime
                    
                    sendEvent("onBarcodeScan", Arguments.createMap().apply {
                        putString("data", data)
                        putString("action", act)
                        putDouble("timestamp", currentTime.toDouble())
                    })
                }
            }
            reactApplicationContext.registerReceiver(localBroadcastReceiver, localFilter)
            
            isRegistered = true
            android.util.Log.d("PDAService", "BroadcastReceiver registered successfully")
            
            promise.resolve(true)
        } catch (e: Exception) {
            android.util.Log.e("PDAService", "Failed to start scan: ${e.message}")
            promise.reject("START_SCAN_ERROR", "启动扫码监听失败: ${e.message}")
        }
    }

    /**
     * 停止扫码监听
     */
    @ReactMethod
    fun stopScan(promise: Promise) {
        try {
            stopScanInternal()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_SCAN_ERROR", "停止扫码监听失败: ${e.message}")
        }
    }

    /**
     * 检查静态接收器是否收到过数据
     */
    @ReactMethod
    fun checkStaticReceiver(promise: Promise) {
        val lastData = PDAScanReceiver.lastScanData
        val lastTime = PDAScanReceiver.lastScanTime
        val result = Arguments.createMap().apply {
            putString("lastData", lastData ?: "")
            putDouble("lastTime", lastTime.toDouble())
            putBoolean("hasRecent", lastData != null && System.currentTimeMillis() - lastTime < 3000)
        }
        promise.resolve(result)
    }

    private fun stopScanInternal() {
        broadcastReceiver?.let {
            try {
                reactApplicationContext.unregisterReceiver(it)
            } catch (e: Exception) {
                // 已取消注册，忽略
            }
        }
        broadcastReceiver = null
        localBroadcastReceiver?.let {
            try {
                reactApplicationContext.unregisterReceiver(it)
            } catch (e: Exception) {
                // 已取消注册，忽略
            }
        }
        localBroadcastReceiver = null
        isRegistered = false
    }

    /**
     * 发送事件到 JS
     */
    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    /**
     * 获取支持的扫码器配置列表
     */
    @ReactMethod
    fun getSupportedConfigs(promise: Promise) {
        val configs = Arguments.createArray()
        
        // 斯维尔
        configs.pushMap(Arguments.createMap().apply {
            putString("name", "斯维尔")
            putString("action", "com.tlsj.scan.result")
            putString("key", "scan_result")
        })
        
        // 销邦
        configs.pushMap(Arguments.createMap().apply {
            putString("name", "销邦")
            putString("action", "com.supoin.PDASERVICE")
            putString("key", "data")
        })
        
        // 新大陆
        configs.pushMap(Arguments.createMap().apply {
            putString("name", "新大陆")
            putString("action", "nlscan.action.SCANNER_RESULT")
            putString("key", "SCAN_BARCODE1")
        })

        promise.resolve(configs)
    }

    override fun invalidate() {
        stopScanInternal()
        super.invalidate()
    }
}
