import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import { AuthProvider } from "@/contexts/AuthContext";
import { ColorSchemeProvider } from '@/hooks/useColorScheme';
import { initDatabase } from '@/utils/database';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
  "Unexpected text node: . A text node cannot be a child of a <View>",
  // 添加其它想暂时忽略的错误或警告信息
]);

export default function RootLayout() {
  // 应用启动时初始化数据库并执行版本迁移
  useEffect(() => {
    initDatabase().catch(console.error);
  }, []);

  return (
    <AuthProvider>
      <ColorSchemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          {/* StatusBar 由各 Screen 组件自行管理，支持深色模式 */}
          <Stack screenOptions={{
            // 设置所有页面的切换动画为从右侧滑入，适用于iOS 和 Android
            animation: 'slide_from_right',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            // 隐藏自带的头部
            headerShown: false
          }}>
            <Stack.Screen name="index" options={{ title: "" }} />
            <Stack.Screen name="detail" options={{ title: "详情" }} />
            <Stack.Screen name="custom-fields" options={{ title: "自定义字段" }} />
            <Stack.Screen name="rules" options={{ title: "解析规则" }} />
            <Stack.Screen name="help" options={{ title: "使用说明" }} />
            <Stack.Screen name="changelog" options={{ title: "更新日志" }} />
            <Stack.Screen name="settings" options={{ title: "设置" }} />
            {/* V3.0 新增页面 */}
            <Stack.Screen name="warehouse-management" options={{ title: "仓库管理" }} />
            <Stack.Screen name="inventory-binding" options={{ title: "物料管理" }} />
            <Stack.Screen name="inbound" options={{ title: "扫码入库" }} />
            <Stack.Screen name="inventory" options={{ title: "盘点" }} />
            <Stack.Screen name="pda-scan" options={{ title: "PDA扫码" }} />
            <Stack.Screen name="orders" options={{ title: "订单管理" }} />
          </Stack>
          <Toast />
        </GestureHandlerRootView>
      </ColorSchemeProvider>
    </AuthProvider>
  );
}
