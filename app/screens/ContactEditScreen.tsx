import React, { FC, useState } from "react"
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Platform,
} from "react-native"
import AV from "leancloud-storage/core"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"

const COLORS = {
  primary: '#10B981', // 温暖的绿色
  bg: '#FAFAFA',      // 极浅的暖灰
  white: '#FFFFFF',
  textMain: '#374151', // 柔和的深灰
  textSub: '#9CA3AF',
  border: '#F3F4F6',
  red: '#EF4444',
  inputBg: '#F9FAFB',
}

export const ContactEditScreen: FC<any> = ({ navigation, route }) => {
  const { contactId, initialName, initialPhone } = route.params || {}
  const isEditMode = !!contactId

  const [name, setName] = useState(initialName || "")
  const [phone, setPhone] = useState(initialPhone || "")
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("❤️ 提示", "请填写完整的称呼和电话号码，这对我们在紧急时刻联系他们很重要。")
      return
    }

    setLoading(true)
    try {
      const currentUser = await AV.User.currentAsync()
      let contactObject

      if (isEditMode) {
        contactObject = AV.Object.createWithoutData('EmergencyContact', contactId)
      } else {
        contactObject = new AV.Object('EmergencyContact')
        const acl = new AV.ACL()
        acl.setPublicReadAccess(false)
        acl.setPublicWriteAccess(false)
        acl.setReadAccess(currentUser, true)
        acl.setWriteAccess(currentUser, true)
        contactObject.setACL(acl)
        contactObject.set('owner', currentUser)
      }

      contactObject.set('name', name)
      contactObject.set('phone', phone)

      await contactObject.save()
      
      Alert.alert("✅ 保存成功", "您的守护网络又多了一份力量。", [
        { text: "太好了", onPress: () => navigation.goBack() }
      ])
    } catch (error: any) {
      console.error("保存失败", error)
      Alert.alert("保存遇到一点问题", "请检查网络连接后再试一次。")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = () => {
    Alert.alert("确认移除", "移除后，紧急情况下将无法自动通知该联系人。", [
      { text: "我再想想", style: "cancel" },
      {
        text: "确认移除",
        style: "destructive",
        onPress: async () => {
          setLoading(true)
          try {
            const contactObject = AV.Object.createWithoutData('EmergencyContact', contactId)
            await contactObject.destroy()
            navigation.goBack()
          } catch (error: any) {
            Alert.alert("删除失败", error.message)
            setLoading(false)
          }
        }
      }
    ])
  }

  return (
    <Screen 
      preset="scroll" 
      safeAreaEdges={['top']}
      style={styles.screen}
      backgroundColor={COLORS.bg}

    >
      {/* 优化后的 Header：防截断布局 */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={{ fontSize: 20, color: COLORS.textMain }}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text 
            style={styles.headerTitle} 
            text={isEditMode ? "编辑紧急联系人" : "添加紧急联系人"} 
            numberOfLines={1} 
            adjustsFontSizeToFit 
          />
        </View>
        
        {/* 占位 View 保持标题居中 */}
        <View style={styles.backBtnPlaceholder} /> 
      </View>

      <View style={styles.content}>
        
        {/* 顶部提示语 */}
        <Text style={styles.helperText} text="我们会将您的位置和安全状态发送给他们。" />

        {/* 更加圆润的表单卡片 */}
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label} text="称呼 (例如: 妈妈)" />
            <View style={styles.inputContainer}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="请输入称呼"
                placeholderTextColor="#D1D5DB"
                value={name}
                onChangeText={setName}
                maxLength={10}
              />
            </View>
          </View>
          
          <View style={styles.spacer} />

          <View style={styles.inputGroup}>
            <Text style={styles.label} text="手机号码" />
            <View style={styles.inputContainer}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>📞</Text>
              <TextInput
                style={styles.input}
                placeholder="请输入11位手机号"
                placeholderTextColor="#D1D5DB"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>
          </View>
        </View>

        {/* 充满呼吸感的大按钮 */}
        <TouchableOpacity 
          style={[styles.saveBtn, loading && { opacity: 0.7 }]} 
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
             <Text 
              style={styles.saveBtnText} 
              text="保存守护者" 
              numberOfLines={1} 
              adjustsFontSizeToFit 
            />          )}
        </TouchableOpacity>

        {isEditMode && (
          <TouchableOpacity 
            style={styles.deleteBtn} 
            onPress={handleDelete}
            disabled={loading}
          >
            <Text style={styles.deleteBtnText} text="移除该联系人" />
          </TouchableOpacity>
        )}

      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  
  // Header 布局优化
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.bg, // 与背景融合，去掉分割线
  },
  backBtn: { width: 40 },
  backBtnPlaceholder: { width: 40 },
  titleContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textMain, textAlign: 'center' },

  content: { padding: 24 },

  helperText: {
    fontSize: 14,
    color: COLORS.textSub,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24, // 更大的圆角
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, // 柔和的下阴影
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 32,
  },

  inputGroup: { },
  label: { 
    fontSize: 13, 
    color: COLORS.textSub, 
    marginBottom: 8, 
    fontWeight: '600',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 16, // 输入框也是圆角
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 4, // 适配高度
  },
  input: { 
    flex: 1, 
    fontSize: 17, 
    color: COLORS.textMain, 
    fontWeight: '500',
    padding: 0, 
  },
  
  spacer: { height: 24 },

  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 30, // 全圆角按钮
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, // 绿色光晕
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  saveBtnText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },

  deleteBtn: { 
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteBtnText: { color: COLORS.red, fontSize: 15, fontWeight: '500', opacity: 0.8 },
})