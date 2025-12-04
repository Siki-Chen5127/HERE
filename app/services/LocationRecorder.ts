import { PermissionsAndroid, Platform, Alert } from "react-native"
import Geolocation from "@react-native-community/geolocation"
import AV from "leancloud-storage/core"
import { wgs84ToGcj02 } from "@/utils/coordTransform"

let watchID: number | null = null

export const initLocationService = async () => {
  // 放宽配置：允许使用缓存，不强制高精度
  Geolocation.setRNConfiguration({
    skipPermissionRequests: false,
    authorizationLevel: 'whenInUse',
    locationProvider: 'auto' 
  })

  if (Platform.OS === "android") {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      )
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log("✅ [LocationRecorder] 定位权限已获取")
      } else {
        console.warn("⚠️ [LocationRecorder] 定位权限被拒绝")
      }
    } catch (err) {
      console.warn(err)
    }
  }
}

// 获取单次位置 (兜底逻辑优化)
export const getCurrentPosition = (): Promise<{latitude: number, longitude: number}> => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = wgs84ToGcj02(position.coords.latitude, position.coords.longitude)
        resolve({ latitude, longitude })
      },
      (error) => {
        console.log("❌ [LocationRecorder] 单次定位失败:", error.code, error.message)
        reject(error)
      },
      { 
        enableHighAccuracy: false, // 关键修改：关闭强制高精度，允许基站/WIFI定位
        timeout: 60000,            // 关键修改：超时延长到 60秒
        maximumAge: 300000         // 关键修改：允许使用最近 5分钟 的缓存位置
      }
    )
  })
}

// 开始持续录制
export const startRecordingTrajectory = () => {
  if (watchID !== null) return

  console.log("📍 [LocationRecorder] 启动监听...")
  
  watchID = Geolocation.watchPosition(
    async (position) => {
      const rawLat = position.coords.latitude
      const rawLon = position.coords.longitude
      const { latitude, longitude } = wgs84ToGcj02(rawLat, rawLon)

      console.log(`📍 [GPS] 获取到坐标: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)

      try {
        const currentUser = await AV.User.currentAsync()
        if (!currentUser) return

        const log = new AV.Object('ActivityLog')
        log.set('user', currentUser)
        log.set('location', new AV.GeoPoint(latitude, longitude))
        log.set('timestamp', new Date())
        log.set('type', 'trajectory')
        
        await log.save()
        console.log(`✅ [LeanCloud] 轨迹点保存成功`)
        
      } catch (error: any) {
        // 静默处理写入错误，避免刷屏
        // console.error("保存失败", error.message)
      }
    },
    (error) => {
      console.warn("❌ [GPS] 监听错误:", error.code, error.message)
    },
    {
        enableHighAccuracy: false, // 关闭强制高精度
        distanceFilter: 10,
        interval: 10000,
        fastestInterval: 5000
    }
  )
}

export const stopRecordingTrajectory = () => {
  if (watchID !== null) {
    Geolocation.clearWatch(watchID)
    watchID = null
    console.log("🛑 [LocationRecorder] 停止监听")
  }
}