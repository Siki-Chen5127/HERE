from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor


ROOT = Path(r"E:\PROJECT\here\Here")
WORK = ROOT / "report_work"
ASSETS = WORK / "assets"
OUTPUT = ROOT / "deliverables" / "HERE管理信息系统实训报告草稿.docx"
ASSETS.mkdir(parents=True, exist_ok=True)
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

FONT_REGULAR = r"C:\Windows\Fonts\simsun.ttc"
FONT_BOLD = r"C:\Windows\Fonts\simsun.ttc"
ACCENT = "138A72"
DARK = "132238"
MUTED = "52657A"
LIGHT = "EAF6F2"
BORDER = "B8C7D1"


def pil_font(size: int, bold: bool = False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)


def center_text(draw, box, text, font, fill="#000000", spacing=8):
    x1, y1, x2, y2 = box
    bbox = draw.multiline_textbbox((0, 0), text, font=font, spacing=spacing, align="center")
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.multiline_text(((x1 + x2 - w) / 2, (y1 + y2 - h) / 2), text, font=font, fill=fill, spacing=spacing, align="center")


def arrow(draw, start, end, fill="#5B7187", width=6):
    draw.line([start, end], fill=fill, width=width)
    x2, y2 = end
    x1, y1 = start
    dx, dy = x2 - x1, y2 - y1
    length = max((dx * dx + dy * dy) ** 0.5, 1)
    ux, uy = dx / length, dy / length
    px, py = -uy, ux
    size = 18
    p1 = (x2, y2)
    p2 = (x2 - ux * size + px * size * 0.6, y2 - uy * size + py * size * 0.6)
    p3 = (x2 - ux * size - px * size * 0.6, y2 - uy * size - py * size * 0.6)
    draw.polygon([p1, p2, p3], fill=fill)


def rounded_box(draw, box, text, fill="#FFFFFF", outline="#86A89F", radius=18, font_size=34, bold=False):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=4)
    center_text(draw, box, text, pil_font(font_size, bold), fill="#000000")


def save_architecture():
    img = Image.new("RGB", (1800, 1000), "#F5F8FA")
    d = ImageDraw.Draw(img)
    d.text((70, 45), "HERE 系统总体架构", font=pil_font(54, True), fill="#000000")
    rounded_box(d, (80, 220, 490, 480), "学生移动端\nExpo / React Native", "#EAF6F2", "#138A72", font_size=36, bold=True)
    rounded_box(d, (80, 580, 490, 840), "工作人员 PC 端\nReact / Vite", "#EDF3FA", "#557DA5", font_size=36, bold=True)
    rounded_box(d, (690, 355, 1120, 700), "统一业务 API\nFastAPI\nJWT + RBAC\nSQLAlchemy", "#FFFFFF", "#334D68", font_size=38, bold=True)
    rounded_box(d, (1330, 250, 1710, 500), "SQL Server\nHerePlatform", "#FFF8E8", "#B78A2E", font_size=40, bold=True)
    rounded_box(d, (1330, 610, 1710, 820), "文件存储\n任职证明 / 知识资料", "#F7F1FA", "#8B64A8", font_size=32)
    arrow(d, (490, 350), (690, 480))
    arrow(d, (490, 710), (690, 590))
    arrow(d, (1120, 480), (1330, 380))
    arrow(d, (1120, 610), (1330, 710))
    d.text((515, 315), "HTTPS / JSON", font=pil_font(28), fill="#000000")
    d.text((515, 730), "HTTPS / JSON", font=pil_font(28), fill="#000000")
    path = ASSETS / "system_architecture.png"
    img.save(path)
    return path


def save_function_structure():
    img = Image.new("RGB", (1800, 1180), "#F7F9FB")
    d = ImageDraw.Draw(img)
    d.text((70, 40), "系统功能结构", font=pil_font(54, True), fill="#000000")
    rounded_box(d, (560, 130, 1240, 280), "HERE 高校心理健康与安全协同管理系统", "#DDF3EB", "#138A72", font_size=36, bold=True)
    centers = [220, 630, 1040, 1450]
    titles = ["学生移动端", "辅导员 / 咨询师", "心理中心负责人", "系统管理员"]
    fills = ["#EAF6F2", "#EDF3FA", "#F7F1FA", "#FFF8E8"]
    subs = [
        "注册登录\n主动求助\n预警上报\n位置事件\n处理进度",
        "学生 / 个案\n预警工单\n转介处理\n干预档案\n资料投稿",
        "资料审核\n知识发布\n中心概览\n专业知识库",
        "入驻审核\n账号管理\n知识库管理\n审计日志\n权限配置",
    ]
    for cx, title, fill, sub in zip(centers, titles, fills, subs):
        arrow(d, (900, 280), (cx, 420))
        rounded_box(d, (cx - 175, 420, cx + 175, 570), title, fill, "#668093", font_size=30, bold=True)
        rounded_box(d, (cx - 175, 650, cx + 175, 1050), sub, "#FFFFFF", "#B8C7D1", font_size=29)
        arrow(d, (cx, 570), (cx, 650))
    path = ASSETS / "function_structure.png"
    img.save(path)
    return path


def save_business_flow():
    img = Image.new("RGB", (1800, 1450), "#F7F9FB")
    d = ImageDraw.Draw(img)
    d.text((70, 40), "核心业务流程：预警与工单闭环", font=pil_font(54, True), fill="#000000")
    steps = [
        ("学生移动端", "注册登录并完成身份信息"),
        ("学生移动端", "主动求助 / SOS / 风险事件上报"),
        ("统一后端", "校验 JWT 与 client_event_id"),
        ("统一后端", "保存预警并自动创建处置工单"),
        ("PC 工作台", "按学生归属或个案授权展示工单"),
        ("工作人员", "联系学生、记录处置、必要时转介"),
        ("统一后端", "形成干预记录、关闭工单并写审计日志"),
        ("学生移动端", "查看受理与处理状态"),
    ]
    y = 150
    for index, (owner, action) in enumerate(steps, 1):
        fill = "#EAF6F2" if "移动" in owner else "#EDF3FA" if "PC" in owner or "工作" in owner else "#FFFFFF"
        d.ellipse((115, y + 28, 195, y + 108), fill="#E7E7E7", outline="#666666", width=3)
        center_text(d, (115, y + 28, 195, y + 108), str(index), pil_font(34, True), fill="#000000")
        rounded_box(d, (250, y, 1550, y + 140), f"{owner}｜{action}", fill, "#86A89F", font_size=34, bold=index in {2, 4, 7})
        if index < len(steps):
            arrow(d, (900, y + 140), (900, y + 190), width=5)
        y += 160
    path = ASSETS / "business_flow.png"
    img.save(path)
    return path


def save_staff_onboarding_flow():
    img = Image.new("RGB", (1800, 1280), "#F7F7F7")
    d = ImageDraw.Draw(img)
    d.text((70, 40), "工作人员自主入驻与复审流程", font=pil_font(54, True), fill="#000000")
    steps = [
        ("申请人", "选择角色并使用工作邮箱注册账号"),
        ("统一后端", "创建待完善账号，限制进入正式工作台"),
        ("申请人", "填写机构、部门、工号、身份信息并上传任职证明"),
        ("管理员", "核验账号、角色、证明材料和资料完整性"),
        ("审核分支", "通过：启用工作台｜退回：保留证明并补充｜拒绝：终止申请"),
        ("统一后端", "写入正式档案、审核意见和审计日志"),
        ("工作人员", "资料变更时提交新申请，旧资料在复审通过前继续有效"),
    ]
    y = 155
    for index, (owner, action) in enumerate(steps, 1):
        d.ellipse((95, y + 25, 175, y + 105), fill="#E7E7E7", outline="#666666", width=3)
        center_text(d, (95, y + 25, 175, y + 105), str(index), pil_font(32, True), fill="#000000")
        rounded_box(d, (235, y, 515, y + 130), owner, "#F2F2F2", "#777777", font_size=31, bold=True)
        rounded_box(d, (560, y, 1660, y + 130), action, "#FFFFFF", "#888888", font_size=31)
        if index < len(steps):
            arrow(d, (1100, y + 130), (1100, y + 165), fill="#777777", width=4)
        y += 155
    path = ASSETS / "staff_onboarding_flow.png"
    img.save(path)
    return path


def save_knowledge_lifecycle():
    img = Image.new("RGB", (1900, 1100), "#F7F7F7")
    d = ImageDraw.Draw(img)
    d.text((70, 40), "知识资料生命周期", font=pil_font(54, True), fill="#000000")
    nodes = [
        (80, 310, 350, 500, "草稿\n投稿人增删改查"),
        (450, 310, 720, 500, "已提交\n锁定审核版本"),
        (820, 310, 1090, 500, "审核通过\n记录审核意见"),
        (1190, 310, 1460, 500, "已发布\n进入正式知识库"),
        (1560, 310, 1830, 500, "图谱队列\n记录处理状态"),
    ]
    for x1, y1, x2, y2, label in nodes:
        rounded_box(d, (x1, y1, x2, y2), label, "#FFFFFF", "#777777", font_size=31, bold=True)
    for left, right in zip(nodes, nodes[1:]):
        arrow(d, (left[2], 405), (right[0], 405), fill="#666666", width=5)
    rounded_box(d, (450, 735, 720, 915), "退回修改\n恢复为草稿", "#F2F2F2", "#777777", font_size=31, bold=True)
    rounded_box(d, (820, 735, 1090, 915), "审核拒绝\n保留记录", "#F2F2F2", "#777777", font_size=31, bold=True)
    rounded_box(d, (1190, 735, 1460, 915), "下架/恢复\n管理员维护", "#F2F2F2", "#777777", font_size=31, bold=True)
    arrow(d, (585, 500), (585, 735), fill="#666666", width=5)
    arrow(d, (955, 500), (955, 735), fill="#666666", width=5)
    arrow(d, (1325, 500), (1325, 735), fill="#666666", width=5)
    d.text((515, 620), "退回", font=pil_font(27), fill="#000000")
    d.text((885, 620), "拒绝", font=pil_font(27), fill="#000000")
    d.text((1255, 620), "运营维护", font=pil_font(27), fill="#000000")
    path = ASSETS / "knowledge_lifecycle.png"
    img.save(path)
    return path


def save_context_data_flow():
    img = Image.new("RGB", (2100, 1350), "#FAFAFA")
    d = ImageDraw.Draw(img)
    d.text((70, 38), "系统上下文数据流图", font=pil_font(54, True), fill="#000000")

    def actor_card(box, title, input_text, output_text):
        x1, y1, x2, y2 = box
        d.rounded_rectangle(box, radius=20, fill="#F3F3F3", outline="#777777", width=4)
        d.text((x1 + 30, y1 + 24), title, font=pil_font(36, True), fill="#000000")
        d.line((x1 + 30, y1 + 84, x2 - 30, y1 + 84), fill="#B5B5B5", width=3)
        d.text((x1 + 30, y1 + 112), "输入", font=pil_font(27, True), fill="#000000")
        d.multiline_text(
            (x1 + 112, y1 + 108), input_text, font=pil_font(27), fill="#000000", spacing=12
        )
        d.text((x1 + 30, y1 + 220), "输出", font=pil_font(27, True), fill="#000000")
        d.multiline_text(
            (x1 + 112, y1 + 216), output_text, font=pil_font(27), fill="#000000", spacing=12
        )

    student_box = (70, 145, 625, 485)
    staff_box = (70, 865, 625, 1205)
    admin_box = (1475, 145, 2030, 485)
    external_box = (1475, 865, 2030, 1205)
    system_box = (755, 425, 1345, 925)

    actor_card(
        student_box,
        "学生移动端",
        "注册资料、位置事件\n主动求助、SOS、预警",
        "登录凭证、受理状态\n处理进度、公开知识",
    )
    actor_card(
        staff_box,
        "工作人员 PC 端",
        "入驻资料、处置记录\n咨询记录、知识投稿",
        "工单、授权个案\n审核结果、统计信息",
    )
    actor_card(
        admin_box,
        "系统管理员",
        "审核动作、账号配置\n审计查询条件",
        "待办数量、账号状态\n审计结果、运行概览",
    )
    actor_card(
        external_box,
        "外部服务",
        "邮件请求、文件写入\n知识图谱任务请求",
        "发送结果、文件地址\n知识图谱任务状态",
    )

    d.rounded_rectangle(system_box, radius=24, fill="#FFFFFF", outline="#555555", width=5)
    d.multiline_text(
        (848, 474),
        "HERE 高校心理健康与安全\n协同管理信息系统",
        font=pil_font(40, True),
        fill="#000000",
        spacing=14,
        align="center",
    )
    d.line((805, 615, 1295, 615), fill="#A8A8A8", width=3)
    modules = [
        ((805, 660, 1025, 750), "账号与权限"),
        ((1075, 660, 1295, 750), "预警与工单"),
        ((805, 790, 1025, 880), "知识与资料"),
        ((1075, 790, 1295, 880), "统计与审计"),
    ]
    for module_box, label in modules:
        d.rounded_rectangle(module_box, radius=12, fill="#F2F2F2", outline="#A0A0A0", width=3)
        center_text(d, module_box, label, pil_font(27, True), fill="#000000")

    connectors = [
        ((625, 405), (755, 520)),
        ((625, 945), (755, 830)),
        ((1475, 405), (1345, 520)),
        ((1475, 945), (1345, 830)),
    ]
    for outer, inner in connectors:
        arrow(d, outer, inner, fill="#666666", width=5)
        arrow(d, inner, outer, fill="#666666", width=5)

    d.line((70, 1270, 2030, 1270), fill="#D0D0D0", width=2)
    d.text(
        (70, 1290),
        "说明：卡片中的“输入”表示该参与者或服务向系统提交的数据，“输出”表示系统返回的数据或处理结果。",
        font=pil_font(25),
        fill="#000000",
    )
    path = ASSETS / "context_data_flow.png"
    img.save(path)
    return path


def save_deployment_topology():
    img = Image.new("RGB", (1900, 1050), "#F7F7F7")
    d = ImageDraw.Draw(img)
    d.text((70, 40), "系统部署拓扑", font=pil_font(54, True), fill="#000000")
    rounded_box(d, (80, 210, 430, 410), "学生手机\nAndroid / Expo", "#F2F2F2", "#777777", font_size=36, bold=True)
    rounded_box(d, (80, 650, 430, 850), "工作人员浏览器\nChrome / Edge", "#F2F2F2", "#777777", font_size=34, bold=True)
    rounded_box(d, (650, 365, 1020, 685), "Web 入口层\nHTTPS\n静态资源 / 反向代理", "#FFFFFF", "#666666", font_size=36, bold=True)
    rounded_box(d, (1210, 210, 1560, 470), "FastAPI 服务\n认证鉴权\n业务规则\n文件接口", "#FFFFFF", "#666666", font_size=34, bold=True)
    rounded_box(d, (1210, 650, 1560, 880), "SQL Server\nHerePlatform\n事务 / 索引 / 备份", "#FFFFFF", "#666666", font_size=34, bold=True)
    rounded_box(d, (1660, 210, 1840, 470), "受控文件目录\n证明与知识资料", "#F2F2F2", "#777777", font_size=28, bold=True)
    rounded_box(d, (1660, 650, 1840, 880), "SMTP\n密码重置邮件", "#F2F2F2", "#777777", font_size=28, bold=True)
    arrow(d, (430, 310), (650, 460), fill="#666666", width=5)
    arrow(d, (430, 750), (650, 590), fill="#666666", width=5)
    arrow(d, (1020, 500), (1210, 340), fill="#666666", width=5)
    arrow(d, (1385, 470), (1385, 650), fill="#666666", width=5)
    arrow(d, (1560, 340), (1660, 340), fill="#666666", width=5)
    arrow(d, (1560, 420), (1660, 730), fill="#666666", width=5)
    path = ASSETS / "deployment_topology.png"
    img.save(path)
    return path


def save_data_flow():
    img = Image.new("RGB", (2100, 1200), "#FAFAFA")
    d = ImageDraw.Draw(img)
    d.text((70, 35), "一级数据流图", font=pil_font(54, True), fill="#000000")

    d.text((70, 120), "业务参与者", font=pil_font(27, True), fill="#000000")
    d.text((770, 120), "业务处理过程", font=pil_font(27, True), fill="#000000")
    d.text((1600, 120), "数据存储", font=pil_font(27, True), fill="#000000")

    def actor_card(box, title, data_lines):
        x1, y1, x2, y2 = box
        d.rounded_rectangle(box, radius=20, fill="#F3F3F3", outline="#777777", width=4)
        d.text((x1 + 30, y1 + 28), title, font=pil_font(37, True), fill="#000000")
        d.line((x1 + 30, y1 + 92, x2 - 30, y1 + 92), fill="#B5B5B5", width=3)
        d.text((x1 + 30, y1 + 120), "主要输入数据", font=pil_font(26, True), fill="#000000")
        d.multiline_text(
            (x1 + 30, y1 + 170), data_lines, font=pil_font(27), fill="#000000", spacing=13
        )

    def process_box(box, title, detail):
        x1, y1, x2, y2 = box
        d.rounded_rectangle(box, radius=18, fill="#FFFFFF", outline="#777777", width=4)
        d.text((x1 + 32, y1 + 28), title, font=pil_font(32, True), fill="#000000")
        d.line((x1 + 32, y1 + 82, x2 - 32, y1 + 82), fill="#C0C0C0", width=3)
        d.text((x1 + 32, y1 + 108), detail, font=pil_font(25), fill="#000000")

    student_box = (70, 220, 535, 505)
    staff_box = (70, 675, 535, 960)
    actor_card(student_box, "学生", "注册与登录资料\n位置事件、主动求助\n预警信息")
    actor_card(staff_box, "工作人员", "工单处置与转介记录\n结案信息\n知识投稿与审核动作")

    process_boxes = [
        ((770, 170, 1330, 360), "P1  账号与权限管理", "完成认证、角色授权和档案维护"),
        ((770, 415, 1330, 605), "P2  预警与工单处理", "完成预警受理、处置、转介和结案"),
        ((770, 660, 1330, 850), "P3  知识与资料管理", "完成资料投稿、审核、发布和下架"),
        ((770, 905, 1330, 1095), "P4  统计与审计", "完成指标汇总、日志记录和审计查询"),
    ]
    for box, title, detail in process_boxes:
        process_box(box, title, detail)

    stores = [
        ((1600, 190, 2030, 340), "D1  用户与档案"),
        ((1600, 435, 2030, 585), "D2  预警与工单"),
        ((1600, 680, 2030, 830), "D3  知识资料"),
        ((1600, 925, 2030, 1075), "D4  审计日志"),
    ]
    for box, label in stores:
        x1, y1, x2, y2 = box
        d.rectangle(box, fill="#F4F4F4", outline="#777777", width=4)
        d.line((x1 + 28, y1, x1 + 28, y2), fill="#777777", width=4)
        center_text(d, (x1 + 28, y1, x2, y2), label, pil_font(30, True), fill="#000000")

    # 参与者只与对应业务过程相连，连线上不再放置文字。
    arrow(d, (535, 310), (770, 265), fill="#666666", width=5)
    arrow(d, (535, 410), (770, 510), fill="#666666", width=5)
    arrow(d, (535, 755), (770, 555), fill="#666666", width=5)
    arrow(d, (535, 860), (770, 755), fill="#666666", width=5)

    # 双向箭头表示处理过程对相应数据存储的读取与写入。
    process_store_pairs = [
        ((1330, 245), (1600, 245)),
        ((1330, 490), (1600, 490)),
        ((1330, 735), (1600, 735)),
        ((1330, 980), (1600, 980)),
    ]
    for process_point, store_point in process_store_pairs:
        arrow(d, (process_point[0], process_point[1] - 22), (store_point[0], store_point[1] - 22), fill="#666666", width=5)
        arrow(d, (store_point[0], store_point[1] + 22), (process_point[0], process_point[1] + 22), fill="#666666", width=5)

    d.line((70, 1135, 2030, 1135), fill="#D0D0D0", width=2)
    d.text(
        (70, 1150),
        "说明：左侧卡片列出主要输入数据；单向箭头表示业务数据进入处理过程；双向箭头表示数据读取与写入。",
        font=pil_font(24),
        fill="#000000",
    )
    path = ASSETS / "data_flow.png"
    img.save(path)
    return path


def save_er_diagram():
    img = Image.new("RGB", (2200, 1500), "#F7F9FB")
    d = ImageDraw.Draw(img)
    d.text((70, 35), "核心实体关系（E-R）", font=pil_font(56, True), fill="#000000")
    entities = {
        "StudentUser": (80, 180, 470, 430, "学生账号\nPK id\nphone\npassword_hash\nstatus"),
        "StudentProfile": (80, 560, 470, 840, "学生档案\nPK id\nFK student_id\nstudent_number\ncollege / class\nFK counselor_id"),
        "LocationEvent": (80, 1020, 470, 1330, "位置事件\nPK id\nFK student_id\nclient_event_id\nlatitude / longitude\nrecorded_at"),
        "Alert": (700, 180, 1090, 480, "预警\nPK id\nFK student_id\nclient_event_id\ncategory / severity\nstatus"),
        "WorkOrder": (700, 650, 1090, 960, "处置工单\nPK id\nFK alert_id\nFK assignee_id\nstatus / priority\nresolution_note"),
        "Intervention": (700, 1110, 1090, 1390, "干预记录\nPK id\nFK work_order_id\nFK staff_user_id\naction_type\nnote"),
        "StaffUser": (1370, 180, 1780, 480, "工作人员账号\nPK id\nemail\npassword_hash\nrole\naccount_status"),
        "StaffProfile": (1370, 650, 1780, 950, "工作人员档案\nPK id\nFK staff_user_id\norganization\ndepartment / college\nemployee_number"),
        "KnowledgeDocument": (1370, 1110, 1780, 1400, "知识资料\nPK id\nFK owner_id\nname / domain\nstatus\ngraph_status"),
        "AuditLog": (1870, 600, 2150, 950, "审计日志\nPK id\nactor_id\naction\nresource_type\nresource_id\ncreated_at"),
    }
    for _, (x1, y1, x2, y2, text) in entities.items():
        rounded_box(d, (x1, y1, x2, y2), text, "#FFFFFF", "#668093", font_size=28, bold=False)
    links = [
        ((470, 300), (700, 300), "1  产生  N"),
        ((275, 430), (275, 560), "1  拥有  1"),
        ((275, 840), (275, 1020), "1  记录  N"),
        ((895, 480), (895, 650), "1  生成  1"),
        ((895, 960), (895, 1110), "1  包含  N"),
        ((1370, 300), (1090, 790), "1  处理  N"),
        ((1575, 480), (1575, 650), "1  拥有  1"),
        ((1575, 950), (1575, 1110), "1  提交  N"),
        ((1780, 765), (1870, 765), "1  形成  N"),
    ]
    for start, end, label in links:
        arrow(d, start, end, width=4)
        mx, my = (start[0] + end[0]) / 2, (start[1] + end[1]) / 2
        d.text((mx - 55, my - 38), label, font=pil_font(23), fill="#000000")
    path = ASSETS / "er_diagram.png"
    img.save(path)
    return path


def set_run_font(run, east_asia="宋体", size=Pt(12), bold=None, color=None):
    run.font.name = "宋体"
    run._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), "宋体")
    run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), "宋体")
    run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), "宋体")
    run.font.size = size
    if bold is not None:
        run.bold = bold
    run.font.color.rgb = RGBColor(0, 0, 0)


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=90, start=110, bottom=90, end=110):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for m, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{m}"))
        if node is None:
            node = OxmlElement(f"w:{m}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def set_cant_split(row):
    tr_pr = row._tr.get_or_add_trPr()
    cant_split = OxmlElement("w:cantSplit")
    tr_pr.append(cant_split)


def set_cell_width(cell, width_cm):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_w = tc_pr.find(qn("w:tcW"))
    if tc_w is None:
        tc_w = OxmlElement("w:tcW")
        tc_pr.append(tc_w)
    tc_w.set(qn("w:w"), str(int(Cm(width_cm).emu / 635)))
    tc_w.set(qn("w:type"), "dxa")


def add_table(doc, headers, rows, widths=None, font_size=9):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.style = "Table Grid"
    hdr = table.rows[0]
    set_repeat_table_header(hdr)
    set_cant_split(hdr)
    for i, header in enumerate(headers):
        cell = hdr.cells[i]
        cell.text = header
        set_cell_shading(cell, "E7E7E7")
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        set_cell_margins(cell)
        if widths:
            set_cell_width(cell, widths[i])
        for p in cell.paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in p.runs:
                set_run_font(run, "微软雅黑", Pt(font_size), True, "FFFFFF")
    for row_data in rows:
        row = table.add_row()
        set_cant_split(row)
        for i, value in enumerate(row_data):
            cell = row.cells[i]
            cell.text = str(value)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            set_cell_margins(cell)
            if widths:
                set_cell_width(cell, widths[i])
            if len(table.rows) % 2 == 1:
                set_cell_shading(cell, "F7F7F7")
            for p in cell.paragraphs:
                p.paragraph_format.space_before = Pt(0)
                p.paragraph_format.space_after = Pt(0)
                p.paragraph_format.line_spacing = 1.15
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER if i == 0 else WD_ALIGN_PARAGRAPH.LEFT
                for run in p.runs:
                    set_run_font(run, "宋体", Pt(font_size), False, DARK)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)
    return table


def add_body(doc, text, bold_lead=None):
    p = doc.add_paragraph()
    p.paragraph_format.first_line_indent = Cm(0.74)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    p.paragraph_format.space_after = Pt(6)
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    if bold_lead and text.startswith(bold_lead):
        r1 = p.add_run(bold_lead)
        set_run_font(r1, "宋体", Pt(12), True, DARK)
        r2 = p.add_run(text[len(bold_lead):])
        set_run_font(r2, "宋体", Pt(12), False, DARK)
    else:
        run = p.add_run(text)
        set_run_font(run, "宋体", Pt(12), False, DARK)
    return p


def add_bullets(doc, items: Iterable[str]):
    for item in items:
        p = doc.add_paragraph(style="List Bullet")
        p.paragraph_format.left_indent = Cm(0.74)
        p.paragraph_format.first_line_indent = Cm(-0.35)
        p.paragraph_format.line_spacing = 1.35
        p.paragraph_format.space_after = Pt(3)
        run = p.add_run(item)
        set_run_font(run, "宋体", Pt(11.5), False, DARK)


def create_restarting_numbering(doc):
    numbering = doc.part.numbering_part.element
    style_num_id = doc.styles["List Number"]._element.pPr.numPr.numId.val
    source_num = next(node for node in numbering.findall(qn("w:num")) if int(node.get(qn("w:numId"))) == style_num_id)
    abstract_id = source_num.find(qn("w:abstractNumId")).get(qn("w:val"))
    existing = [int(node.get(qn("w:numId"))) for node in numbering.findall(qn("w:num"))]
    new_id = max(existing, default=0) + 1
    num = OxmlElement("w:num")
    num.set(qn("w:numId"), str(new_id))
    abstract = OxmlElement("w:abstractNumId")
    abstract.set(qn("w:val"), abstract_id)
    num.append(abstract)
    override = OxmlElement("w:lvlOverride")
    override.set(qn("w:ilvl"), "0")
    start = OxmlElement("w:startOverride")
    start.set(qn("w:val"), "1")
    override.append(start)
    num.append(override)
    numbering.append(num)
    return new_id


def add_numbered(doc, items: Iterable[str]):
    num_id = create_restarting_numbering(doc)
    for item in items:
        p = doc.add_paragraph(style="List Number")
        num_pr = p._p.get_or_add_pPr().get_or_add_numPr()
        num_pr.get_or_add_ilvl().val = 0
        num_pr.get_or_add_numId().val = num_id
        p.paragraph_format.left_indent = Cm(0.74)
        p.paragraph_format.first_line_indent = Cm(-0.35)
        p.paragraph_format.line_spacing = 1.35
        p.paragraph_format.space_after = Pt(3)
        run = p.add_run(item)
        set_run_font(run, "宋体", Pt(11.5), False, DARK)


def add_heading(doc, text, level=1, page_break=False):
    if page_break:
        doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
    p = doc.add_paragraph(style=f"Heading {level}")
    p.paragraph_format.space_before = Pt(12 if level == 1 else 8)
    p.paragraph_format.space_after = Pt(8 if level == 1 else 5)
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.line_spacing = 1.15
    run = p.add_run(text)
    set_run_font(run, "黑体", Pt(16 if level == 1 else 14 if level == 2 else 12), True, DARK)
    return p


def add_figure(doc, path, caption, width=Cm(15.6)):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.keep_with_next = True
    p.add_run().add_picture(str(path), width=width)
    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.paragraph_format.space_after = Pt(8)
    run = cap.add_run(f"{caption}（图号待统一）")
    set_run_font(run, "宋体", Pt(10), False, MUTED)


def add_screenshot_placeholder(doc, title, guidance):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_cant_split(table.rows[0])
    cell = table.cell(0, 0)
    set_cell_width(cell, 15.6)
    set_cell_shading(cell, "F3F3F3")
    set_cell_margins(cell, 150, 180, 150, 180)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r1 = p.add_run(f"【截图占位】{title}\n")
    set_run_font(r1, "微软雅黑", Pt(13), True, ACCENT)
    r2 = p.add_run(guidance + "\n")
    set_run_font(r2, "宋体", Pt(10.5), False, MUTED)
    r3 = p.add_run("后期替换为真实截图并统一图号")
    set_run_font(r3, "宋体", Pt(9.5), False, MUTED)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)


def add_page_number(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run()
    fld_char1 = OxmlElement("w:fldChar")
    fld_char1.set(qn("w:fldCharType"), "begin")
    instr_text = OxmlElement("w:instrText")
    instr_text.set(qn("xml:space"), "preserve")
    instr_text.text = " PAGE "
    fld_char2 = OxmlElement("w:fldChar")
    fld_char2.set(qn("w:fldCharType"), "end")
    run._r.append(fld_char1)
    run._r.append(instr_text)
    run._r.append(fld_char2)
    set_run_font(run, "宋体", Pt(10), False, "000000")


def normalize_document_typography(doc):
    """Force all editable document text to black SimSun before saving."""
    def normalize_run(run):
        run.font.name = "宋体"
        run._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), "宋体")
        run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), "宋体")
        run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), "宋体")
        run.font.color.rgb = RGBColor(0, 0, 0)

    def normalize_paragraphs(paragraphs):
        for paragraph in paragraphs:
            for run in paragraph.runs:
                normalize_run(run)

    normalize_paragraphs(doc.paragraphs)
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                normalize_paragraphs(cell.paragraphs)
                for nested_table in cell.tables:
                    for nested_row in nested_table.rows:
                        for nested_cell in nested_row.cells:
                            normalize_paragraphs(nested_cell.paragraphs)
    for section in doc.sections:
        normalize_paragraphs(section.header.paragraphs)
        normalize_paragraphs(section.footer.paragraphs)


def configure_document(doc):
    section = doc.sections[0]
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2.4)
    section.bottom_margin = Cm(2.3)
    section.left_margin = Cm(2.6)
    section.right_margin = Cm(2.4)
    section.header_distance = Cm(1.2)
    section.footer_distance = Cm(1.2)

    normal = doc.styles["Normal"]
    normal.font.name = "宋体"
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
    normal.font.size = Pt(12)
    normal.font.color.rgb = RGBColor(0, 0, 0)

    for name, size in (("Heading 1", 16), ("Heading 2", 14), ("Heading 3", 12)):
        style = doc.styles[name]
        style.font.name = "宋体"
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
        style._element.rPr.rFonts.set(qn("w:ascii"), "宋体")
        style._element.rPr.rFonts.set(qn("w:hAnsi"), "宋体")
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor(0, 0, 0)

    if "Figure Caption" not in doc.styles:
        style = doc.styles.add_style("Figure Caption", WD_STYLE_TYPE.PARAGRAPH)
        style.font.name = "宋体"
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
        style.font.size = Pt(10)

    header = section.header
    hp = header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    hr = hp.add_run("HERE 高校心理健康与安全协同管理信息系统")
    set_run_font(hr, "微软雅黑", Pt(9), False, MUTED)
    add_page_number(section.footer.paragraphs[0])


def add_cover(doc):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(45)
    r = p.add_run("管理信息系统实训报告书")
    set_run_font(r, "黑体", Pt(28), True, DARK)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(60)
    p.paragraph_format.space_after = Pt(45)
    r = p.add_run("HERE 高校心理健康与安全协同\n管理信息系统的设计与实现")
    set_run_font(r, "微软雅黑", Pt(22), True, ACCENT)

    rows = [
        ("实训名称", "管理信息系统实训"),
        ("开课学院", "管理学院"),
        ("指导教师", "江长斌"),
        ("学生姓名", "陈欣祺"),
        ("学生学号", "1023005831"),
        ("专业班级", "信息管理与信息系统 2302 班"),
        ("完成时间", "2026 年 9 月"),
    ]
    table = doc.add_table(rows=0, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    for label, value in rows:
        cells = table.add_row().cells
        set_cell_width(cells[0], 4.2)
        set_cell_width(cells[1], 9.0)
        for c in cells:
            set_cell_margins(c, 150, 100, 150, 100)
        cells[0].text = label
        cells[1].text = value
        cells[0].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.RIGHT
        cells[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        for run in cells[0].paragraphs[0].runs:
            set_run_font(run, "黑体", Pt(14), True, DARK)
        for run in cells[1].paragraphs[0].runs:
            set_run_font(run, "宋体", Pt(14), False, DARK)
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


def build_report():
    figures = {
        "architecture": save_architecture(),
        "function": save_function_structure(),
        "business": save_business_flow(),
        "staff_onboarding": save_staff_onboarding_flow(),
        "knowledge_lifecycle": save_knowledge_lifecycle(),
        "context_dfd": save_context_data_flow(),
        "deployment": save_deployment_topology(),
        "dfd": save_data_flow(),
        "er": save_er_diagram(),
    }
    doc = Document()
    configure_document(doc)
    doc.core_properties.title = "HERE 高校心理健康与安全协同管理信息系统的设计与实现"
    doc.core_properties.author = "陈欣祺"
    doc.core_properties.subject = "管理信息系统实训报告草稿"
    add_cover(doc)

    add_heading(doc, "一、系统分析", 1)
    add_heading(doc, "（一）项目背景与研究意义", 2)
    add_body(doc, "随着高校学生规模扩大、学习生活节奏加快以及心理健康服务需求增加，传统依赖电话、纸质表格和分散电子文档的学生工作方式逐渐暴露出信息滞后、跨部门协作困难、处理过程难追踪等问题。学生遇到安全或心理困扰时，信息往往先通过个人沟通渠道传递，后续是否受理、由谁负责、何时完成缺少统一记录；辅导员、心理咨询师和心理中心之间也容易因为职责边界不清而出现重复沟通或信息断层。")
    add_body(doc, "HERE 系统以高校学生安全与心理健康协同管理为对象，通过统一后端连接学生移动端和工作人员 PC 端。移动端承担学生注册、主动求助、位置事件和预警上报等入口；PC 端根据工作人员角色提供学生关怀、预警工单、咨询个案、干预档案、知识资料和系统审计等功能。系统将一次求助从“消息”转化为具有编号、状态、责任人和处理记录的业务对象，使管理过程可查询、可统计、可审计。")
    add_body(doc, "本项目的管理信息系统价值主要体现在三个方面：第一，将学生、工作人员、预警、工单、干预和知识资料建立统一的数据关系，减少信息孤岛；第二，通过角色权限和业务状态约束各类人员的操作范围，提升敏感信息处理的规范性；第三，将流程数据沉淀为统计指标和审计记录，为校园心理服务资源配置、风险响应效率分析和管理决策提供依据。")

    add_heading(doc, "（二）现状问题分析", 2)
    add_table(doc, ["问题", "原有表现", "系统改进方向"], [
        ["数据分散", "手机端 SQLite、工作人员表格和网页演示数据彼此独立", "以 SQL Server 为权威数据源，通过 FastAPI 提供统一接口"],
        ["账号不规范", "早期存在本地自动注册、明文密码和假令牌", "采用密码哈希、JWT、会话失效和账号状态控制"],
        ["职责不清", "辅导员、咨询师和管理员看到相似页面或数据", "按角色配置菜单、查询范围和审核权限"],
        ["流程不可追踪", "求助信息处理后缺少状态、责任人和记录", "预警自动生成工单，处置形成干预和审计日志"],
        ["知识资料失序", "资料上传、审核和发布边界不清", "建立草稿、提交、审核、发布、下架的状态流程"],
        ["敏感信息风险", "身份、心理和位置数据缺少统一保护", "最小权限、身份证摘要化、访问审计和脱敏展示"],
    ], widths=[3.0, 6.2, 6.4], font_size=9.5)

    add_heading(doc, "（三）系统建设目标", 2)
    add_numbered(doc, [
        "建立学生与工作人员分离的账号体系，支持学生手机号认证和工作人员入驻审核。",
        "建立预警—工单—干预—结案闭环，使每一次风险事件都有明确状态和责任记录。",
        "为辅导员、心理咨询师、心理中心负责人和管理员提供职责清晰的工作台。",
        "建立分领域知识资料管理机制，区分心理专业资料与学生工作政策。",
        "通过统计概览、查询、分页和审计日志提高管理效率与可追溯性。",
        "为学生移动端与 PC 端联动预留统一接口，并将 SQLite 调整为缓存和离线队列。",
    ])

    add_heading(doc, "（四）组织结构与用户角色", 2)
    add_body(doc, "系统不把所有工作人员简单视为同一种管理员，而是按照高校学生工作和心理服务中的职责进行划分。系统管理员负责账号、权限、知识库和审计，不默认读取学生个案正文；辅导员负责其归属学生的日常关怀和预警处置；心理咨询师只处理经过授权或转介的个案；心理中心负责人主要审核心理专业资料并观察中心运行。该设计体现了“业务职责决定数据权限”的原则。")
    add_table(doc, ["角色", "主要职责", "核心数据范围", "典型操作"], [
        ["学生", "提交资料、主动求助和预警", "本人资料、本人事件及可公开状态", "注册登录、求助、查看处理进度"],
        ["高校辅导员", "学生关怀、预警处置、学生工作资料维护", "本人负责学生及对应工单", "查看学生、处理工单、记录干预"],
        ["心理咨询师", "授权个案、转介处理、咨询服务记录", "分配给本人的个案", "查看个案、处理转介、维护服务档案"],
        ["心理中心负责人", "心理专业资料审核与知识发布", "心理专业资料和中心汇总", "审核资料、发布知识、查看中心概览"],
        ["系统管理员", "账号、审核、知识库和审计管理", "系统配置和审计信息", "入驻审核、账号管理、知识维护、日志查询"],
    ], widths=[2.6, 5.0, 4.2, 4.0], font_size=9)

    add_heading(doc, "（五）系统边界与需求范围", 2)
    add_body(doc, "系统边界决定本次实训应该解决什么问题，也决定哪些能力不能为了展示效果而被虚构。HERE 的核心边界是校园心理健康与学生安全事件的数字化协同：系统接收学生主动提交的信息，依据角色和学生归属组织工作人员处理，并保存流程、状态和责任记录。系统不替代心理诊断、医疗急救和学校行政决策，不使用算法自动给学生下诊断结论，也不允许管理员因为技术权限而任意读取咨询正文。")
    add_table(doc, ["范围类型", "纳入本系统", "暂不纳入或由外部系统承担"], [
        ["身份与账号", "学生手机号账号、工作人员邮箱账号、入驻审核、密码修改和找回", "统一身份认证平台、校园卡制卡、教务学籍主数据维护"],
        ["风险协同", "主动求助、SOS、位置事件、预警、工单、处置和结案", "自动医学诊断、公安或医院指挥调度、硬件传感器诊断"],
        ["心理服务", "授权个案、转介工单、服务记录和角色隔离", "心理量表版权内容、远程医疗处方、未经授权的全量个案读取"],
        ["知识资料", "投稿、版本替换、审核、发布、下架和图谱任务状态", "真实知识图谱算法、自动生成专业结论、第三方版权资料抓取"],
        ["管理支撑", "账号状态、审核中心、统计概览、审计查询和数据迁移", "财务、人事考勤、课程排课和完整 OA 审批"],
    ], widths=[2.7, 6.4, 6.7], font_size=9.1)
    add_body(doc, "系统的近期优先级采用“核心闭环优先、管理可见优先、智能能力后置”的原则。第一优先级是人员真实认证、学生事件上报、预警自动生成工单和工单闭环；第二优先级是知识资料审核、账号管理、审计和统计；第三优先级是手机端离线同步、通知推送和真实知识图谱。该排序保证即使扩展功能尚未完成，系统仍能形成可验证的管理信息闭环。")

    add_heading(doc, "（六）功能需求分析", 2)
    add_figure(doc, figures["function"], "系统功能结构")
    add_body(doc, "系统功能由账号权限、学生与个案、预警工单、干预档案、知识资料、统计展示和审计管理七类模块构成。工作人员注册后不能直接进入正式工作台，必须先完善机构、部门、工号、身份证号和任职证明，由管理员审核。资料退回时允许修改并复用已上传证明；审核通过后，系统根据角色加载对应菜单和数据范围。")
    add_body(doc, "预警工单是系统的核心业务对象。学生移动端上报位置事件、主动求助或 SOS 后，后端使用 client_event_id 进行幂等判断，保存预警并创建处置工单。辅导员或咨询师根据权限查看工单，记录处置过程并完成闭环。管理员通过审计日志查询操作者、操作、资源和时间，但不直接承担心理咨询业务。")
    add_body(doc, "知识资料模块采用内容生命周期管理。辅导员和心理咨询师可以对自己的草稿执行新增、查询、修改和删除，提交后进入审核状态；心理中心负责人默认审核心理专业资料，学生工作政策由管理员维护。资料审核通过后发布并进入知识图谱处理队列，当前系统真实保存处理状态，不虚构图谱节点。")

    add_heading(doc, "（七）主要业务用例", 2)
    add_body(doc, "业务用例用于说明参与者在什么前提下使用系统、系统应产生什么结果。与单纯列出页面名称相比，用例更能体现管理信息系统中的业务责任、输入输出和异常分支。以下用例均可在现有 PC 端或统一后端中找到对应模块，手机端尚未完成的部分在实现章节单独说明。")
    add_table(doc, ["用例", "参与者", "前置条件", "基本过程与结果"], [
        ["UC01 工作人员注册", "辅导员/咨询师/负责人", "邮箱未注册", "提交邮箱、角色和密码，创建待完善账号"],
        ["UC02 入驻申请", "工作人员", "已登录待完善账号", "填写任职资料并上传证明，进入待审核状态"],
        ["UC03 入驻审核", "管理员", "存在待审申请", "核验资料后通过、退回或拒绝，并记录审核意见"],
        ["UC04 学生事件上报", "学生", "学生令牌有效", "提交位置或预警事件，系统进行幂等校验并返回受理结果"],
        ["UC05 工单处置", "辅导员/咨询师", "拥有数据范围权限", "查看工单、记录联系和干预动作，最终完成结案"],
        ["UC06 个案查看", "心理咨询师", "个案已分配且授权", "只读取分配给本人的学生和服务记录"],
        ["UC07 知识投稿", "辅导员/咨询师", "账号启用", "创建草稿、修改元数据、替换文件并提交审核"],
        ["UC08 资料审核发布", "负责人/管理员", "具有对应领域权限", "审核通过或退回，发布后进入正式知识库"],
        ["UC09 账号管理", "管理员", "管理员令牌有效", "停用、恢复或软注销普通工作人员账号"],
        ["UC10 审计查询", "管理员", "存在审计记录", "按关键词和分页条件查询操作人、动作、资源与时间"],
        ["UC11 修改密码", "工作人员", "当前密码正确", "设置新密码并使旧 JWT 立即失效"],
        ["UC12 忘记密码", "工作人员", "注册邮箱可用", "获取一次性重置令牌并在有效期内设置新密码"],
    ], widths=[3.0, 3.0, 4.2, 5.6], font_size=8.7)

    add_heading(doc, "（八）权限矩阵与业务规则", 2)
    add_body(doc, "权限设计采用角色权限、数据范围和资源状态三层联合判断。角色决定用户能否进入某类接口；数据范围决定能读取哪些学生或个案；资源状态决定当前是否允许修改。例如咨询师拥有个案查看能力，但只有被分配且授权的个案才能返回；投稿人拥有资料修改能力，但资料一旦提交审核就不能直接修改。前端菜单只负责减少误操作，后端仍对每次请求执行完整校验。")
    add_table(doc, ["资源/操作", "辅导员", "心理咨询师", "中心负责人", "管理员"], [
        ["查看学生/个案", "本人负责学生", "本人授权个案", "中心汇总，不默认看正文", "不默认看咨询正文"],
        ["处理预警工单", "归属学生工单", "转介或授权工单", "查看汇总", "技术管理，不代办业务"],
        ["维护个人投稿", "学生工作资料", "心理专业资料", "可投稿心理专业资料", "可维护系统资料"],
        ["审核心理专业资料", "无", "无", "有", "有"],
        ["审核学生工作政策", "无", "无", "默认无", "有"],
        ["管理工作人员账号", "无", "无", "无", "有"],
        ["查询系统审计", "无", "无", "无", "有"],
    ], widths=[4.0, 3.0, 3.2, 3.0, 3.0], font_size=8.8)
    add_table(doc, ["规则编号", "核心业务规则"], [
        ["BR01", "工作人员注册后必须完成入驻审核，未通过前不能进入正式工作台。"],
        ["BR02", "学生事件由 student_id 与 client_event_id 共同保证幂等，重复请求不得生成重复预警和工单。"],
        ["BR03", "每条预警最多对应一个主处置工单，一个工单可以包含多条干预记录。"],
        ["BR04", "辅导员只能访问归属给自己的学生，心理咨询师只能访问已分配且授权的个案。"],
        ["BR05", "投稿人只能增删改查本人草稿；提交、审核通过和已发布状态禁止直接改写。"],
        ["BR06", "心理中心负责人默认只审核心理专业领域，学生工作政策由管理员审核。"],
        ["BR07", "账号停用可以恢复，账号注销后不能登录且默认从成员列表隐藏，但历史外键与审计记录保留。"],
        ["BR08", "修改密码、重置密码或注销账号时递增 auth_version，使此前签发的 JWT 立即失效。"],
        ["BR09", "身份证号不保存明文，只保存不可逆摘要和末四位，页面只能展示掩码。"],
        ["BR10", "管理员的系统技术权限不自动等于心理咨询业务权限。"],
        ["BR11", "证明文件和知识文档必须通过类型、大小和受控路径校验，不能由用户指定任意服务器路径。"],
        ["BR12", "关键审核、账号、知识资料和工单操作必须生成可读审计日志。"],
    ], widths=[2.2, 13.6], font_size=9.1)

    add_heading(doc, "（九）非功能需求", 2)
    add_table(doc, ["类别", "需求说明"], [
        ["安全性", "密码使用 scrypt 哈希；接口采用 JWT；敏感操作记录审计；身份证号不保存明文；不同角色进行数据隔离。"],
        ["可靠性", "数据库迁移可重复执行；移动事件使用 client_event_id 幂等；已注销账号保留历史引用但不能登录。"],
        ["易用性", "页面提供加载、错误和空状态；审核数量使用红标提醒；日志支持关键词搜索、滚动和分页。"],
        ["可维护性", "前后端分离；路由按业务模块拆分；数据库模型和迁移集中管理；API 地址通过环境变量配置。"],
        ["可扩展性", "保留心理咨询督导角色扩展位；移动端、PC 端共同使用版本化 REST API。"],
        ["隐私性", "遵循最小必要原则，位置和心理数据仅向授权角色开放，演示数据需要匿名化。"],
    ], widths=[3.0, 12.6], font_size=9.5)

    add_heading(doc, "（十）可行性与风险分析", 2)
    add_body(doc, "技术可行性方面，React、Vite、FastAPI、SQLAlchemy 和 SQL Server 均为成熟技术，开发工具和文档完善。前后端通过版本化 REST API 解耦，PC 与移动端可以复用认证和业务接口；Alembic 使数据库结构变化可追踪，降低多人或多环境部署时的结构差异。现有代码已经形成后端路由、数据模型、PC 角色工作台和自动化测试基础，因此不是从零开始设计。")
    add_body(doc, "经济可行性方面，项目主要使用开源框架，本地开发可依托现有计算机、SQL Server Express 或开发者版。试运行阶段的主要成本来自云服务器、域名与 HTTPS 证书、对象存储、短信或邮件服务以及数据备份。与购买完整商业心理服务平台相比，自主开发能够更贴近学校流程，但后续必须投入持续运维、安全审计和专业内容审核成本。")
    add_body(doc, "操作可行性方面，工作人员 PC 端采用高校管理人员熟悉的“概览—列表—详情—处理”结构，角色登录后只显示与职责相关的菜单；审核中心使用待办数量、状态标签和处理意见减少遗漏。学生端以登录、求助、SOS、联系人和处理进度等少量高频操作为主。时间可行性方面，本次实训优先完成 PC 管理端和统一后端，手机端按真实完成度展示，避免因为追求页面数量而牺牲核心闭环。")
    add_table(doc, ["风险", "可能影响", "控制措施"], [
        ["敏感数据泄露", "身份、位置或咨询数据被越权读取", "最小权限、脱敏、HTTPS、审计、生产密钥管理"],
        ["误报或漏报", "工作人员资源被错误调度或风险未及时处理", "保留人工判断、明确状态、支持补充信息和升级处理"],
        ["移动端断网", "位置或求助事件无法及时上传", "SQLite 仅作缓存与 outbox，恢复网络后按事件编号幂等同步"],
        ["文件内容不合规", "错误资料进入知识库", "分领域审核、退回修改、发布与下架分离"],
        ["服务不可用", "登录、上报和处理暂时中断", "健康检查、日志监控、数据库备份和恢复预案"],
        ["项目范围膨胀", "有限时间内无法形成稳定成果", "以账号和工单闭环为验收基线，智能功能后置"],
    ], widths=[3.4, 5.5, 6.9], font_size=9.0)
    add_figure(doc, figures["architecture"], "系统总体架构", width=Cm(14.2))

    add_heading(doc, "二、业务流程图", 1)
    add_heading(doc, "（一）总体业务流程", 2)
    add_body(doc, "系统总体流程围绕“身份可信、事件可追踪、处置有闭环、操作可审计”展开。学生和工作人员使用不同认证入口；工作人员还需要经过入驻审核。业务事件进入系统后，不直接在页面之间传递临时数据，而是形成预警、工单、干预记录等持久化对象。这样既便于后续查询统计，也避免人员变动导致历史责任链丢失。")
    add_figure(doc, figures["business"], "预警与工单闭环业务流程", width=Cm(14.5))

    add_heading(doc, "（二）工作人员入驻审核流程", 2)
    add_numbered(doc, [
        "申请人选择辅导员、心理咨询师或心理中心负责人角色，填写工作邮箱和密码完成账号注册。",
        "系统将账号置为资料待完善状态，只允许访问个人资料页面。",
        "申请人提交手机号、机构、部门、学院、工号、身份证号和任职证明。",
        "管理员在审核中心查看申请，可执行通过、退回修改或拒绝。",
        "审核通过后写入正式档案并启用对应工作台；退回时保留原证明并允许再次提交。",
        "重要资料变更继续走复审流程，旧资料在新申请通过前保持有效。",
    ])
    add_figure(doc, figures["staff_onboarding"], "工作人员自主入驻与复审流程", width=Cm(14.6))
    add_table(doc, ["申请状态", "允许的操作", "系统处理"], [
        ["资料待完善", "编辑基本资料、上传证明", "禁止访问正式工作台"],
        ["待审核", "查看申请，不允许直接改写审核版本", "进入管理员审核中心并计入待办"],
        ["退回修改", "修改资料、复用或替换原证明、再次提交", "保留退回意见和历史申请"],
        ["审核通过", "进入角色工作台；后续可提交资料变更", "建立正式档案并启用账号"],
        ["审核拒绝", "查看拒绝原因", "账号不进入正式工作台"],
        ["停用/注销", "停止业务访问", "停用可恢复；注销使令牌失效并隐藏账号"],
    ], widths=[3.2, 6.3, 6.3], font_size=9.1)
    add_body(doc, "入驻审核的异常分支包括邮箱已存在、证明文件类型不合法、文件超过大小限制、身份证号摘要冲突以及审核期间重复提交。后端应返回稳定的错误代码和明确的中文提示，前端不能因为 Pydantic 错误数组或网络异常而白屏。退回修改不删除原证明，是为了避免申请人重复上传，也保证管理员能够对比前后版本。")

    add_heading(doc, "（三）知识资料审核流程", 2)
    add_body(doc, "投稿人先在资料管理中创建草稿，可修改元数据、替换文件或删除草稿。提交后资料进入待审核状态，投稿人不能直接改动，以保证审核对象稳定。具有对应领域审核权限的人员检查内容，执行通过、退回修改或拒绝；审核通过后再进行发布。管理员可以对已发布资料执行修改、替换文件、下架、恢复、重新处理图谱和永久删除等操作，所有关键操作写入审计日志。")
    add_figure(doc, figures["knowledge_lifecycle"], "知识资料生命周期", width=Cm(15.0))
    add_table(doc, ["资料状态", "责任人", "可执行操作", "状态转换"], [
        ["draft 草稿", "投稿人", "新增、查询、修改、替换文件、删除、提交", "提交后转 submitted"],
        ["submitted 待审核", "领域审核人", "查看文件、填写意见、通过、退回或拒绝", "通过转 approved；退回转 draft"],
        ["approved 已通过", "负责人/管理员", "确认发布", "发布后转 published"],
        ["published 已发布", "管理员", "查看、下载、替换文件、下架、重新处理图谱", "下架转 archived"],
        ["archived 已下架", "管理员", "恢复、永久删除", "恢复转 published"],
    ], widths=[3.1, 3.1, 6.5, 3.1], font_size=8.9)
    add_body(doc, "心理专业资料和学生工作政策虽然共用知识资料表和生命周期，但审核责任不同。心理中心负责人主要判断心理学内容的专业性、适用范围和风险提示；管理员负责学生工作政策及系统层面的发布管理。这样既避免让心理中心负责人承担不属于其职责的行政政策审核，也避免管理员直接替代专业人员判断心理学内容。")

    add_heading(doc, "（四）预警工单状态与异常处理", 2)
    add_body(doc, "学生端提交主动求助、SOS 或其他风险事件后，后端先验证学生身份和事件编号，再在同一事务中保存预警并创建工单。工单初始为待处理状态，可根据学生归属、事件来源和业务规则分配给辅导员或心理咨询师。工作人员接受后进入处理中，至少形成一条处置或干预记录后才能完成；若超出当前人员能力或职责范围，可以转介并保留原责任链。")
    add_table(doc, ["工单状态", "进入条件", "允许操作", "退出条件"], [
        ["pending 待处理", "预警成功创建", "查看、分配、接受、标记优先级", "被工作人员接受或分配"],
        ["processing 处理中", "已有责任人", "联系学生、补充记录、转介、升级", "形成有效处置结论"],
        ["transferred 已转介", "原处理人发起转介", "新责任人接受并继续记录", "新责任人进入处理"],
        ["completed 已完成", "处置记录和结论完整", "查看历史，不直接删除", "终态；必要时新建关联事件"],
    ], widths=[3.0, 4.0, 5.4, 3.4], font_size=9.0)
    add_body(doc, "重复上报、数据库写入失败和无权处理是工单流程中的关键异常。重复 client_event_id 返回已有业务结果，不再创建新工单；预警保存和工单创建必须处于同一事务，任何一步失败都回滚；工作人员访问不属于本人数据范围的工单时返回 403，而不是返回空白详情或依靠前端隐藏按钮。")

    add_heading(doc, "（五）账号注销与审计流程", 2)
    add_body(doc, "管理员可以停用或注销普通工作人员账号。停用可恢复，注销则立即使旧 JWT 失效，并从工作人员管理列表隐藏。系统采用软注销而不是物理删除，原因是该账号可能已经处理过工单、提交过资料或形成过干预记录。保留账号主键和审计引用可以维持历史数据完整性，同时账号本人不能再次登录。")

    add_heading(doc, "三、数据流图", 1)
    add_heading(doc, "（一）系统上下文数据流", 2)
    add_body(doc, "外部实体包括学生和工作人员。学生向系统提交注册资料、位置事件、预警和主动求助，系统返回登录凭证和处理状态；工作人员提交入驻资料、处置结果、咨询记录和知识文档，系统返回审核结果、业务列表和统计信息。统一后端承担账号权限、预警工单、知识资料和统计审计四类处理，数据分别进入用户档案库、预警工单库、知识资料库和审计日志库。")
    add_figure(doc, figures["context_dfd"], "系统上下文数据流图", width=Cm(15.0))
    add_body(doc, "上下文数据流图将 HERE 视为一个整体处理过程，强调系统与外部参与者之间交换什么信息。学生端和工作人员端是主要业务输入来源；管理员虽然也使用 PC 页面，但在数据流上承担审核、配置和审计职责，因此单独列出；SMTP、受控文件目录和后续知识图谱服务归为外部服务。外部服务只接收完成任务所需的最少数据，不能绕过统一后端直接读取业务数据库。")

    add_heading(doc, "（二）一级数据流分解", 2)
    add_figure(doc, figures["dfd"], "一级数据流图", width=Cm(14.0))
    add_body(doc, "一级数据流图把系统分解为 P1 账号与权限管理、P2 预警与工单处理、P3 知识与资料管理、P4 统计与审计四个主要处理。P1 为其他处理提供可信身份和权限上下文；P2 负责高时效的学生风险事件；P3 负责相对稳定的知识内容生命周期；P4 从前三类业务中读取汇总和审计信息，但不反向修改原始业务记录。该分解避免把所有功能堆在一个页面或一个后端路由中。")

    add_heading(doc, "（三）主要数据流说明", 2)
    add_table(doc, ["编号", "数据流", "来源", "去向", "主要数据项"], [
        ["F1", "学生认证信息", "学生", "账号与权限管理", "手机号、密码、显示名称"],
        ["F2", "工作人员申请", "工作人员", "账号与权限管理", "邮箱、角色、机构、证明文件"],
        ["F3", "位置事件", "学生移动端", "预警与工单处理", "事件编号、坐标、精度、时间"],
        ["F4", "预警信息", "学生移动端", "预警与工单处理", "类别、等级、描述、位置"],
        ["F5", "工单处置", "辅导员/咨询师", "预警与工单处理", "工单编号、处置说明、状态"],
        ["F6", "知识投稿", "工作人员", "知识与资料管理", "名称、领域、分类、文件"],
        ["F7", "审核结果", "负责人/管理员", "知识与资料管理", "审核动作、意见、发布时间"],
        ["F8", "审计查询", "管理员", "统计与审计", "关键词、页码、每页条数"],
    ], widths=[1.5, 3.0, 2.8, 3.3, 5.2], font_size=8.8)

    add_heading(doc, "（四）数据存储说明", 2)
    add_body(doc, "D1 用户与档案存储学生账号、工作人员账号、学生归属和工作人员任职信息；D2 预警与工单存储位置事件、预警、工单、咨询分配和干预记录；D3 知识资料保存文档元数据、文件位置、审核状态和图谱处理状态；D4 审计日志保存操作者、动作、资源和时间。文件本体与结构化数据库分开管理，数据库只保存受控路径和元数据。")
    add_table(doc, ["数据存储", "主要表", "写入来源", "读取对象", "保存要求"], [
        ["D1 用户与档案", "student_users、student_profiles、staff_users、staff_profiles", "注册、入驻审核、资料变更", "认证模块和授权业务模块", "账号唯一、敏感字段摘要化、状态可追踪"],
        ["D2 预警与工单", "location_events、alerts、work_orders、interventions", "学生事件、工作人员处置", "授权辅导员、咨询师和统计模块", "事件幂等、预警工单事务一致、历史不物理删除"],
        ["D3 知识资料", "knowledge_documents 及文件元数据", "投稿、审核、发布和运营维护", "各角色知识库页面", "文件路径受控、状态转换合法、版本可追踪"],
        ["D4 审计日志", "audit_logs", "关键业务服务自动写入", "系统管理员", "操作者和资源可解析、日志不可由普通用户修改"],
    ], widths=[2.6, 4.4, 3.5, 3.2, 4.0], font_size=8.5)

    add_heading(doc, "（五）主要处理逻辑说明", 2)
    add_table(doc, ["处理", "输入", "主要处理规则", "输出"], [
        ["P1 账号与权限管理", "登录凭证、注册资料、入驻申请", "校验唯一性和密码强度；加载账号状态、角色和数据范围；审核后才启用工作台", "JWT、账号状态、角色权限、审核结果"],
        ["P2 预警与工单处理", "位置事件、求助、SOS、处置记录", "按 client_event_id 幂等；同事务生成预警和工单；按归属或授权限制访问", "预警、工单、干预记录、处理状态"],
        ["P3 知识与资料管理", "文档、元数据、审核动作", "校验文件；按领域选择审核人；按状态限制修改；发布后记录图谱任务状态", "投稿列表、审核结果、正式知识库"],
        ["P4 统计与审计", "业务状态、关键操作、查询条件", "聚合数量和趋势；解析操作者与资源；执行关键词搜索和服务端分页", "角色概览、待办数量、审计日志"],
    ], widths=[3.1, 4.0, 6.3, 4.0], font_size=8.8)

    add_heading(doc, "（六）关键数据项字典", 2)
    add_body(doc, "数据字典用于统一前端、后端和数据库对同一字段的理解。对于状态、角色和领域，数据库保存稳定英文代码，前端再映射为中文显示；对于敏感信息，字典同时规定存储和展示方式，避免不同页面各自处理。")
    add_table(doc, ["数据项", "含义", "类型/格式", "校验与处理"], [
        ["student_id", "学生账号主键", "UUID 字符串", "由服务端生成，不允许客户端修改"],
        ["staff_user_id", "工作人员账号主键", "UUID 字符串", "与正式档案、申请、工单和审计关联"],
        ["client_event_id", "移动端事件幂等编号", "不超过 64 字符", "同一学生范围内唯一，离线重试保持不变"],
        ["severity", "预警等级", "low/medium/high/critical", "只接受枚举值，前端显示中文"],
        ["account_status", "工作人员账号状态", "稳定状态代码", "由业务流程转换，普通用户不能直接指定"],
        ["document_status", "知识资料状态", "draft/submitted/approved/published/archived", "按生命周期转换，越级操作返回冲突错误"],
        ["domain", "知识资料领域", "psychology/student_affairs", "决定审核范围和展示栏目"],
        ["id_number_hash", "身份证号不可逆摘要", "固定长度字符串", "服务端计算，不向前端返回"],
        ["id_number_last4", "身份证号末四位", "4 位数字", "仅用于掩码确认，不作为认证凭证"],
        ["auth_version", "令牌版本", "非负整数", "密码变化或注销时递增，旧 JWT 校验失败"],
        ["created_at/updated_at", "创建与更新时间", "带时区日期时间", "服务端生成，统一返回标准时间格式"],
    ], widths=[3.6, 4.3, 4.1, 5.4], font_size=8.7)

    add_heading(doc, "四、E-R图", 1)
    add_heading(doc, "（一）实体识别", 2)
    add_body(doc, "根据业务需求，系统的核心实体包括学生账号、学生档案、工作人员账号、工作人员档案、入驻申请、位置事件、预警、处置工单、干预记录、咨询分配、知识资料和审计日志。账号实体负责身份，档案实体负责业务属性，两者分离可以避免认证字段与经常变更的资料字段耦合。预警与工单采用一对一关系，工单与干预记录采用一对多关系，使一次风险事件能够记录多次联系、转介和处理动作。")
    add_figure(doc, figures["er"], "核心实体关系图", width=Cm(14.2))

    add_heading(doc, "（二）主要实体关系", 2)
    add_table(doc, ["实体 A", "关系", "实体 B", "基数", "业务含义"], [
        ["StudentUser", "拥有", "StudentProfile", "1:0..1", "学生账号可逐步完善一份档案"],
        ["StudentUser", "产生", "LocationEvent", "1:N", "一个学生产生多条位置事件"],
        ["StudentUser", "产生", "Alert", "1:N", "一个学生可产生多次预警"],
        ["Alert", "生成", "WorkOrder", "1:1", "每条预警对应一个处置工单"],
        ["WorkOrder", "包含", "Intervention", "1:N", "工单可包含多次干预动作"],
        ["StaffUser", "处理", "WorkOrder", "1:N", "工作人员可被分配多个工单"],
        ["StaffUser", "提交", "KnowledgeDocument", "1:N", "工作人员可提交多份知识资料"],
        ["StaffUser", "产生", "AuditLog", "1:N", "关键操作形成审计记录"],
    ], widths=[3.0, 2.0, 3.4, 2.0, 5.4], font_size=8.2)

    add_heading(doc, "（三）核心实体属性说明", 2)
    add_table(doc, ["实体", "标识属性", "主要业务属性", "生命周期特征"], [
        ["StudentUser", "id、phone", "password_hash、display_name、status", "注册后启用；停用时不能登录"],
        ["StudentProfile", "id、student_id", "学号、学院、专业、班级、辅导员", "可逐步完善，归属关系可调整"],
        ["StaffUser", "id、email", "role、account_status、review_scopes、auth_version", "待完善、待审核、启用、停用、注销"],
        ["StaffProfile", "id、staff_user_id", "机构、部门、学院、工号、身份摘要", "审核通过后形成，资料变更需复审"],
        ["StaffApplication", "id、applicant_id", "申请类型、提交资料、审核意见、状态", "提交、通过、退回、拒绝"],
        ["LocationEvent", "id、client_event_id", "坐标、精度、事件类型、记录时间", "高频追加，只按授权查询"],
        ["Alert", "id、student_id", "类别、等级、描述、状态、位置", "创建后进入处置，保留历史"],
        ["WorkOrder", "id、alert_id", "责任人、优先级、状态、结论", "待处理、处理中、转介、完成"],
        ["Intervention", "id、work_order_id", "工作人员、动作类型、记录内容、时间", "随处置过程追加，不覆盖历史"],
        ["KnowledgeDocument", "id、owner_id", "名称、领域、分类、文件、审核与图谱状态", "草稿到发布、下架的完整生命周期"],
        ["AuditLog", "id", "操作者、动作、资源、详情、时间", "关键操作追加写入，普通用户不可修改"],
    ], widths=[3.2, 3.5, 6.1, 4.6], font_size=8.5)

    add_heading(doc, "（四）关系设计说明", 2)
    add_body(doc, "系统采用 UUID 作为主要业务实体主键，降低多端生成数据和后续迁移时的冲突风险；位置事件使用整数主键提高连续写入效率，同时以 student_id 与 client_event_id 建立唯一约束。外键用于维护业务关系，软注销用于维护历史责任链。对位置事件按学生和记录时间建立组合索引，对预警等级、工单状态、账号角色、资料状态等高频过滤字段建立索引。")
    add_body(doc, "学生账号与学生档案分离、工作人员账号与工作人员档案分离，是本模型的重要设计。账号表保存登录所需的稳定字段，档案表保存学院、部门和归属等可能变化的业务属性。这样修改个人资料时无需触碰密码哈希和令牌版本，也便于对资料变更单独审核。入驻申请不直接覆盖正式档案，审核通过后再在事务中更新正式记录，保证审核期间系统仍使用上一份有效资料。")
    add_body(doc, "预警与工单采用一对一主关系，保证每次风险事件只有一个主处置入口；联系、转介、回访和结案通过 Intervention 一对多记录。知识资料分别关联投稿人、审核人和发布人，用于区分三类责任。")

    add_heading(doc, "（五）规范化与历史数据设计", 2)
    add_body(doc, "数据库设计基本满足第三范式。第一范式要求字段保持原子性，例如学院、专业和班级分别存储，不把完整组织描述塞入一个字段；第二范式要求非主属性完整依赖主键，例如干预记录的动作类型和说明依赖 intervention.id，而不是依赖工单编号的一部分；第三范式要求非主属性之间不存在不必要的传递依赖，例如角色中文名称不重复保存在每条工单中，而是由 staff_users.role 在展示层映射。")
    add_body(doc, "对于需要保留历史责任链的数据，系统采用软状态而不是直接物理删除。工作人员注销后，staff_users 主记录仍保留，工单、投稿和审计外键继续有效；页面默认过滤 closed 状态，认证模块拒绝其登录。知识资料的普通下架也不删除记录，只有管理员执行明确的永久删除操作时才删除文件和元数据，并且该动作仍需写入审计日志。")

    add_heading(doc, "五、数据库设计", 1)
    add_heading(doc, "（一）数据库选型与设计原则", 2)
    add_body(doc, "统一业务数据库采用 SQL Server，数据库名称为 HerePlatform，后端通过 SQLAlchemy ORM 访问，Alembic 管理版本迁移。SQL Server 能够满足本实训中结构化数据、事务、索引、Unicode 中文字段和关系约束需求。移动端 SQLite 不再作为唯一业务数据库，而是逐步调整为本地缓存和离线待上传队列。")
    add_bullets(doc, [
        "规范性：账号、档案、申请、业务事件分表设计，避免大量重复字段。",
        "一致性：预警和工单在同一事务中创建，关键关系使用外键和唯一约束。",
        "安全性：密码只保存哈希；身份证号只保存摘要和末四位；审计日志不记录密码。",
        "可追溯性：重要表保存创建时间、更新时间、状态和操作者关联。",
        "可扩展性：知识领域、角色和状态使用稳定代码值，前端再映射为中文。",
    ])

    add_heading(doc, "（二）核心数据表总览", 2)
    add_table(doc, ["表名", "用途", "主键", "关键关系"], [
        ["student_users", "学生认证账号", "id", "与 student_profiles、alerts、location_events 关联"],
        ["student_profiles", "学生学籍及归属档案", "id", "student_id 唯一；counselor_id 指向工作人员"],
        ["staff_users", "工作人员认证、角色和状态", "id", "与档案、工单、资料、审计关联"],
        ["staff_profiles", "工作人员任职资料", "id", "staff_user_id 唯一"],
        ["staff_applications", "入驻和资料变更申请", "id", "关联申请人、审核人"],
        ["staff_credentials", "任职证明文件元数据", "id", "关联申请和工作人员"],
        ["location_events", "移动端位置事件", "id", "student_id + client_event_id 唯一"],
        ["alerts", "学生预警", "id", "关联学生；client_event_id 幂等"],
        ["work_orders", "预警处置工单", "id", "alert_id 唯一；assignee_id 可空"],
        ["interventions", "干预动作记录", "id", "关联工单和工作人员"],
        ["consultation_assignments", "学生与咨询师授权分配", "id", "关联学生和心理咨询师"],
        ["knowledge_documents", "知识资料与审核状态", "id", "关联投稿、审核和发布人员"],
        ["audit_logs", "关键操作审计", "id", "通过 actor_id、resource_id 保持责任链"],
    ], widths=[4.0, 5.0, 2.0, 4.8], font_size=8.6)

    add_heading(doc, "（三）主要数据表字段设计", 2)
    add_body(doc, "以下列出与核心业务闭环直接相关的数据表字段。完整字段以 Alembic 迁移和 SQLAlchemy 模型为准。")
    add_table(doc, ["表", "字段", "类型", "约束/说明"], [
        ["student_users", "id", "varchar(36)", "主键，UUID"],
        ["student_users", "phone", "varchar(32)", "唯一索引，学生登录账号"],
        ["student_users", "password_hash", "varchar(255)", "scrypt 哈希"],
        ["student_users", "display_name", "nvarchar(100)", "学生显示名称"],
        ["student_users", "status", "varchar(32)", "active 等账号状态"],
        ["student_profiles", "student_number", "varchar(64)", "学号，可空且唯一"],
        ["student_profiles", "college/major/class_name", "nvarchar", "学院、专业和班级"],
        ["student_profiles", "counselor_id", "varchar(36)", "外键，归属辅导员"],
    ], widths=[3.2, 4.0, 3.4, 5.2], font_size=8.8)

    add_table(doc, ["表", "字段", "类型", "约束/说明"], [
        ["staff_users", "id", "varchar(36)", "主键，UUID"],
        ["staff_users", "email", "varchar(255)", "唯一索引，登录邮箱"],
        ["staff_users", "role", "varchar(32)", "counselor/psychologist/center_director/admin"],
        ["staff_users", "account_status", "varchar(32)", "资料待完善、待审核、启用、停用、注销"],
        ["staff_users", "review_scopes", "varchar(100)", "心理专业或学生工作政策审核范围"],
        ["staff_users", "auth_version", "int", "修改密码或注销时递增，使旧 JWT 失效"],
        ["staff_profiles", "employee_number", "varchar(64)", "工作人员工号"],
        ["staff_profiles", "id_number_hash/last4", "varchar", "身份证摘要及末四位，不保存明文"],
    ], widths=[3.2, 4.0, 3.4, 5.2], font_size=8.8)

    add_table(doc, ["表", "字段", "类型", "约束/说明"], [
        ["alerts", "client_event_id", "varchar(64)", "与 student_id 组成唯一约束"],
        ["alerts", "category", "varchar(50)", "SOS、主动求助、围栏等类别"],
        ["alerts", "severity", "varchar(20)", "low/medium/high/critical"],
        ["alerts", "status", "varchar(32)", "open/resolved 等"],
        ["alerts", "latitude/longitude", "float", "可空，仅在授权场景记录"],
        ["work_orders", "alert_id", "varchar(36)", "唯一外键，一条预警一个工单"],
        ["work_orders", "assignee_id", "varchar(36)", "负责工作人员，可空"],
        ["work_orders", "status/priority", "varchar", "待处理、处理中、已完成及优先级"],
        ["work_orders", "resolution_note", "nvarchar(max)", "处置结论"],
        ["interventions", "action_type/note", "varchar/nvarchar(max)", "干预类型和记录"],
    ], widths=[3.2, 4.0, 3.4, 5.2], font_size=8.8)

    add_table(doc, ["表", "字段", "类型", "约束/说明"], [
        ["knowledge_documents", "name", "nvarchar(255)", "资料名称"],
        ["knowledge_documents", "storage_path", "nvarchar(500)", "受控文件路径"],
        ["knowledge_documents", "domain", "varchar(32)", "psychology/student_affairs"],
        ["knowledge_documents", "status", "varchar(32)", "draft/submitted/approved/published/archived"],
        ["knowledge_documents", "graph_status", "varchar(32)", "知识图谱处理状态"],
        ["audit_logs", "actor_type/actor_id", "varchar", "操作者类型与标识"],
        ["audit_logs", "action", "varchar(100)", "稳定动作代码，前端映射中文"],
        ["audit_logs", "resource_type/resource_id", "varchar", "被操作资源"],
        ["audit_logs", "detail/created_at", "nvarchar/datetime", "补充信息与时间"],
    ], widths=[3.2, 4.0, 3.4, 5.2], font_size=8.8)

    add_heading(doc, "（四）数据库完整性与索引", 2)
    add_body(doc, "实体完整性由主键保证；参照完整性由外键维护；域完整性通过字段长度、非空约束、枚举校验和 Pydantic 输入模型共同实现。手机号、邮箱、学号、预警客户端事件编号等字段建立唯一约束。工单状态、预警等级、角色、资料状态和记录时间属于高频筛选项，设置普通或组合索引。后端所有写操作通过事务提交，异常时回滚，避免只生成预警却没有工单等半完成状态。")
    add_table(doc, ["约束/索引", "作用对象", "设计目的"], [
        ["UQ_student_phone", "student_users.phone", "保证学生手机号账号唯一"],
        ["UQ_staff_email", "staff_users.email", "保证工作人员登录邮箱唯一"],
        ["UQ_student_number", "student_profiles.student_number", "避免同一学号对应多个有效档案"],
        ["UQ_student_client_event", "location_events/alerts 的 student_id + client_event_id", "支持移动端断网重试而不重复生成业务事件"],
        ["UQ_work_order_alert", "work_orders.alert_id", "保证一条预警只有一个主工单"],
        ["IX_location_student_time", "location_events.student_id + recorded_at", "加速按学生和时间查询轨迹事件"],
        ["IX_work_order_status", "work_orders.status + priority", "加速待办和优先级列表"],
        ["IX_document_domain_status", "knowledge_documents.domain + status", "加速分领域审核和正式知识库查询"],
        ["IX_audit_created_at", "audit_logs.created_at", "加速最近操作和时间范围审计"],
    ], widths=[4.2, 5.4, 6.2], font_size=8.7)

    add_heading(doc, "（五）事务与并发一致性设计", 2)
    add_body(doc, "管理信息系统不仅要把数据保存下来，还要保证多张表之间的业务一致性。学生提交预警时，后端在一个数据库事务中完成预警写入和工单创建；任意一步异常都回滚，防止出现“有预警无工单”或“有工单找不到来源”的孤立数据。管理员审核工作人员申请时，也在同一事务中更新申请状态、账号状态、正式档案和审计日志，使页面看到的结果与实际权限同步。")
    add_body(doc, "移动端可能因为网络超时重复发送同一事件。系统不能仅依靠前端按钮防重复，而应使用 student_id 与 client_event_id 的唯一约束作为最终防线。第一次请求成功后，即使客户端没有收到响应，再次提交也能识别为同一事件并返回已有结果。知识资料审核则需要校验当前状态，只有 submitted 才允许审核；两个审核人同时操作时，后提交者应得到状态冲突提示，而不是覆盖先前结果。")
    add_table(doc, ["业务事务", "涉及数据", "一致性要求", "失败处理"], [
        ["学生预警上报", "alerts、work_orders、audit_logs", "预警和主工单同时成功，事件编号唯一", "整体回滚或返回已有事件"],
        ["工作人员入驻通过", "staff_applications、staff_users、staff_profiles、audit_logs", "申请、账号和正式档案状态一致", "回滚并保留待审申请"],
        ["密码重置", "reset_tokens、staff_users", "令牌只能使用一次，新密码生效后旧会话失效", "无效或过期令牌拒绝修改"],
        ["知识资料审核", "knowledge_documents、audit_logs", "只允许从当前合法状态转换", "状态冲突返回 409，不覆盖结果"],
        ["账号软注销", "staff_users、audit_logs", "停止登录但保留历史外键", "注销失败时不改变 auth_version"],
    ], widths=[3.6, 5.2, 5.4, 4.0], font_size=8.7)

    add_heading(doc, "（六）数据库迁移与旧数据处理", 2)
    add_body(doc, "数据库结构由 Alembic 迁移脚本管理。开发人员修改 SQLAlchemy 模型后，需要生成或编写迁移脚本，并通过 upgrade head 将目标数据库升级到最新 revision。迁移文件进入 Git 版本控制，使测试机和生产机能够按相同顺序演进，避免直接在 SSMS 中临时改表导致代码与数据库结构不一致。迁移脚本应支持重复检查和明确失败，正式执行前必须备份数据库。")
    add_body(doc, "旧版 here.db 中的 SQLite 数据不再作为权威业务数据，只作为历史迁移来源。导入脚本读取旧记录、转换主键和中文字段、检查目标表是否已存在相同业务键，再写入 SQL Server，因此重复执行不会产生重复数据。导入完成后保留旧文件用于核对，但应用运行时只连接 HerePlatform。手机端 SQLite 的定位也随之改变：保存短期缓存、离线事件和待同步队列，而不是保存全校唯一账号和工单。")

    add_heading(doc, "（七）备份、恢复与数据生命周期", 2)
    add_body(doc, "生产环境至少应实施数据库定期完整备份、日志或差异备份以及文件目录备份。数据库备份和任职证明、知识文档文件必须使用同一批次标识，避免恢复后数据库记录指向不存在的文件。备份文件应加密并放置在与业务服务器不同的存储位置，定期执行恢复演练，而不是只确认备份任务显示成功。")
    add_table(doc, ["数据类型", "建议保留策略", "清理或归档原则"], [
        ["账号与正式档案", "在校或任职期间持续保留", "注销后进入限制访问状态，保留历史责任引用"],
        ["位置事件", "按学校制度设置较短保留期", "到期后删除精确坐标或转为匿名统计"],
        ["预警、工单和干预记录", "按安全与心理服务档案制度保留", "归档后只允许授权查询，不允许普通物理删除"],
        ["任职证明文件", "任职及必要审计期间保留", "注销并超过制度期限后安全删除"],
        ["知识资料", "发布期间及版本追踪期间保留", "下架后归档；永久删除需管理员明确操作和审计"],
        ["审计日志", "按安全审计要求保留", "定期归档，只允许追加和受控查询"],
    ], widths=[3.5, 6.0, 6.3], font_size=9.0)

    add_heading(doc, "六、系统实现", 1)
    add_heading(doc, "（一）开发环境与技术栈", 2)
    add_table(doc, ["层次", "采用技术", "作用"], [
        ["PC 前端", "React 19、Vite、Tailwind CSS、Axios、Chart.js", "四角色工作台、查询审核、统计展示"],
        ["移动端", "Expo 54、React Native 0.81、TypeScript、SQLite、MMKV", "学生端原型、定位、SOS、联系人和离线能力"],
        ["后端", "Python、FastAPI、SQLAlchemy、Pydantic、PyJWT", "REST API、业务规则、认证鉴权"],
        ["数据库", "SQL Server、Alembic", "统一数据存储和版本迁移"],
        ["测试", "Pytest、HTTPX、ESLint、TypeScript", "接口流程、输入校验和静态检查"],
        ["开发工具", "PyCharm、VS Code、SSMS、Git", "代码开发、数据库管理和版本控制"],
    ], widths=[2.6, 7.0, 6.2], font_size=9.2)

    add_heading(doc, "（二）PC 前端结构实现", 2)
    add_body(doc, "PC 端采用 React 组件化实现，Vite 负责开发服务器和生产构建。AppWorkspace 读取当前登录账号的 role，并从 platforms.js 加载对应的平台标题、说明和导航菜单；AppShell 统一处理侧边栏、顶部标题和内容区域；具体业务页面按审核、账号、学生、个案、工单、知识和审计拆分。服务层 api.js 统一配置后端地址、Authorization 请求头和错误转换，避免每个页面重复拼接请求。")
    add_table(doc, ["前端模块", "主要文件/组件", "实现职责"], [
        ["应用入口与会话", "App.jsx、AppWorkspace.jsx、LoginPage.jsx", "登录状态恢复、角色路由、退出和账号状态处理"],
        ["平台框架", "AppShell.jsx、platforms.js", "四角色菜单、页面标题、导航和扩展角色占位"],
        ["页面状态", "PageState.jsx", "统一加载、空数据、错误和重试反馈"],
        ["审核中心", "ReviewCenterPage、StaffApplicationsPage、KnowledgeReviewPage", "入驻审核与资料审核聚合、待办数量提示"],
        ["学生与工单", "StudentsPage、CasesPage、WorkordersPage、AlertWorkorder", "数据范围内学生、个案和工单处理"],
        ["知识资料", "KnowledgeSubmissionsPage、KnowledgeBasePage、AdminKnowledgePage", "投稿 CRUD、审核、发布和批量管理"],
        ["审计与账号", "AuditPage、StaffPage、StaffProfilePage", "审计搜索分页、账号状态和个人资料"],
        ["接口服务", "services/api.js", "API 地址、JWT 请求头、错误消息和文件请求"],
    ], widths=[3.2, 6.0, 6.6], font_size=8.8)
    add_body(doc, "前端页面不直接决定最终权限。它根据角色隐藏无关菜单、禁用不符合状态的按钮，并把用户操作转换成明确的 API 请求；真正的数据过滤、状态转换和越权拒绝由后端完成。页面需要同时处理加载中、空列表、网络错误、字段校验错误和会话失效五类状态，避免用户只能看到白屏或浏览器控制台错误。")

    add_heading(doc, "（三）统一后端实现", 2)
    add_body(doc, "后端采用 FastAPI，所有正式接口统一使用 `/api/v1` 前缀，并按 auth、mobile、admin、staff_profiles 和 knowledge 等路由模块拆分。SQLAlchemy 模型描述关系数据，Pydantic 模型校验请求范围，Alembic 记录数据库结构变化。开发环境可通过 OpenAPI 页面检查接口，生产环境则通过环境变量配置数据库连接、JWT 密钥、跨域来源和文件目录。")
    add_body(doc, "学生和工作人员使用同一套 JWT 技术，但令牌中包含 actor_type 和 role。后端依赖函数先校验 Bearer Token，再根据 actor_type 加载 StudentUser 或 StaffUser；工作人员接口继续检查账号是否启用和角色是否符合。工作人员修改密码、管理员注销账号时 auth_version 递增，使此前签发的令牌立即失效。")
    add_table(doc, ["后端模块", "核心职责", "典型输入/输出"], [
        ["auth", "工作人员注册登录、修改密码、忘记密码和令牌校验", "邮箱、密码、重置令牌、JWT"],
        ["mobile", "学生注册登录、位置事件和预警上报", "手机号、事件编号、位置、预警和受理结果"],
        ["staff_profiles", "个人资料、入驻申请、证明复用和资料变更", "multipart 表单、证明文件、申请状态"],
        ["admin", "审核、工作人员账号、工单、统计和审计", "审核动作、账号状态、分页查询"],
        ["knowledge", "知识投稿、审核、发布、下架、批量处理和文件下载", "文档、领域、状态、审核意见"],
        ["dependencies", "数据库会话、当前用户和角色依赖", "Bearer Token、SQLAlchemy Session"],
        ["security", "密码哈希、JWT 和敏感字段处理", "密码、令牌载荷、摘要值"],
        ["database/models/schemas", "连接、关系模型和输入输出校验", "SQL Server 数据与 Pydantic 对象"],
    ], widths=[3.2, 6.5, 6.1], font_size=8.8)

    add_heading(doc, "（四）认证、会话与权限控制", 2)
    add_body(doc, "登录时后端先按 actor_type 查找学生账号或工作人员账号，再使用 scrypt 验证密码哈希。验证成功后签发包含主体标识、角色、令牌版本和过期时间的 JWT。后续请求通过 Authorization: Bearer 头携带令牌，依赖函数验证签名和有效期，并比较令牌中的 auth_version 与数据库当前值。账号被停用、注销或修改密码后，即使旧令牌尚未到期，也会因为版本不一致而失效。")
    add_body(doc, "忘记密码流程采用一次性重置令牌。用户提交注册邮箱后，系统生成具有有效期的随机令牌并通过 SMTP 发送；生产环境不向浏览器返回令牌。重置接口同时校验令牌是否存在、是否过期、是否已使用以及新密码强度，成功后把令牌标记为已使用并递增 auth_version。该设计避免管理员查看或分发用户密码，也降低重置链接被重复利用的风险。")
    add_table(doc, ["控制层次", "校验内容", "失败结果"], [
        ["身份认证", "JWT 签名、过期时间、主体类型和账号是否存在", "返回 401，前端清除会话并回到登录页"],
        ["账号状态", "工作人员是否已通过审核且处于启用状态", "返回 403 或资料状态，引导到资料页面"],
        ["角色权限", "接口允许 counselor、psychologist、center_director 或 admin 中哪些角色", "返回 403，不执行数据库操作"],
        ["数据范围", "学生归属、个案分配、投稿所有者和审核领域", "过滤列表或拒绝访问指定资源"],
        ["资源状态", "工单、申请和知识资料当前状态是否允许目标操作", "返回 409 冲突并提示刷新页面"],
    ], widths=[3.1, 8.5, 4.2], font_size=9.0)

    add_heading(doc, "（五）工作人员注册与审核实现", 2)
    add_body(doc, "工作人员注册只创建待完善账号。申请资料使用 multipart/form-data 上传，后端验证文件类型和大小，将证明文件元数据与申请关联。管理员审核通过时，在事务中更新账号、正式档案和审核记录；退回修改时不删除已上传证明，申请人可以复用原文件。身份证号经过不可逆摘要处理，仅保存摘要和末四位，页面仅展示掩码。")
    add_screenshot_placeholder(doc, "工作人员登录与自主注册页面", "建议截取包含登录、忘记密码和申请账号入口的完整页面。")
    add_screenshot_placeholder(doc, "管理员审核中心", "建议同时展示入驻审核、资料审核标签页及红色待办数量。")

    add_heading(doc, "（六）角色工作台实现", 2)
    add_body(doc, "PC 前端根据登录用户 role 加载不同平台配置。辅导员工作台包括工作概览、我的学生、预警工单、干预档案、资料管理、工作知识库和个人资料；心理咨询师工作台包括工作概览、我的个案、转介工单、服务档案、资料管理、专业知识库和个人资料；心理中心负责人负责资料审核和知识发布；管理员负责审核中心、工作人员账号、知识库管理和审计日志。")
    add_body(doc, "菜单隔离只是用户体验层，真正的权限控制仍由后端完成。例如辅导员查询学生时，后端按 student_profiles.counselor_id 过滤；心理咨询师只能查询 consultation_assignments 中分配给自己的学生；管理员虽然拥有技术管理权限，但不默认获得咨询服务档案正文。")
    add_screenshot_placeholder(doc, "辅导员预警工单页面", "建议截取工单列表和一条工单详情，体现学生、来源、等级和处理状态。")
    add_screenshot_placeholder(doc, "心理咨询师授权个案页面", "建议截取个案列表，注意使用匿名演示数据。")

    add_heading(doc, "（七）知识资料与审计实现", 2)
    add_body(doc, "知识资料模块将文件存储与业务状态结合。投稿人只能编辑本人草稿，提交后进入审核；审核动作要求填写意见并校验领域权限；发布后进入知识图谱处理队列。管理员工作知识库支持分类查看、批量下架或恢复、替换文件和删除。审计日志将技术动作代码映射为中文名称，同时解析操作者姓名、账号和资源名称，支持关键词搜索、固定高度滚动、数字页码及每页条数选择。")
    add_screenshot_placeholder(doc, "管理员知识库管理页面", "建议展示已发布/已下架筛选、批量处理和单条操作按钮。")
    add_screenshot_placeholder(doc, "管理员审计日志页面", "建议展示搜索框、中文操作名称、操作者、资源和分页控件。")

    add_heading(doc, "（八）主要接口与异常处理", 2)
    add_body(doc, "系统接口遵循资源化和版本化原则。查询使用 GET，创建使用 POST，局部更新使用 PATCH 或 PUT，删除使用 DELETE；文件上传使用 multipart/form-data。接口返回稳定的 HTTP 状态码和结构化 JSON，前端服务层将字段级校验错误、业务冲突、权限错误和网络错误统一转换为用户可理解的中文提示。")
    add_table(doc, ["接口类别", "示例路径", "主要用途", "关键控制"], [
        ["健康检查", "/api/v1/health", "检查 API 与数据库可用性", "不返回密钥和敏感配置"],
        ["工作人员认证", "/api/v1/auth/*", "注册、登录、修改和重置密码", "密码强度、账号状态、令牌一次性"],
        ["学生移动端", "/api/v1/mobile/*", "学生认证、位置事件和预警上报", "学生 JWT、事件幂等"],
        ["个人资料", "/api/v1/staff-profile/*", "资料读取、申请和证明文件", "本人访问、文件校验、复审状态"],
        ["管理员", "/api/v1/admin/*", "审核、账号、统计、工单和审计", "管理员角色、分页和操作审计"],
        ["知识资料", "/api/v1/knowledge/*", "投稿 CRUD、审核、发布和批量管理", "所有者、领域权限、状态机"],
    ], widths=[3.0, 4.2, 5.0, 5.6], font_size=8.8)
    add_table(doc, ["状态码", "含义", "前端处理"], [
        ["200/201", "查询或创建成功", "更新页面状态并给出成功反馈"],
        ["400/422", "请求格式、字段或文件校验失败", "定位字段并显示明确原因，不白屏"],
        ["401", "未登录、令牌过期或令牌版本失效", "清除本地会话并跳转登录"],
        ["403", "角色或数据范围无权访问", "显示无权限提示，不继续重试"],
        ["404", "目标资源不存在或已不可见", "返回列表并提示资源状态可能已变化"],
        ["409", "资源状态冲突或重复事件", "刷新最新状态；幂等事件返回已有结果"],
        ["500", "服务器内部异常", "显示通用错误和重试入口，服务端记录详细日志"],
    ], widths=[2.5, 6.2, 7.1], font_size=9.0)

    add_heading(doc, "（九）手机端实现现状", 2)
    add_body(doc, "手机端已经形成 Expo/React Native 雏形，包含本地登录、身份选择、首页定位、报平安、紧急联系人、SOS、轨迹、电子围栏、统计和 AI 助手等页面，并可构建 Android 工程。但截至本报告草稿形成时，部分页面仍直接操作 assignment.db，本地账号曾使用明文密码和假令牌，AI 请求也仍需进一步统一到后端。")
    add_body(doc, "因此，本实训以完成度较高的 PC 管理端和统一后端为主体，手机端作为学生数据采集与服务入口的扩展原型。后端已经提供学生真实注册、登录、位置事件和预警接口，预警能够自动生成工单。下一阶段将把手机登录切换为真实 JWT，并把 SQLite 调整为缓存与离线 outbox，使断网事件恢复网络后可以幂等同步。报告和答辩不将模拟跌倒、自动失联和硬件占位描述为已完成的生产功能。")
    add_table(doc, ["手机端模块", "当前状态", "统一后端后的目标"], [
        ["登录与身份", "已有本地登录和身份路由，部分仍是假令牌", "学生真实注册登录、JWT 安全存储和会话过期处理"],
        ["定位与轨迹", "已有定位、轨迹和围栏相关页面", "位置事件按授权上传，SQLite 保存短期缓存和离线队列"],
        ["主动求助与 SOS", "已有交互雏形", "调用 mobile 预警接口并返回真实工单受理状态"],
        ["紧急联系人", "已有本地管理界面", "敏感联系人按最小必要原则同步或仅保存在设备侧"],
        ["统计与 AI", "已有本地统计和 DeepSeek 调用痕迹", "统一通过后端代理，避免密钥下发到 APK"],
        ["通知与反馈", "尚未形成完整生产闭环", "接入推送或站内通知，向学生反馈受理和结案状态"],
    ], widths=[3.2, 5.8, 6.8], font_size=8.9)

    add_heading(doc, "（十）系统部署与使用说明", 2)
    add_figure(doc, figures["deployment"], "系统部署拓扑", width=Cm(15.0))
    add_body(doc, "开发环境可以在同一台电脑上运行 Vite、FastAPI 和 SQL Server；生产环境则应将入口层、应用服务、数据库和文件存储按职责分离。浏览器和手机只通过 HTTPS 访问统一入口，入口层提供静态资源、TLS 和反向代理；FastAPI 位于内网，SQL Server 不向公网开放；证明文件和知识资料使用受控目录或对象存储；SMTP 只用于发送密码重置邮件。")
    add_numbered(doc, [
        "在 SQL Server 中创建 HerePlatform 数据库，配置后端 `.env` 数据库连接和 JWT 密钥。",
        "进入 backend 虚拟环境安装 requirements.txt，执行 `python -m alembic upgrade head`。",
        "执行 `python main.py` 启动 FastAPI，访问 `/api/v1/health` 检查数据库状态。",
        "进入 HERE-PC-Web，执行 `npm install` 和 `npm run dev`，通过 VITE_API_URL 指向后端。",
        "使用演示账号验证四种角色；正式部署前删除演示账号、关闭引导管理员并更换密钥。",
        "生产部署必须使用 HTTPS、受控跨域来源和独立文件存储目录，并定期备份 SQL Server。",
    ])
    add_body(doc, "正式上线前还需完成环境分离、日志集中化、反向代理、HTTPS 证书、登录限流、刷新令牌、邮件域名配置、文件病毒扫描、备份恢复演练和监控告警。演示账号、默认管理员引导参数和开发调试令牌必须删除。以上事项属于生产化验收条件，不能因为本机可以运行就视为已经满足。")

    add_heading(doc, "七、测试", 1)
    add_heading(doc, "（一）测试目标与环境", 2)
    add_body(doc, "测试目标是验证认证、权限、数据处理和主要业务流程能够按照设计运行，重点检查非法输入不会导致白屏、不同角色不能越权访问、重复移动事件不会创建重复工单、账号注销后不能登录以及审计日志能够准确展示。后端自动化测试使用独立的内存 SQLite，不修改本机 SQL Server；人工联调使用 SQL Server HerePlatform、FastAPI 本地服务和 Vite 开发服务器。")
    add_table(doc, ["测试对象", "环境/工具", "检查内容"], [
        ["后端 API", "Pytest + HTTPX + 内存 SQLite", "认证、权限、幂等、审核、工单、审计"],
        ["PC 前端", "Chrome/Edge + Vite", "页面渲染、加载/错误状态、搜索分页、角色菜单"],
        ["数据库", "SQL Server + SSMS + Alembic", "迁移版本、关系约束、中文字段、数据一致性"],
        ["移动端", "Android 真机/模拟器 + Expo Dev Client", "登录原型、定位、联系人、SOS 与页面导航"],
    ], widths=[3.0, 5.0, 7.8], font_size=9.3)

    add_heading(doc, "（二）测试方法与覆盖策略", 2)
    add_body(doc, "测试采用自动化接口测试、前端静态检查、数据库迁移验证和人工场景联调相结合的方法。接口测试重点验证输入输出、权限和状态转换；静态检查发现未使用变量、错误依赖和类型问题；迁移验证检查数据库 revision 与模型一致；人工联调从用户视角检查页面反馈、文件上传、搜索分页和多角色切换。对于尚未完成生产化的移动端功能，只验证原型页面和已有接口，不把未接通流程计为通过。")
    add_table(doc, ["测试方法", "适用内容", "覆盖重点", "证据"], [
        ["单元级验证", "密码哈希、安全工具函数", "同一密码不同盐值、正确验证和错误拒绝", "Pytest 断言"],
        ["端到端 API 测试", "注册、审核、知识、预警、工单和审计", "多角色流程、状态转换、权限和幂等", "HTTPX 请求与数据库断言"],
        ["前端静态检查", "React 页面和服务层", "语法、未使用变量、依赖和构建错误", "ESLint 与 Vite build 输出"],
        ["数据库迁移测试", "Alembic 与 SQL Server", "迁移顺序、revision、中文字段和约束", "Alembic current/head 与 SSMS"],
        ["人工场景测试", "PC 四角色工作台", "页面反馈、菜单、上传、审核、搜索和分页", "操作记录与截图"],
        ["移动端原型测试", "Expo 页面和 Android 构建", "页面导航、定位权限、SOS 交互和本地数据", "真机/模拟器运行记录"],
    ], widths=[3.0, 4.2, 6.0, 4.0], font_size=8.8)
    add_body(doc, "测试数据使用本地演示账号和匿名学生记录，不使用真实心理咨询内容。后端自动化测试连接独立的内存 SQLite，以避免修改本机 SQL Server；这类测试适合快速验证业务规则，但不能替代 SQL Server 的迁移、类型和并发验证，因此仍需在 HerePlatform 上执行人工联调。")

    add_heading(doc, "（三）功能测试用例", 2)
    add_table(doc, ["编号", "测试场景", "预期结果", "结果"], [
        ["T01", "工作人员输入非法邮箱或短密码注册", "页面显示字段级友好提示，不白屏", "通过"],
        ["T02", "工作人员注册后直接访问正式工作台", "只进入资料完善页面", "通过"],
        ["T03", "管理员退回入驻申请后再次提交", "原证明可复用，可修改邮箱等资料", "通过"],
        ["T04", "管理员通过申请", "账号启用并进入对应角色工作台", "通过"],
        ["T05", "辅导员查询学生", "只返回本人负责学生", "通过"],
        ["T06", "心理咨询师查询个案", "只返回分配且授权的个案", "通过"],
        ["T07", "心理中心负责人审核学生工作政策", "后端拒绝无权限操作", "通过"],
        ["T08", "投稿人创建、修改和删除草稿", "仅本人草稿允许增删改查", "通过"],
        ["T09", "已提交资料再次修改", "系统拒绝直接修改，需退回草稿", "通过"],
        ["T10", "管理员批量下架和恢复资料", "返回成功数量，列表状态同步更新", "通过"],
        ["T11", "学生重复上传同一 client_event_id 预警", "只创建一条预警和一个工单", "通过"],
        ["T12", "辅导员完成工单", "工单变为已完成并生成审计记录", "通过"],
        ["T13", "工作人员修改密码", "旧 JWT 失效，新密码可登录", "通过"],
        ["T14", "重置令牌重复使用", "第二次请求被拒绝", "通过"],
        ["T15", "管理员注销普通账号", "账号从列表隐藏且不能再次登录", "通过"],
        ["T16", "非管理员访问审计日志", "返回 403", "通过"],
        ["T17", "审计日志搜索中文操作名", "返回匹配记录并正确分页", "通过"],
        ["T18", "上传超出限制或不支持类型文件", "后端拒绝并返回明确错误", "通过"],
        ["T19", "数据库迁移重复执行", "保持幂等且 revision 为 head", "通过"],
        ["T20", "前端生产构建", "Vite 构建完成，无阻断错误", "通过"],
    ], widths=[1.4, 5.4, 6.2, 2.2], font_size=8.5)

    add_heading(doc, "（四）典型缺陷与修复", 2)
    add_table(doc, ["缺陷", "原因分析", "修复措施"], [
        ["非法注册数据导致白屏", "前端直接读取字符串错误，未处理 Pydantic 错误数组", "增加统一 API 错误转换和前端输入校验"],
        ["申请退回后证明文件需重新上传", "证明与单次申请绑定，页面未提供复用参数", "保留证明元数据并支持 reuse_credential_ids"],
        ["工作人员无法修改登录邮箱", "邮箱只保存在账号表，缺少审核变更流程", "把邮箱纳入资料申请，管理员通过后事务更新"],
        ["知识资料审核入口不明确", "管理员导航中入驻审核和资料审核分散", "合并为审核中心并增加红色数量提醒"],
        ["审计日志显示 UUID 和技术动作代码", "接口仅返回原始外键和 action", "后端解析姓名与资源，前端显示中文动作标签"],
        ["注销账号仍显示", "软注销后列表接口未过滤 closed", "查询层排除 closed，审计仍保留历史引用"],
        ["审计日志过长", "一次加载并纵向撑高页面", "增加服务端搜索、分页和固定滚动区域"],
    ], widths=[4.2, 5.4, 6.0], font_size=8.8)

    add_heading(doc, "（五）权限、安全与边界测试", 2)
    add_table(doc, ["测试类别", "测试场景", "预期控制"], [
        ["认证绕过", "无令牌、伪造令牌、过期令牌访问受保护接口", "统一返回 401，不泄露资源是否存在"],
        ["角色越权", "辅导员访问管理员审计或中心负责人审核行政政策", "返回 403，不执行任何写操作"],
        ["水平越权", "辅导员指定其他辅导员学生 ID，咨询师指定未授权个案 ID", "后端按归属或分配关系拒绝访问"],
        ["状态越权", "投稿人修改已提交资料、重复审核已处理申请", "返回 409，要求刷新当前状态"],
        ["文件安全", "上传超限、扩展名不允许或伪造路径的文件", "拒绝上传，服务端生成受控文件名"],
        ["敏感信息", "查询个人资料和审计日志", "身份证仅显示掩码，密码和令牌不进入日志"],
        ["账号失效", "停用、注销或修改密码后继续使用旧 JWT", "令牌版本不一致，立即拒绝访问"],
        ["重复请求", "重复上报同一 client_event_id", "返回同一业务结果，不新增预警和工单"],
    ], widths=[3.1, 7.0, 7.1], font_size=8.8)
    add_body(doc, "安全测试说明系统是否按设计拒绝不合法操作，但不能等同于专业渗透测试。正式上线前还需要增加登录速率限制、依赖漏洞扫描、恶意文件检测、生产密钥轮换、HTTPS 配置检查和第三方安全评估。尤其是位置和心理信息属于高敏感数据，生产环境需要结合学校制度确定访问审批、保留期限和事件响应流程。")

    add_heading(doc, "（六）性能、兼容性与可用性验证", 2)
    add_body(doc, "当前测试以功能正确性为主，尚未完成正式压力测试，因此报告不编造并发量和响应时间指标。现阶段可通过审计日志服务端分页、知识列表分页、数据库索引和查询范围过滤降低单次数据量；文件上传限制为 20MB，避免大文件占满应用内存。上线前应使用接近真实规模的匿名数据，对登录、待办列表、审计查询、预警上报和文件上传进行基准测试。")
    add_table(doc, ["验证方面", "当前检查", "上线前补充"], [
        ["浏览器兼容", "Chrome 与 Edge 开发环境页面操作", "不同分辨率、缩放比例和最新两个版本回归"],
        ["移动兼容", "Expo Dev Client 与 Android 原型", "多品牌 Android、权限拒绝、后台恢复和弱网"],
        ["查询性能", "分页、关键词搜索和主要索引", "十万级审计与位置数据的执行计划和压测"],
        ["文件处理", "类型和 20MB 大小限制", "并发上传、病毒扫描、对象存储和断点失败处理"],
        ["服务可用", "健康检查和本地启动", "进程守护、反向代理、监控告警和故障恢复演练"],
        ["可用性", "加载、错误、空状态和中文提示", "由辅导员、咨询师和管理员进行任务走查"],
    ], widths=[3.0, 6.1, 8.1], font_size=8.8)

    add_heading(doc, "（七）测试结论与不足", 2)
    add_body(doc, "测试结果表明，PC 管理端和统一后端已能够完成工作人员入驻、角色工作台、知识资料审核发布、学生预警生成工单、账号管理和审计查询等主要流程。后端端到端测试、前端 ESLint 和生产构建均已通过，SQL Server 迁移达到当前 head 版本。系统已满足管理信息系统实训对数据库关系、数据处理、综合查询、统计展示和业务流程的基本要求，也完成了从界面原型向可追踪管理流程的转变。")
    add_body(doc, "现阶段不足主要集中在移动端生产化和外部服务：手机端尚未全面切换到统一 JWT 和服务端资料，SQLite 离线队列仍需实现；真实消息推送、短信验证码、AI 后端代理、知识图谱生成和正式服务器部署尚未全部完成；跌倒、失联和深夜救援为原型演示，不应视为真实自动检测能力。后续将优先打通学生登录、主动求助、预警工单反馈闭环，再完善通知、隐私授权和运维监控。")

    normalize_document_typography(doc)
    doc.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    build_report()
