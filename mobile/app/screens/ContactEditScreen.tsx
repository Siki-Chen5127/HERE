import { Alert, feedback } from "@/components/Feedback"
import React, { FC, useState, useEffect } from "react"
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Platform,
} from "react-native"

// 🟢 2. 引入本地 SQLite
import * as SQLite from 'expo-sqlite'

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { usersRepository } from "@/services/database/repositories"
import Feather from "@expo/vector-icons/Feather"
import { studentFrame, studentUi as ui } from "@/theme/studentUi"
import { useViewport } from "@/utils/useViewport"

const COLORS = {
  primary: ui.primary,
  bg: ui.canvas,
  white: ui.surface,
  textMain: ui.ink,
  textSub: ui.muted,
  border: ui.line,
  red: ui.danger,
  inputBg: ui.wash,
}

// 🟢 3. 打开数据库连接
const db = SQLite.openDatabaseSync('assignment.db')

export const ContactEditScreen: FC<any> = ({ navigation, route }) => {
  const { width, fontScale } = useViewport()
  const desktop = width >= 900 && fontScale < 1.3
  const { contactId, initialName, initialPhone } = route.params || {}
  const isEditMode = !!contactId

  const [name, setName] = useState(initialName || "")
  const [phone, setPhone] = useState(initialPhone || "")
  const [loading, setLoading] = useState(false)

  // 🟢 4. 获取当前用户的本地 ID
  const getActiveUserId = () => {
    const activeUser = usersRepository.getActiveUser()
    if (!activeUser) throw new Error("未找到当前登录用户")
    return String(activeUser.id)
  }

  // 🟢 5. 初始化并加固数据库表结构
  useEffect(() => {
    try {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS EmergencyContact (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ownerId TEXT,
          name TEXT,
          phone TEXT
        );
      `);
      // 容错处理：确保 name 字段存在（如果之前的建表语句遗漏了）
      try { db.execSync("ALTER TABLE EmergencyContact ADD COLUMN name TEXT;"); } catch (e) {}
    } catch (e) {
      console.log("联系人表结构检查失败", e)
    }
  }, [])

  const handleSave = () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert(" 提示", "请填写完整的称呼和电话号码，这对我们在紧急时刻联系他们很重要。")
      return
    }

    setLoading(true)
    try {
      const ownerId = getActiveUserId()

      if (isEditMode) {
        // 🟢 6. 更新本地数据
        db.runSync(
          'UPDATE EmergencyContact SET name = ?, phone = ? WHERE id = ? AND ownerId = ?',
          name, phone, Number(contactId), ownerId
        )
      } else {
        // 🟢 7. 插入新联系人到本地
        db.runSync(
          'INSERT INTO EmergencyContact (ownerId, name, phone) VALUES (?, ?, ?)',
          ownerId, name, phone
        )
      }

      navigation.goBack()
      feedback.success("联系人已保存")
    } catch (error: any) {
      console.error("保存失败", error)
      Alert.alert("保存遇到一点问题", "本地数据库存储失败，请重试。")
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
        onPress: () => {
          setLoading(true)
          try {
            // 🟢 8. 从本地数据库删除记录
            const ownerId = getActiveUserId()
            db.runSync(
              'DELETE FROM EmergencyContact WHERE id = ? AND ownerId = ?',
              Number(contactId),
              ownerId,
            )
            navigation.goBack()
            feedback.success("联系人已移除")
          } catch (error: any) {
            Alert.alert("删除失败", "无法从设备移除该记录。")
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

      <View style={[styles.content, desktop && styles.desktopForm]}>
        <View style={[styles.helpPanel, desktop && styles.desktopHelp]}>
          <Text style={styles.helperText} text="在报平安或紧急求助时，可以选择联系此人。" />
        </View>
        <View style={desktop && styles.fields}>

        {/* 更加圆润的表单卡片 */}
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label} text="称呼 (例如: 妈妈)" />
            <View style={styles.inputContainer}>
              <Feather name="user" size={18} color={ui.muted} style={{ marginRight: 8 }} />
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
              <Feather name="phone" size={18} color={ui.muted} style={{ marginRight: 8 }} />
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
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  desktopForm: { ...studentFrame, flexDirection: "row-reverse", alignItems: "flex-start", gap: 25 },
  helpPanel: { borderRadius: ui.radius.surface },
  desktopHelp: { width: 280, backgroundColor: ui.honey, padding: 18 },
  fields: { flex: 1, minWidth: 0 },
  screen: { flex: 1, backgroundColor: COLORS.bg },
  
  // Header 布局优化
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.bg, 
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
    borderRadius: ui.radius.surface,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, 
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
    borderRadius: ui.radius.field,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 4, 
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
    borderRadius: 30, 
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, 
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
