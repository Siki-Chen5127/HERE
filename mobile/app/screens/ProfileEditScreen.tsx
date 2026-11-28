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

import { db } from "../services/database/db"
import { BirthdaySelect, ProfileSelect, type ProfileOption } from "./ProfileSelectors"
import { birthdayAge } from "@/utils/birthday"

import { Screen } from "../components/Screen"
import { Text } from "../components/Text"
import { getHereApiErrorMessage, mobileApi, studentAuthApi } from "../services/hereApi"
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

const genderChoices = ["男", "女", "其他", "不愿透露"]
const bloodChoices = ["A型", "B型", "AB型", "O型", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "未知"]
const optionsFor = (items: string[], current: string, optional = false): ProfileOption[] => [
  ...(optional ? [{ value: "", label: "不填写" }] : []),
  ...[...new Set([current, ...items].filter(Boolean))].map(value => ({ value, label: value })),
]

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
  picker?: React.ReactNode
  maxLength?: number
  testID?: string
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
  fallbackText = '未填写',
  picker,
  maxLength,
  testID,
}) => {
  const showInput = isEditing && editable

  return (
    <View style={[$styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
      <Text style={$styles.label} text={label} />
      {showInput ? (
        picker ?? <TextInput
          style={$styles.inputEditing}
          testID={testID}
          maxLength={maxLength}
          accessibilityLabel={label}
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
    studentNumber: '',
    className: '',
    gender: '',
    age: '',
    birthday: '',
    phone: '',
    bloodType: '',
    allergy: '',
    medicalHistory: '',
  })
  
  const [initialLoading, setInitialLoading] = useState(true)
  const [colleges, setColleges] = useState<string[]>([])
  const [collegeLoading, setCollegeLoading] = useState(false)
  const [collegeError, setCollegeError] = useState("")
  const [collegeRetry, setCollegeRetry] = useState(0)

  useEffect(() => {
    void fetchUserData()
  }, [])

  useEffect(() => {
    if (!isEditing) return
    let active = true
    setCollegeLoading(true)
    setCollegeError("")
    studentAuthApi.getRegistrationColleges()
      .then(({ colleges: available }) => {
        if (!active) return
        setColleges(available)
        if (!available.length) setCollegeError("暂无可选学院")
      })
      .catch(error => {
        if (active) {
          setColleges([])
          setCollegeError(getHereApiErrorMessage(error, "学院列表加载失败"))
        }
      })
      .finally(() => { if (active) setCollegeLoading(false) })
    return () => { active = false }
  }, [isEditing, collegeRetry])

  const fetchUserData = async () => {
    try {
      const user = usersRepository.getActiveUser()
      if (user) {
        setFormData({
          realName: user.realName || '',
          college: user.college || '',
          studentNumber: '',
          className: '',
          gender: user.gender || '',
          age: user.age ? String(user.age) : '',
          birthday: user.birthday || '',
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
        studentNumber: profile.studentNumber ?? "",
        className: profile.className ?? "",
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
    const calculatedAge = birthdayAge(formData.birthday)
    if (formData.birthday && calculatedAge === null) {
      Alert.alert("请检查输入", "请选择有效的出生日期")
      return
    }
    setLoading(true)
    try {
      const user = usersRepository.getActiveUser()
      if (user) {
        await mobileApi.updateProfile({
          display_name: formData.realName.trim(),
          college: formData.college.trim(),
          student_number: formData.studentNumber.trim() || null,
          class_name: formData.className.trim() || null,
        })
        db.runSync(
          `UPDATE users SET realName = ?, college = ?, gender = ?, age = ?, birthday = ?, bloodType = ?, allergy = ?, medicalHistory = ? WHERE id = ?`,
          formData.realName.trim(),
          formData.college.trim(),
          formData.gender,
          calculatedAge === null ? formData.age : String(calculatedAge),
          formData.birthday,
          formData.bloodType,
          formData.allergy,
          formData.medicalHistory,
          user.id
        )
        feedback.success("保存成功", "姓名、学院、学号和班级已同步到后台；生日、性别及医疗资料保存在本机")
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

  const calculatedAge = birthdayAge(formData.birthday)
  const ageDisplay = calculatedAge === null
    ? (formData.age ? formData.age + " 岁（原记录）" : "选择生日后计算")
    : calculatedAge + " 周岁"

  return (
    <Screen 
      preset="fixed" 
      safeAreaEdges={['top']}
      style={$styles.screen}
      contentContainerStyle={$styles.screenContent}
      KeyboardAvoidingViewProps={{ style: $styles.keyboardContainer }}
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
          testID="profile-edit-toggle"
          accessibilityRole="button"
          disabled={loading || initialLoading}
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
          testID="profile-scroll"
          style={$styles.scrollArea}
          contentContainerStyle={[$styles.content, desktop && $styles.wideContent]}
          showsVerticalScrollIndicator={Platform.OS === "web"}
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
                isEditing={isEditing}
                picker={<ProfileSelect testID="profile-college" label="所属学院" value={formData.college}
                  options={optionsFor(colleges, formData.college)} placeholder={collegeLoading ? "正在加载…" : "请选择学院"}
                  disabled={loading || collegeLoading || !colleges.length} style={$styles.selectField}
                  onChange={(value) => updateField("college", value)} />}
              />
              <InfoRow label="学号" value={formData.studentNumber} isEditing={isEditing}
                testID="profile-student-number" maxLength={64}
                placeholder="请输入学号" onChangeText={(value) => updateField("studentNumber", value)} />
              <InfoRow label="班级" value={formData.className} isEditing={isEditing}
                testID="profile-class-name" maxLength={100}
                placeholder="请输入班级" onChangeText={(value) => updateField("className", value)} />
              {isEditing && !!collegeError && (
                <TouchableOpacity accessibilityRole="button" onPress={() => setCollegeRetry(value => value + 1)}>
                  <Text text={collegeError + "，点击重试"} style={$styles.selectionError} />
                </TouchableOpacity>
              )}
              <InfoRow
                label="性别"
                value={formData.gender}
                isEditing={isEditing}
                picker={<ProfileSelect testID="profile-gender" label="性别" value={formData.gender}
                  options={optionsFor(genderChoices, formData.gender, true)}
                  disabled={loading} style={$styles.selectField}
                  onChange={(value) => updateField("gender", value)} />}
              />
              <InfoRow
                label="生日"
                value={formData.birthday}
                isEditing={isEditing}
                picker={<BirthdaySelect testID="profile-birthday" label="生日" value={formData.birthday}
                  disabled={loading} style={$styles.selectField}
                  onChange={(value) => setFormData(previous => ({
                    ...previous, birthday: value, age: value ? previous.age : "",
                  }))} />}
              />
              <InfoRow label="年龄" value={ageDisplay} isEditing={isEditing} editable={false} />
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
                  <ProfileSelect testID="profile-blood-type" label="血型" value={formData.bloodType}
                    options={optionsFor(bloodChoices, formData.bloodType, true)} placeholder="请选择"
                    disabled={loading} style={$styles.gridSelect}
                    onChange={(value) => updateField("bloodType", value)} />
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
                <Text text="姓名、所属学院、学号和班级会同步到后台。生日、性别及医疗急救信息保存在当前设备。" style={$styles.scopeText} />
              </View>
              <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate("Contacts")} style={$styles.relatedLink}>
                <Text text="管理紧急联系人 →" style={$styles.editBtnText} />
              </TouchableOpacity>
            </View>
          )}

          {isEditing && (
            <View style={$styles.footerAction}>
              <TouchableOpacity 
                testID="profile-save"
                accessibilityRole="button"
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
  screen: { flex: 1, minHeight: 0, backgroundColor: COLORS.bg } as ViewStyle,
  screenContent: { flex: 1, minHeight: 0 } as ViewStyle,
  keyboardContainer: { flex: 1, minHeight: 0 } as ViewStyle,
  scrollArea: { flex: 1, minHeight: 0 } as ViewStyle,
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
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
  selectField: { width: "54%", minWidth: 0 },
  gridSelect: { width: "100%", backgroundColor: COLORS.white, borderColor: COLORS.red100 },
  selectionError: { color: COLORS.red500, fontSize: 12, lineHeight: 19, textAlign: "right", paddingVertical: 4 },
  
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
