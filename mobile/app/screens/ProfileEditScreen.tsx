import { Alert, feedback } from "@/components/Feedback"
import React, { FC, useEffect, useState } from "react"
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Platform,
} from "react-native"

// 🟢 2. 引入本地 SQLite
import * as SQLite from 'expo-sqlite'

import { Screen } from "../components/Screen"
import { Text } from "../components/Text"
import { getHereApiErrorMessage, mobileApi } from "../services/hereApi"
import { usersRepository } from "../services/database/repositories"
import { studentFrame, studentUi as ui } from "@/theme/studentUi"
import { useViewport } from "@/utils/useViewport"

const COLORS = {
  primary: ui.primary,
  primaryDark: ui.primary,
  bg: ui.canvas,
  white: ui.surface,
  textMain: ui.ink,
  textSub: ui.muted,
  textPlaceholder: ui.muted,
  border: ui.line,
  inputBg: ui.wash,
  red500: ui.danger,
  red50: ui.dangerSurface,
  red100: "#edd6ca",
}

// 🟢 3. 打开数据库连接
const db = SQLite.openDatabaseSync('assignment.db')

interface InfoRowProps {
  label: string
  value: string
  placeholder?: string
  isLast?: boolean
  isEditing: boolean
  editable?: boolean 
  keyboardType?: 'default' | 'numeric' | 'phone-pad'
  onChangeText?: (text: string) => void
  fallbackText?: string 
}

const InfoRow: FC<InfoRowProps> = ({ 
  label, 
  value, 
  placeholder, 
  isLast, 
  isEditing, 
  editable = true,
  keyboardType = 'default', 
  onChangeText,
  fallbackText = '未填写'
}) => {
  const showInput = isEditing && editable

  return (
    <View style={[$styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
      <Text style={$styles.label} text={label} />
      {showInput ? (
        <TextInput
          style={$styles.inputEditing}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textPlaceholder}
          textAlign="right"
          keyboardType={keyboardType}
          autoCorrect={false}
        />
      ) : (
        <Text 
          style={[$styles.value, !value && { color: COLORS.textPlaceholder }]} 
          text={value || fallbackText} 
        />
      )}
    </View>
  )
}

export const ProfileEditScreen: FC<any> = ({ navigation }) => {
  const { width, fontScale } = useViewport()
  const desktop = width >= 900 && fontScale < 1.3
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  const [formData, setFormData] = useState({
    realName: '',
    college: '',
    gender: '',
    age: '',
    phone: '',
    bloodType: '',
    allergy: '',
    medicalHistory: '',
  })
  
  const [initialLoading, setInitialLoading] = useState(true)

  // 🟢 4. 初始化：安全地补齐所有新增的字段
  useEffect(() => {
    try {
      const columns = ['realName', 'college', 'gender', 'age', 'bloodType', 'allergy', 'medicalHistory'];
      for (const col of columns) {
        try { 
          db.execSync(`ALTER TABLE users ADD COLUMN ${col} TEXT;`); 
        } catch (e) {
          // 列已存在时直接忽略
        }
      }
    } catch (e) {
      console.log("表字段检查失败", e);
    }
    
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const user = usersRepository.getActiveUser()
      if (user) {
        setFormData({
          realName: user.realName || '',
          college: user.college || '',
          gender: user.gender || '',
          age: user.age ? String(user.age) : '',
          phone: user.phone || '', // 电话是从初始注册时就有的
          bloodType: user.bloodType || '',
          allergy: user.allergy || '',
          medicalHistory: user.medicalHistory || '',
        })
      }
      const profile = await mobileApi.getProfile()
      setFormData((current) => ({
        ...current,
        realName: profile.displayName || current.realName,
        college: profile.college || current.college,
        phone: profile.phone || current.phone,
      }))
      if (user) {
        db.runSync(
          'UPDATE users SET realName = ?, college = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
          profile.displayName,
          profile.college,
          user.id,
        )
      }
    } catch (e) {
      console.error("获取档案失败", e)
    } finally {
      setInitialLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.realName.trim() || !formData.college.trim()) {
      Alert.alert("请检查输入", "姓名和所属学院为必填项")
      return
    }
    setLoading(true)
    try {
      const user = usersRepository.getActiveUser()
      if (user) {
        await mobileApi.updateProfile({
          display_name: formData.realName.trim(),
          college: formData.college.trim(),
        })
        db.runSync(
          `UPDATE users SET realName = ?, college = ?, gender = ?, age = ?, bloodType = ?, allergy = ?, medicalHistory = ? WHERE id = ?`,
          formData.realName.trim(),
          formData.college.trim(),
          formData.gender,
          formData.age,
          formData.bloodType,
          formData.allergy,
          formData.medicalHistory,
          user.id
        )
        feedback.success("保存成功", "姓名和学院已同步到统一后台，其他健康资料保存在本机")
        setIsEditing(false)
      } else {
        Alert.alert("保存失败", "未找到当前用户信息")
      }
    } catch (e: unknown) {
      Alert.alert("保存失败", getHereApiErrorMessage(e, "档案保存失败"))
    } finally {
      setLoading(false)
    }
  }

  const updateField = (key: keyof typeof formData, val: string) => {
    setFormData(prev => ({ ...prev, [key]: val }))
  }

  // --- UI 部分保持完全不变 ---
  return (
    <Screen 
      preset="fixed" 
      safeAreaEdges={['top']}
      style={$styles.screen}
      backgroundColor={COLORS.bg}
    >
      <View style={[$styles.header, desktop && $styles.desktopHeader]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={$styles.iconBtn}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 24, lineHeight: 28, color: COLORS.textMain }}>←</Text>
        </TouchableOpacity>
        
        <Text style={[$styles.headerTitle, desktop && $styles.desktopTitle]} text={isEditing ? "编辑个人档案" : "个人档案"} />
        
        <TouchableOpacity 
          style={$styles.editBtnContainer} 
          activeOpacity={0.7}
          onPress={() => {
            if (isEditing) {
              fetchUserData() // 取消时重置数据
              setIsEditing(false)
            } else {
              setIsEditing(true)
            }
          }}
        >
          <Text 
            style={[$styles.editBtnText, isEditing && { color: COLORS.textSub }]} 
            text={isEditing ? "取消" : "编辑"} 
          />
        </TouchableOpacity>
      </View>

      {initialLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text text="正在加载档案..." style={{ marginTop: 12, color: COLORS.textSub }} />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={[$styles.content, desktop && $styles.wideContent]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled" 
        >
          {isEditing && (
            <View style={$styles.editTip}>
              <Text style={$styles.editTipText} text="编辑完成后，点击下方保存。" />
            </View>
          )}

          <View style={desktop && $styles.columns}>
          <View style={[$styles.card, desktop && $styles.basicColumn]}>
            <View style={$styles.cardHeader}>
               <View style={$styles.blueBar} />
               <Text style={$styles.sectionHeader} text="基本信息" />
            </View>
            
            <View style={$styles.cardBody}>
              <InfoRow 
                label="真实姓名" 
                value={formData.realName} 
                onChangeText={(t) => updateField('realName', t)}
                isEditing={isEditing}
                placeholder="请输入姓名" 
              />
              <InfoRow
                label="所属学院"
                value={formData.college}
                onChangeText={(t) => updateField('college', t)}
                isEditing={isEditing}
                placeholder="例如：管理学院"
              />
              <InfoRow 
                label="性别" 
                value={formData.gender} 
                onChangeText={(t) => updateField('gender', t)}
                isEditing={isEditing}
                placeholder="男 / 女" 
              />
              <InfoRow 
                label="年龄" 
                value={formData.age} 
                onChangeText={(t) => updateField('age', t)}
                isEditing={isEditing}
                placeholder="例如: 25" 
                keyboardType="numeric" 
              />
              <InfoRow 
                label="手机号码" 
                value={formData.phone} 
                isEditing={isEditing}
                editable={false}
                fallbackText="未绑定"
                isLast
              />
            </View>
          </View>

          <View style={[$styles.card, $styles.medicalCardContainer, desktop && $styles.medicalColumn]}>
            <View style={$styles.medicalHeader}>
              <Text style={$styles.medicalTitle} text="医疗急救卡" />
              <Text style={$styles.medicalSubtitle} text="紧急时刻的关键信息" />
            </View>
            
            <View style={$styles.gridContainer}>
              <View style={$styles.gridItem}>
                <Text style={$styles.gridLabel} text="血型" />
                {isEditing ? (
                  <TextInput
                    style={$styles.gridInputEditing}
                    value={formData.bloodType}
                    onChangeText={(t) => updateField('bloodType', t)}
                    placeholder="如 AB+"
                    placeholderTextColor={COLORS.red100}
                    textAlign="center"
                    autoCorrect={false}
                  />
                ) : (
                  <Text style={$styles.gridValue} text={formData.bloodType || '未知'} />
                )}
              </View>
              
              <View style={$styles.gridItem}>
                <Text style={$styles.gridLabel} text="药物过敏" />
                {isEditing ? (
                  <TextInput
                    style={$styles.gridInputEditing}
                    value={formData.allergy}
                    onChangeText={(t) => updateField('allergy', t)}
                    placeholder="无"
                    placeholderTextColor={COLORS.red100}
                    textAlign="center"
                    autoCorrect={false}
                  />
                ) : (
                  <Text style={$styles.gridValue} text={formData.allergy || '无'} />
                )}
              </View>
            </View>

            <View style={$styles.historyContainer}>
              <Text style={$styles.historyLabel} text="既往病史 / 备注 :" />
              {isEditing ? (
                <TextInput
                  style={$styles.historyInputEditing}
                  value={formData.medicalHistory}
                  onChangeText={(t) => updateField('medicalHistory', t)}
                  placeholder="例如: 哮喘、心脏病史、常备药..."
                  placeholderTextColor={COLORS.textPlaceholder}
                  multiline
                  textAlignVertical="top"
                />
              ) : (
                <View style={$styles.historyValueContainer}>
                  <Text 
                    style={[$styles.historyValue, !formData.medicalHistory && { color: COLORS.textSub, fontStyle: 'italic' }]} 
                    text={formData.medicalHistory || "暂无记录"} 
                  />
                </View>
              )}
            </View>
          </View>
          </View>

          {desktop && !isEditing && (
            <View style={$styles.related}>
              <View style={$styles.relatedCopy}>
                <Text text="档案保存范围" style={$styles.sectionHeader} />
                <Text text="姓名和所属学院会同步到后台。医疗急救信息保存在当前设备。" style={$styles.scopeText} />
              </View>
              <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate("Contacts")} style={$styles.relatedLink}>
                <Text text="管理紧急联系人 →" style={$styles.editBtnText} />
              </TouchableOpacity>
            </View>
          )}

          {isEditing && (
            <View style={$styles.footerAction}>
              <TouchableOpacity 
                style={[$styles.saveBtn, loading && { opacity: 0.8 }]}
                onPress={handleSave}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={$styles.saveBtnText} text="保存所有修改"
                  numberOfLines={1}
                  adjustsFontSizeToFit />
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </Screen>
  )
}

const $styles = StyleSheet.create({
  wideContent: { ...studentFrame, paddingHorizontal: 34, paddingTop: 31 },
  desktopHeader: { ...studentFrame, backgroundColor: ui.canvas, paddingHorizontal: 34, paddingTop: 19, shadowOpacity: 0, elevation: 0 },
  desktopTitle: { flex: 1, fontSize: 26, paddingLeft: 12 },
  columns: { flexDirection: "row", alignItems: "flex-start", gap: 24 },
  basicColumn: { flex: 1, minWidth: 0 },
  medicalColumn: { flex: 1.2, minWidth: 0 },
  related: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: ui.line, paddingVertical: 23, marginTop: 12 },
  relatedCopy: { flex: 1 },
  relatedLink: { minHeight: 44, paddingHorizontal: 12, justifyContent: "center" },
  scopeText: { color: ui.muted, fontSize: 14, lineHeight: 24, marginTop: 8 },
  screen: { flex: 1, backgroundColor: COLORS.bg } as ViewStyle,
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, elevation: 2, 
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05,
    shadowRadius: 2, zIndex: 10,
  } as ViewStyle,
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textMain } as TextStyle,
  iconBtn: { padding: 8, width: 44, alignItems: 'flex-start' } as ViewStyle,
  editBtnContainer: { padding: 8, width: 60, alignItems: 'flex-end' } as ViewStyle,
  editBtnText: { fontSize: 15, color: COLORS.primary, fontWeight: '600' } as TextStyle,

  content: { padding: 20, paddingBottom: 40 } as ViewStyle,
  editTip: {
    backgroundColor: '#ECFDF5', padding: 10, borderRadius: 8, marginBottom: 16,
    borderWidth: 1, borderColor: '#A7F3D0',
  } as ViewStyle,
  editTipText: { fontSize: 13, color: '#047857', textAlign: 'center' } as TextStyle,

  card: {
    backgroundColor: COLORS.white, borderRadius: ui.radius.surface, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: ui.line,
  } as ViewStyle,
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 } as ViewStyle,
  blueBar: { width: 4, height: 14, backgroundColor: COLORS.primary, borderRadius: 2, marginRight: 8 } as ViewStyle,
  sectionHeader: { fontSize: 15, fontWeight: '700', color: COLORS.textMain } as TextStyle,
  cardBody: {} as ViewStyle,

  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.bg,
  } as ViewStyle,
  label: { color: COLORS.textSub, fontSize: 15 } as TextStyle,
  value: { color: COLORS.textMain, fontWeight: '500', fontSize: 15, maxWidth: '60%', textAlign: 'right' } as TextStyle,
  
  inputEditing: { 
    color: COLORS.textMain, fontWeight: '500', fontSize: 15, minWidth: 120,
    paddingVertical: 8, paddingHorizontal: 12, backgroundColor: COLORS.inputBg,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
  } as TextStyle,

  medicalCardContainer: { backgroundColor: ui.surface, overflow: "hidden" } as ViewStyle,
  medicalHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1,
    borderBottomColor: COLORS.red50, paddingBottom: 12,
  } as ViewStyle,
  medicalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textMain, marginLeft: 8, marginRight: 8 } as TextStyle,
  medicalSubtitle: { fontSize: 12, color: COLORS.textSub, fontWeight: '400' } as TextStyle,

  gridContainer: { flexDirection: 'row', gap: 12, marginBottom: 20 } as ViewStyle,
  gridItem: {
    flex: 1, backgroundColor: COLORS.red50, padding: 16, borderRadius: ui.radius.nested,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.red100,
  } as ViewStyle,
  gridLabel: { fontSize: 13, color: COLORS.textSub, marginBottom: 8 } as TextStyle,
  gridValue: { fontSize: 20, fontWeight: '800', color: COLORS.red500 } as TextStyle,
  gridInputEditing: {
    fontSize: 18, fontWeight: 'bold', color: COLORS.red500, textAlign: 'center',
    padding: 4, width: '100%', backgroundColor: COLORS.white, borderRadius: 6,
  } as TextStyle,

  historyContainer: { marginTop: 0 } as ViewStyle,
  historyLabel: { color: COLORS.textMain, fontSize: 14, fontWeight: '600', marginBottom: 8 } as TextStyle,
  historyValueContainer: { backgroundColor: COLORS.bg, padding: 12, borderRadius: 8, minHeight: 60 } as ViewStyle,
  historyValue: { color: COLORS.textMain, fontSize: 14, lineHeight: 20 } as TextStyle,
  historyInputEditing: {
    backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, padding: 12, fontSize: 14, color: COLORS.textMain,
    minHeight: 80, textAlignVertical: 'top',
  } as TextStyle,

  footerAction: { marginTop: 10 } as ViewStyle,
  saveBtn: {
    backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 30, alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3,
    shadowRadius: 8, elevation: 4,
  } as ViewStyle,
  saveBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16, letterSpacing: 1 } as TextStyle,
})
