import "@expo/metro-runtime";
import { registerRootComponent } from "expo";
import 'react-native-get-random-values';
import './src/leancloud';

import { App } from "@/app";
registerRootComponent(App);
