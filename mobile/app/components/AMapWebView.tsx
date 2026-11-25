import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native"
import { Text } from "@/components/Text"

export interface AMapCoordinate {
  latitude: number
  longitude: number
}

export interface AMapCircleOptions {
  center: AMapCoordinate
  radius: number
  strokeColor?: string
  strokeWidth?: number
  fillColor?: string
}

export interface AMapWebViewHandle {
  moveCamera: (camera: { target: AMapCoordinate; zoom?: number }) => void
}

interface AMapWebViewProps {
  center: AMapCoordinate
  zoom?: number
  markers?: AMapCoordinate[]
  circles?: AMapCircleOptions[]
  polyline?: AMapCoordinate[]
  onPress?: (coordinate: AMapCoordinate) => void
  gesturesEnabled?: boolean
  style?: StyleProp<ViewStyle>
}

declare global {
  interface Window {
    AMap?: any
    _AMapSecurityConfig?: { serviceHost?: string }
    __onHereAMapLoaded?: () => void
  }
}

const AMAP_JS_KEY = process.env.EXPO_PUBLIC_AMAP_JS_KEY?.trim() ?? ""
const AMAP_SERVICE_HOST = process.env.EXPO_PUBLIC_AMAP_SERVICE_HOST?.trim() ?? ""
let amapApiReady: Promise<void> | null = null

function loadAMapApi(serviceHost: string) {
  if (window.AMap) return Promise.resolve()
  if (amapApiReady) return amapApiReady

  amapApiReady = new Promise<void>((resolve, reject) => {
    window._AMapSecurityConfig = { serviceHost }
    window.__onHereAMapLoaded = () => {
      delete window.__onHereAMapLoaded
      resolve()
    }

    const script = document.createElement("script")
    script.crossOrigin = "anonymous"
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(AMAP_JS_KEY)}&callback=__onHereAMapLoaded`
    script.async = true
    script.onerror = () => {
      amapApiReady = null
      reject(new Error("高德地图脚本加载失败，请检查网络和 JS API Key。"))
    }
    document.head.appendChild(script)
  })

  return amapApiReady
}

export const AMapWebView = forwardRef<AMapWebViewHandle, AMapWebViewProps>(
  function AMapWebView(
    {
      center,
      zoom = 15,
      markers = [],
      circles = [],
      polyline = [],
      onPress,
      gesturesEnabled = true,
      style,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<any>(null)
    const onPressRef = useRef(onPress)
    const [mapReady, setMapReady] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    onPressRef.current = onPress

    const serviceHost =
      AMAP_SERVICE_HOST ||
      (typeof window === "undefined"
        ? ""
        : `${window.location.origin}/_AMapService`)

    useImperativeHandle(
      ref,
      () => ({
        moveCamera: (camera) => {
          const target = [camera.target.longitude, camera.target.latitude]
          mapRef.current?.setZoomAndCenter(camera.zoom ?? mapRef.current.getZoom(), target)
        },
      }),
      [],
    )

    useEffect(() => {
      if (Platform.OS !== "web" || !containerRef.current) return
      if (!AMAP_JS_KEY) {
        setLoadError("缺少网页地图配置。请配置 EXPO_PUBLIC_AMAP_JS_KEY。")
        return
      }

      let disposed = false
      void loadAMapApi(serviceHost)
        .then(() => {
          if (disposed || !containerRef.current || mapRef.current) return
          const map = new window.AMap!.Map(containerRef.current, {
            center: [center.longitude, center.latitude],
            zoom,
            zoomEnable: gesturesEnabled,
            dragEnable: gesturesEnabled,
            doubleClickZoom: gesturesEnabled,
            keyboardEnable: gesturesEnabled,
          })
          map.on("click", (event: any) => {
            onPressRef.current?.({
              latitude: event.lnglat.getLat(),
              longitude: event.lnglat.getLng(),
            })
          })
          mapRef.current = map
          setMapReady(true)
        })
        .catch((error: unknown) => {
          if (!disposed) {
            setLoadError(error instanceof Error ? error.message : String(error))
          }
        })

      return () => {
        disposed = true
        mapRef.current?.destroy()
        mapRef.current = null
        setMapReady(false)
      }
    }, [serviceHost])

    useEffect(() => {
      if (!mapRef.current) return
      mapRef.current.setZoomAndCenter(zoom, [center.longitude, center.latitude])
    }, [center.latitude, center.longitude, mapReady, zoom])

    useEffect(() => {
      const map = mapRef.current
      if (!map || !window.AMap) return

      map.clearMap()
      markers.forEach((coordinate) => {
        const dot = document.createElement("span")
        dot.setAttribute("aria-hidden", "true")
        dot.style.cssText =
          "display:block;box-sizing:border-box;width:16px;height:16px;border:2px solid white;border-radius:50%;background:#2563eb;box-shadow:0 0 0 1px #1d4ed8"
        new window.AMap!.Marker({
          position: [coordinate.longitude, coordinate.latitude],
          content: dot,
          anchor: "center",
          map,
        })
      })

      circles.forEach((circle) => {
        new window.AMap!.Circle({
          center: [circle.center.longitude, circle.center.latitude],
          radius: circle.radius,
          strokeColor: circle.strokeColor ?? "#10B981",
          strokeWeight: circle.strokeWidth ?? 2,
          fillColor: circle.fillColor ?? "#10B981",
          fillOpacity: 0.15,
          map,
        })
      })

      if (polyline.length > 1) {
        new window.AMap!.Polyline({
          path: polyline.map(({ latitude, longitude }) => [longitude, latitude]),
          strokeColor: "#10B981",
          strokeWeight: 5,
          map,
        })
      }
    }, [circles, mapReady, markers, polyline])

    if (Platform.OS !== "web") return null

    return (
      <View style={[styles.container, style]}>
        <div ref={containerRef} style={mapSurfaceStyle} aria-label="高德地图" />
        {loadError ? (
          <View style={styles.errorOverlay}>
            <Text text={loadError} style={styles.errorText} />
          </View>
        ) : null}
      </View>
    )
  },
)

const mapSurfaceStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  minHeight: 120,
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F1F5F9",
  },
  errorText: {
    color: "#64748B",
    textAlign: "center",
  },
})
