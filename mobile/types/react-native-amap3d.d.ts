declare module "react-native-amap3d" {
  import * as React from "react"
  import { ViewProps } from "react-native"

  export const AMapSdk: {
    init(config?: unknown): void
  }

  export enum MapType {
    Standard = 0,
    Satellite = 1,
    Night = 2,
    Navi = 3,
    Bus = 4,
  }

  export type LatLng = { latitude: number; longitude: number }

  export type MapViewProps = ViewProps & {
    [key: string]: any
    mapType?: MapType
    initialCameraPosition?: unknown
    cameraPosition?: unknown
    zoomLevel?: number
    myLocationEnabled?: boolean
    myLocationButtonEnabled?: boolean
    showsCompass?: boolean
    showsScale?: boolean
    showsZoomControls?: boolean
    onPress?: (event: unknown) => void
  }

  export class MapView extends React.Component<MapViewProps> {
    moveCamera(cameraPosition: unknown, duration?: number): void
  }
  export const Marker: React.ComponentType<ViewProps & { [key: string]: any; position?: LatLng; title?: string; icon?: unknown }>
  export const Circle: React.ComponentType<ViewProps & { [key: string]: any; center?: LatLng; radius?: number; strokeWidth?: number; strokeColor?: string; fillColor?: string }>
  export const Polyline: React.ComponentType<ViewProps & { [key: string]: any; points?: LatLng[]; width?: number; color?: string }>
}
