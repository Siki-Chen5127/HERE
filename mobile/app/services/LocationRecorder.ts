import { PermissionsAndroid, Platform } from "react-native"
import Geolocation from "@react-native-community/geolocation"
import type { GeolocationError, GeolocationResponse } from "@react-native-community/geolocation"

// 🟢 引入本地 SQLite
import * as SQLite from 'expo-sqlite'

import { wgs84ToGcj02 } from "@/utils/coordTransform"
import { load, save } from "@/utils/storage"
import { usersRepository } from "@/services/database/repositories"

let watchID: number | null = null
const AMAP_WEB_KEY = process.env.EXPO_PUBLIC_AMAP_WEB_KEY ?? "" 
const LAST_LOCATION_KEY = "here.lastKnownLocation"
const LOCATION_CACHE_MAX_AGE = 30 * 60 * 1000

export interface LocationPoint {
  latitude: number
  longitude: number
  accuracy?: number
  timestamp?: number
}

// 🟢 打开数据库连接
const db = SQLite.openDatabaseSync('assignment.db')

const normalizePosition = (position: GeolocationResponse): LocationPoint => {
  const { latitude, longitude } = wgs84ToGcj02(
    position.coords.latitude,
    position.coords.longitude,
  )

  return {
    latitude,
    longitude,
    accuracy: position.coords.accuracy,
    timestamp: position.timestamp || Date.now(),
  }
}

const cachePosition = (point: LocationPoint) => {
  save(LAST_LOCATION_KEY, { ...point, timestamp: point.timestamp || Date.now() })
}

export const getCachedPosition = (): LocationPoint | null => {
  const point = load<LocationPoint>(LAST_LOCATION_KEY)
  if (
    !point ||
    !Number.isFinite(point.latitude) ||
    !Number.isFinite(point.longitude) ||
    !point.timestamp ||
    Date.now() - point.timestamp > LOCATION_CACHE_MAX_AGE
  ) {
    return null
  }

  return point
}

/**
 * 💡 计算两点间距离（单位：米）
 */
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}

/**
 * 💡 逆地理编码：通过坐标获取中文地址
 */
const getAddressFromCoords = async (lat: number, lon: number) => {
  try {
    const res = await fetch(`https://restapi.amap.com/v3/geocode/regeo?output=json&location=${lon},${lat}&key=${AMAP_WEB_KEY}&radius=500&extensions=base`)
    const data = await res.json()
    if (data.status === '1' && data.regeocode) {
      const component = data.regeocode.addressComponent;
      const address = component.neighborhood?.name || 
                      component.building?.name || 
                      component.streetNumber?.street ||
                      data.regeocode.formatted_address;
      return address;
    }
  } catch (e) { 
    console.log("[Location] 逆地理编码请求失败:", e);
    return null;
  }
  return null
}

export const initLocationService = async (): Promise<boolean> => {
  if (Platform.OS === "web") return true

  Geolocation.setRNConfiguration({
    skipPermissionRequests: false,
    authorizationLevel: 'whenInUse',
    locationProvider: 'auto' 
  })

  if (Platform.OS === "android") {
    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      console.log("[Location] 定位权限状态:", granted);
      return granted === PermissionsAndroid.RESULTS.GRANTED
    } catch (err) {
      console.warn(err)
      return false
    }
  }

  return true
}

/**
 * 获取一次较准确的位置。SOS 等需要单次结果的地方仍使用这个接口。
 */
export const getCurrentPosition = (): Promise<LocationPoint> => {
  if (Platform.OS === "web") {
    return new Promise((resolve, reject) => {
      if (!window.isSecureContext) {
        reject(new Error("请通过 HTTPS 打开学生端，再获取当前位置。"))
        return
      }
      if (!navigator.geolocation) {
        reject(new Error("当前浏览器不支持定位，请用 Chrome、Edge 或 Safari 打开学生端。"))
        return
      }

      const timeoutMessage = "获取位置超时，请确认设备已开启定位后重试。"
      // The browser's acquisition timeout can exclude time spent waiting for permission.
      const timeout = setTimeout(() => reject(new Error(timeoutMessage)), 25000)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeout)
          resolve(normalizePosition(position))
        },
        (error) => {
          clearTimeout(timeout)
          const message =
            error.code === 1
              ? "定位权限已被阻止。请在浏览器的站点设置中允许定位，再重试。"
              : error.code === 3
                ? timeoutMessage
                : "设备暂时无法提供位置，请开启系统定位服务后重试。"
          reject(new Error(message))
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      )
    })
  }

  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        const point = normalizePosition(position)
        cachePosition(point)
        resolve(point)
      },
      (error) => {
        if (error.code === 3) {
          console.log("[Location] 高精度定位超时，正在尝试回退到网络定位...");
          Geolocation.getCurrentPosition(
            (pos) => {
              const point = normalizePosition(pos)
              cachePosition(point)
              resolve(point)
            },
            (err2) => reject(err2),
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 120000 }
          )
        } else {
          reject(error)
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )
  })
}

/**
 * 首页渐进式定位：网络/缓存位置先到先显示，GPS 随后给出更准确的校准结果。
 */
export const getProgressivePosition = (
  onRefinedPosition?: (point: LocationPoint) => void,
): Promise<LocationPoint> => {
  return new Promise((resolve, reject) => {
    let firstPoint: LocationPoint | null = null
    let failureCount = 0

    const handleSuccess = (position: GeolocationResponse, isPrecise: boolean) => {
      const point = normalizePosition(position)
      cachePosition(point)

      if (!firstPoint) {
        firstPoint = point
        resolve(point)
        return
      }

      const moved = getDistance(
        firstPoint.latitude,
        firstPoint.longitude,
        point.latitude,
        point.longitude,
      )
      const accuracyImproved =
        typeof point.accuracy === "number" &&
        (typeof firstPoint.accuracy !== "number" || point.accuracy < firstPoint.accuracy)

      if (isPrecise && (moved >= 5 || accuracyImproved)) {
        onRefinedPosition?.(point)
      }
    }

    const handleFailure = (error: GeolocationError) => {
      failureCount += 1
      if (failureCount === 2 && !firstPoint) reject(error)
    }

    Geolocation.getCurrentPosition(
      (position) => handleSuccess(position, false),
      handleFailure,
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 120000 },
    )

    Geolocation.getCurrentPosition(
      (position) => handleSuccess(position, true),
      handleFailure,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    )
  })
}

/**
 * 启动轨迹记录与电子围栏监控 (已全面转换为本地 SQLite 逻辑)
 */
export const startRecordingTrajectory = () => {
  if (watchID !== null) {
    console.log(" [Location] 监听已在运行中");
    return;
  }

  console.log("[Location] 开始启动位置监听...");

  watchID = Geolocation.watchPosition(
    async (position) => {
      const point = normalizePosition(position)
      const { latitude, longitude } = point
      cachePosition(point)
      console.log(`[Location] 捕捉到新坐标: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);

      try {
        // 🟢 1. 获取本地当前用户
        const currentUser = usersRepository.getActiveUser()
        if (!currentUser) return;
        const userId = String(currentUser.id);
        const userRole = currentUser.role;

        // 🟢 2. 电子围栏检测 (本地比对)
        if (userRole === "elder") {
          const fence = db.getFirstSync<{latitude: number, longitude: number, radius: number}>(
            'SELECT latitude, longitude, radius FROM geofences WHERE elderId = ? AND isActive = 1', 
            userId
          );

          if (fence && fence.latitude && fence.longitude && fence.radius) {
            const distance = getDistance(latitude, longitude, fence.latitude, fence.longitude)
            if (distance > fence.radius) {
              console.log(`[Fence] 越界警告！偏离中心 ${Math.round(distance)}米`);
              
              // 往本地报警日志中插入一条围栏越界记录
              db.runSync(
                'INSERT INTO AlertLog (userId, type, status, latitude, longitude) VALUES (?, ?, ?, ?, ?)',
                userId, 'GEOFENCE_EXIT', 'active', latitude, longitude
              );
            }
          }
        }

        // --- 获取地址描述 ---
        const addressDesc = await getAddressFromCoords(latitude, longitude);

        // 🟢 3. 保存轨迹流水 (存入本地)
        db.runSync(
          'INSERT INTO ActivityLog (userId, type, address, latitude, longitude) VALUES (?, ?, ?, ?, ?)',
          userId, 'trajectory', addressDesc || "移动中", latitude, longitude
        );
        console.log(`✅ [Location] 本地轨迹记录成功: ${addressDesc || '坐标记录'}`);

      } catch (e: any) {
        console.error("❌ [Location] 业务逻辑异常:", e.message)
      }
    },
    (error) => {
      if (error.code === 3) {
        console.log("📍 [Location] 持续监听中暂时无法获得 GPS 信号（超时），等待下一次尝试...");
      } else {
        console.log("❌ [Location] 定位监听失败:", error);
      }
    },
    {
      enableHighAccuracy: true,
      distanceFilter: 10,
      interval: 10000,
      fastestInterval: 5000,
    }
  )
}

export const stopRecordingTrajectory = () => {
  if (watchID !== null) {
    Geolocation.clearWatch(watchID)
    watchID = null
    console.log("🛑 [Location] 已停止位置监听");
  }
}
