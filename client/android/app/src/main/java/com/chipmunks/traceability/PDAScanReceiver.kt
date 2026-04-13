package com.chipmunks.traceability

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * 静态注册的扫码广播接收器
 * 作为动态注册的备份，通过 AndroidManifest.xml 声明
 */
class PDAScanReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "PDAScanReceiver"
        const val ACTION_SIWEIER = "com.tlsj.scan.result"
        
        // 存储最新扫码数据，供 JS 层获取
        var lastScanData: String? = null
        var lastScanTime: Long = 0
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        Log.d(TAG, "Static receiver triggered, action: ${intent?.action}")
        
        intent?.let {
            // 获取扫码数据
            var scanResult: String? = it.getStringExtra("scan_result")
            
            if (scanResult.isNullOrEmpty()) {
                scanResult = it.getStringExtra("data")
            }
            if (scanResult.isNullOrEmpty()) {
                scanResult = it.getStringExtra("barcode")
            }
            if (scanResult.isNullOrEmpty()) {
                scanResult = it.getStringExtra("content")
            }
            if (scanResult.isNullOrEmpty()) {
                scanResult = it.getStringExtra("value")
            }
            
            val data = scanResult ?: ""
            
            Log.d(TAG, "Scan data received: $data")
            
            if (data.isNotEmpty()) {
                // 防止重复
                val currentTime = System.currentTimeMillis()
                if (data == lastScanData && currentTime - lastScanTime < 500) {
                    Log.d(TAG, "Duplicate ignored")
                    return
                }
                
                lastScanData = data
                lastScanTime = currentTime
                
                // 尝试发送事件（如果模块已加载）
                try {
                    sendScanEvent(context, data, it.action ?: ACTION_SIWEIER)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to send event: ${e.message}")
                }
            }
        }
    }
    
    private fun sendScanEvent(context: Context?, data: String, action: String) {
        // 通过本地广播通知 JS 层
        val localIntent = Intent("com.chipmunks.LOCAL_SCAN_RESULT").apply {
            putExtra("data", data)
            putExtra("action", action)
            setPackage("com.chipmunks.traceability")
        }
        context?.sendBroadcast(localIntent)
        Log.d(TAG, "Local broadcast sent")
    }
}
