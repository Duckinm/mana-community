/**
 * Canonical Thai labels for the app's actual UI copy (mirrors apps/web/src/locales/th/*.json).
 * Injected into the Thai system prompt so the assistant references real menu/button
 * names instead of ad-hoc translating or mixing in English UI nouns.
 */
export const THAI_UI_GLOSSARY: Record<string, string> = {
  Documents: 'เอกสาร',
  Projects: 'โปรเจกต์',
  Tasks: 'งาน',
  Contacts: 'ผู้ติดต่อ',
  'Accounting / Transactions': 'รายการเดินบัญชี',
  Library: 'คลังเอกสาร',
  Calendar: 'ปฏิทิน',
  Settings: 'ตั้งค่า',
  Overview: 'ภาพรวม',
  'New Document': 'สร้างเอกสารใหม่',
  'New Project': 'สร้างโปรเจกต์',
  'New Contact': 'เพิ่มผู้ติดต่อ',
  View: 'ดู',
  Edit: 'แก้ไข',
  Save: 'บันทึก',
  Send: 'ส่ง',
  Archive: 'เก็บถาวร',
  Delete: 'ลบ',
  Cancel: 'ยกเลิก',
}

export function formatThaiGlossary(): string {
  const entries = Object.entries(THAI_UI_GLOSSARY)
    .map(([en, th]) => `${en} = "${th}"`)
    .join(', ')
  return `When mentioning UI menus, buttons, or sections, use these exact Thai labels (never mix in the English name or invent a translation): ${entries}.`
}
