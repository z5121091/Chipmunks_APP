package com.chipmunks.traceability

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * PDA 扫码器广播接收器
 * 接收斯维尔扫码器的广播数据
 * 
 * 配置：
 * - 广播名称: com.tlsj.scan.result
 * - 广播键值: scan_result
 */
class PDAScanModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var broadcastReceiver: BroadcastReceiver? = null
    private var isRegistered = false

    override fun getName(): String = "PDAService"

    /**
     * 启动扫码监听
     * @param action 广播 action
     */
    @ReactMethod
    fun startScan(action: String, promise: Promise) {
        try {
            if (isRegistered) {
                stopScanInternal()
            }

            val filter = IntentFilter(action)
            
            broadcastReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    intent?.let {
                        // 斯维尔扫码器：scan_result 字段
                        val scanResult = it.getStringExtra("scan_result")
                        
                        // 兼容其他可能的字段名
                        val data = scanResult 
                            ?: it.getStringExtra("data")
                            ?: it.getStringExtra("barcode")
                            ?: it.getStringExtra("content")
                            ?: it.getStringExtra("barCode")
                            ?: it.getStringExtra("value")
                            ?: it.getStringExtra("barcode_string")
                            ?: it.getStringExtra("scannerdata")
                            ?: ""

                        if (data.isNotEmpty()) {
                            // 发送事件到 JS
                            sendEvent("onBarcodeScan", Arguments.createMap().apply {
                                putString("data", data)
                                putString("action", action)
                            })
                        }
                    }
                }
            }

            reactApplicationContext.registerReceiver(broadcastReceiver, filter)
            isRegistered = true
            
            promise.resolve(true)
            android.util.Log.d("PDAService", "扫码监听已启动, action: $action")
        } catch (e: Exception) {
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

    private fun stopScanInternal() {
        broadcastReceiver?.let {
            try {
                reactApplicationContext.unregisterReceiver(it)
            } catch (e: Exception) {
                // 可能已经取消注册，忽略异常
            }
        }
        broadcastReceiver = null
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
     * 支持的广播配置列表
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
        
        // Android 标准
        configs.pushMap(Arguments.createMap().apply {
            putString("name", "Android标准")
            putString("action", "android.intent.action.SCANRESULT")
            putString("key", "value")
        })

        promise.resolve(configs)
    }

    override fun invalidate() {
        stopScanInternal()
        super.invalidate()
    }
}
