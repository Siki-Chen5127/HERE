import AV from "leancloud-storage/core";
import * as adapters from "@leancloud/platform-adapters-react-native";

AV.setAdapters(adapters);

// --- 初始化 LeanCloud ---
AV.init({
  appId: "0m5HgXwHNjbrLxC3DKOxgQom-gzGzoHsz",
  appKey: "pglFnDkid00IbYEf03SFL2Oh",
  serverURLs: "https://0m5hgxwh.lc-cn-n1-shared.com",
});

console.log("[LeanCloud] SDK initialized (with RN Adapters)");

export default AV;