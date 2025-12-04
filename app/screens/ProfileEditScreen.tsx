import React, { FC, useEffect, useState } from "react"
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native"
import AV from "leancloud-storage/core"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"

// --- 颜色配置 (复刻 HTML Tailwind 样式) ---
const COLORS = {
  primary: '#10B981', // text-primary
  bg: '#F9FAFB',      // bg-gray-50
  white: '#FFFFFF',
  textMain: '#1F2937', // text-dark
  textSub: '#6B7280',  // text-gray-500
  textLight: '#9CA3AF', // text-gray-400
  border: '#F3F4F6',   // border-gray-100
  red400: '#F87171',   // text-red-400 / border-red-400
  red50: '#FEF2F2',    // bg-red-50
}

export const ProfileEditScreen: FC<any> = ({ navigation }) => {
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  // 表单数据
  const [formData, setFormData] = useState({
    realName: '加载中...',
    gender: '-',
    age: '-',
    phone: '-',
    bloodType: '-',
    allergy: '无',
    medicalHistory: '无',
  })

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const user = await AV.User.currentAsync()
      if (user) {
        await user.fetch()
        setFormData({
          realName: user.get('realName') || user.getUsername() || '',
          gender: user.get('gender') || '保密',
          age: user.get('age') || '',
          phone: user.getMobilePhoneNumber() || '',
          bloodType: user.get('bloodType') || '未知',
          allergy: user.get('allergy') || '无',
          medicalHistory: user.get('medicalHistory') || '无',
        })
      }
    } catch (e) {
      console.error("获取档案失败", e)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const user = await AV.User.currentAsync()
      if (user) {
        // 更新字段
        user.set('realName', formData.realName)
        user.set('gender', formData.gender)
        user.set('age', formData.age)
        user.set('bloodType', formData.bloodType)
        user.set('allergy', formData.allergy)
        user.set('medicalHistory', formData.medicalHistory)
        
        await user.save()
        Alert.alert("成功", "个人档案已更新")
        setIsEditing(false)
      }
    } catch (e: any) {
      Alert.alert("保存失败", e.message || "请检查网络")
    } finally {
      setLoading(false)
    }
  }

  // 渲染表单行 (支持展示模式和编辑模式)
  const RenderInfoRow = ({ label, fieldKey, placeholder, isLast }: any) => {
    const value = formData[fieldKey as keyof typeof formData]
    
    return (
      <View style={[$styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
        <Text style={$styles.label} text={label} />
        {isEditing && fieldKey !== 'phone' ? (
          <TextInput
            style={$styles.input}
            value={value}
            onChangeText={(text) => setFormData(prev => ({ ...prev, [fieldKey]: text }))}
            placeholder={placeholder}
            textAlign="right"
          />
        ) : (
          <Text style={$styles.value} text={value} />
        )}
      </View>
    )
  }

  return (
    <Screen 
      preset="fixed" 
      safeAreaEdges={['top']}
      style={$styles.screen}
      backgroundColor={COLORS.bg}
    >
      {/* Header */}
      <View style={$styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Text style={{ fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={$styles.headerTitle} text={isEditing ? "编辑档案" : "个人档案"} />
        
        {/* 右上角按钮：编辑 / 取消 */}
        <TouchableOpacity 
          style={{ padding: 8 }} 
          onPress={() => {
            if (isEditing) {
              // 取消编辑，重置数据
              fetchUserData() 
              setIsEditing(false)
            } else {
              setIsEditing(true)
            }
          }}
        >
          <Text 
            style={[$styles.editBtn, isEditing && { color: COLORS.textSub }]} 
            text={isEditing ? "取消" : "编辑"} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={$styles.content}>
        
        {/* 卡片 1: 基本信息 */}
        <View style={$styles.card}>
          <Text style={$styles.sectionHeader} text="基本信息" />
          <View style={$styles.cardBody}>
            <RenderInfoRow label="姓名" fieldKey="realName" placeholder="您的真实姓名" />
            <RenderInfoRow label="性别" fieldKey="gender" placeholder="男/女" />
            <RenderInfoRow label="年龄" fieldKey="age" placeholder="例如: 22岁" />
            <RenderInfoRow label="电话" fieldKey="phone" isLast />
          </View>
        </View>

        {/* 卡片 2: 医疗急救卡 (红色左边框) */}
        <View style={[$styles.card, $styles.medicalCard]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 16, marginRight: 6 }}>💓</Text>
            <Text style={$styles.medicalTitle} text="医疗急救卡" />
          </View>
          
          {/* 血型 & 过敏 (Grid) */}
          <View style={$styles.grid}>
            {/* 血型 */}
            <View style={$styles.gridItem}>
              <Text style={$styles.gridLabel} text="血型" />
              {isEditing ? (
                <TextInput
                  style={$styles.gridInput}
                  value={formData.bloodType}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, bloodType: text }))}
                  placeholder="AB+"
                />
              ) : (
                <Text style={$styles.gridValue} text={formData.bloodType} />
              )}
            </View>
            
            {/* 药物过敏 */}
            <View style={$styles.gridItem}>
              <Text style={$styles.gridLabel} text="药物过敏" />
              {isEditing ? (
                <TextInput
                  style={$styles.gridInput}
                  value={formData.allergy}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, allergy: text }))}
                  placeholder="无"
                />
              ) : (
                <Text style={$styles.gridValue} text={formData.allergy} />
              )}
            </View>
          </View>

          {/* 既往病史 */}
          <View style={{ marginTop: 12 }}>
            <Text style={$styles.historyLabel} text="既往病史:" />
            {isEditing ? (
              <TextInput
                style={[$styles.input, { textAlign: 'left', backgroundColor: COLORS.white, padding: 8, marginTop: 4, borderRadius: 8 }]}
                value={formData.medicalHistory}
                onChangeText={(text) => setFormData(prev => ({ ...prev, medicalHistory: text }))}
                placeholder="例如: 轻微哮喘..."
                multiline
              />
            ) : (
              <Text style={$styles.historyValue} text={formData.medicalHistory} />
            )}
          </View>
        </View>

        {/* 保存按钮 (仅编辑模式显示) */}
        {isEditing && (
          <TouchableOpacity 
            style={[$styles.saveBtn, loading && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={$styles.saveBtnText} text="保存档案" />
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  )
}

const $styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg } as ViewStyle,
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  } as ViewStyle,
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textMain } as TextStyle,
  editBtn: { fontSize: 14, color: COLORS.primary, fontWeight: '600' } as TextStyle,

  content: { padding: 24 } as ViewStyle,

  // 通用卡片
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  } as ViewStyle,

  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    marginBottom: 16,
  } as TextStyle,

  cardBody: {
    // space-y-4 logic handled by items
  } as ViewStyle,

  // 信息行
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg,
  } as ViewStyle,
  label: { color: COLORS.textSub, fontSize: 14 } as TextStyle,
  value: { color: COLORS.textMain, fontWeight: '500', fontSize: 14 } as TextStyle,
  input: { 
    color: COLORS.textMain, 
    fontWeight: '500', 
    fontSize: 14, 
    minWidth: 100,
    padding: 0 
  } as TextStyle,

  // 医疗卡片特殊样式
  medicalCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.red400,
  } as ViewStyle,
  medicalTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.red400,
    textTransform: 'uppercase',
  } as TextStyle,

  // Grid
  grid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  } as ViewStyle,
  gridItem: {
    flex: 1,
    backgroundColor: COLORS.red50,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  } as ViewStyle,
  gridLabel: { fontSize: 12, color: COLORS.textSub, marginBottom: 4 } as TextStyle,
  gridValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.textMain } as TextStyle,
  gridInput: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: COLORS.textMain, 
    textAlign: 'center',
    padding: 0,
    width: '100%'
  } as TextStyle,

  historyLabel: { color: COLORS.textSub, fontSize: 14, marginBottom: 4 } as TextStyle,
  historyValue: { color: COLORS.textMain, fontSize: 14 } as TextStyle,

  // Save Button
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  } as ViewStyle,
  saveBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 } as TextStyle,
})