// 二维码内容解析器

// 支持的普通分隔符
const SEPARATORS = ['/', '|', ',', '*', '#', ';', '\t'];

// 支持的括号分隔符格式（左括号 -> 右括号）
const BRACKET_PAIRS: Record<string, string> = {
  '{': '}',   // 花括号
  '(': ')',   // 小括号
  '[': ']',   // 中括号
  '<': '>',   // 尖括号
};

// 获取括号格式的分隔符标识（如 {} () [] <>）
const getBracketSeparator = (leftBracket: string): string => {
  return leftBracket + BRACKET_PAIRS[leftBracket];
};

// 检测是否为括号格式（如 {字段}{字段} 或 (字段)(字段)）
const detectBracketFormat = (content: string): string | null => {
  for (const leftBracket of Object.keys(BRACKET_PAIRS)) {
    const rightBracket = BRACKET_PAIRS[leftBracket];
    const separator = rightBracket + leftBracket; // 如 }{ 或 )( 
    
    if (content.startsWith(leftBracket) && content.includes(separator)) {
      return leftBracket;
    }
  }
  return null;
};

// 解析括号格式内容
const splitByBracket = (content: string, leftBracket: string): string[] => {
  const rightBracket = BRACKET_PAIRS[leftBracket];
  const separator = rightBracket + leftBracket; // 如 }{ 或 )(
  
  // 移除首尾的括号
  let str = content.trim();
  if (str.startsWith(leftBracket)) str = str.slice(1);
  if (str.endsWith(rightBracket)) str = str.slice(0, -1);
  
  // 用右括号+左括号分割
  return str.split(separator).map(s => s.trim()).filter(s => s.length > 0);
};

// 尝试用指定分隔符拆分内容
const splitBySeparator = (content: string, separator: string): string[] => {
  return content.split(separator).map(s => s.trim()).filter(s => s.length > 0);
};

// 自动检测分隔符
const detectSeparator = (content: string): string | null => {
  for (const sep of SEPARATORS) {
    const parts = splitBySeparator(content, sep);
    if (parts.length >= 2) {
      return sep;
    }
  }
  return null;
};

/**
 * 检测是否为二维码内容
 * 二维码包含分隔符，一维码不包含分隔符
 * @param content 扫码内容
 * @returns true=二维码（需要震动处理），false=一维码（静默忽略）
 */
export const isQRCode = (content: string): boolean => {
  if (!content || content.trim().length === 0) {
    return false;
  }

  const trimmed = content.trim();

  // 1. 检测括号格式分隔符（如 {字段}{字段}）
  if (detectBracketFormat(trimmed)) {
    return true;
  }

  // 2. 检测普通分隔符（/、|、,、*、#、;、制表符）
  for (const sep of SEPARATORS) {
    if (trimmed.includes(sep)) {
      return true;
    }
  }

  // 3. 检测自定义特殊分隔符（长度为2的非括号符号，如 +-、+= 等）
  // 遍历可能的左右符号组合
  const customSymbols = ['+', '-', '=', ':', '@', '!', '%', '&'];
  for (const left of customSymbols) {
    for (const right of customSymbols) {
      if (left !== right && trimmed.includes(left + right)) {
        return true;
      }
    }
  }

  // 不包含任何分隔符，判定为一维码
  return false;
};

// 检查是否为括号分隔符并返回左括号
const isBracketSeparator = (separator: string): string | null => {
  for (const leftBracket of Object.keys(BRACKET_PAIRS)) {
    if (separator === getBracketSeparator(leftBracket)) {
      return leftBracket;
    }
  }
  return null;
};

/**
 * 极海半导体物料二维码格式解析
 * 格式: 型号/批次/封装/版本号/数量/生产日期年周/追踪码/箱号
 * 示例: LX32E103VET6/S2G1F/LQFP100/811206600014/5400/2541/T712511050007/OPCG0195B05007
 */
export interface ParsedQRCode {
  model: string;        // 型号
  batch: string;        // 批次
  package: string;      // 封装
  version: string;      // 版本号
  quantity: string;     // 数量
  productionDate: string; // 生产日期年周
  traceNo: string;      // 追踪码
  sourceNo: string;     // 箱号
  rawContent: string;   // 原始内容
  fields: string[];     // 原始拆分出的所有字段
  separator: string;    // 分隔符
}

export const parseQRCode = (
  content: string,
  customSeparator?: string
): ParsedQRCode | null => {
  if (!content || content.trim().length === 0) {
    return null;
  }

  const trimmedContent = content.trim();
  
  let fields: string[] = [];
  let separator = '';
  
  // 优先检测括号格式（如 {字段}{字段} 或 (字段)(字段)）
  const bracketLeft = detectBracketFormat(trimmedContent);
  if (bracketLeft) {
    fields = splitByBracket(trimmedContent, bracketLeft);
    separator = getBracketSeparator(bracketLeft);
  } else if (customSeparator) {
    // 使用自定义分隔符
    separator = customSeparator;
    const customBracketLeft = isBracketSeparator(separator);
    if (customBracketLeft) {
      fields = splitByBracket(trimmedContent, customBracketLeft);
    } else {
      fields = splitBySeparator(trimmedContent, separator);
    }
  } else {
    // 自动检测分隔符
    const detectedSep = detectSeparator(trimmedContent);
    if (detectedSep) {
      separator = detectedSep;
      fields = splitBySeparator(trimmedContent, separator);
    } else {
      // 无法拆分，整体作为一个字段
      fields = [trimmedContent];
    }
  }

  // 初始化所有字段
  let model = '';
  let batch = '';
  let packageType = '';
  let version = '';
  let quantity = '';
  let productionDate = '';
  let traceNo = '';
  let sourceNo = '';

  // 按位置解析（极海半导体格式：8个字段用/分隔）
  if (fields.length >= 1) {
    model = fields[0]; // 型号
  }
  if (fields.length >= 2) {
    batch = fields[1]; // 批次
  }
  if (fields.length >= 3) {
    packageType = fields[2]; // 封装
  }
  if (fields.length >= 4) {
    version = fields[3]; // 版本号
  }
  if (fields.length >= 5) {
    quantity = fields[4]; // 数量
  }
  if (fields.length >= 6) {
    productionDate = fields[5]; // 生产日期年周
  }
  if (fields.length >= 7) {
    traceNo = fields[6]; // 追踪码
  }
  if (fields.length >= 8) {
    sourceNo = fields[7]; // 箱号
  }

  return {
    model,
    batch,
    package: packageType,
    version,
    quantity,
    productionDate,
    traceNo,
    sourceNo,
    rawContent: trimmedContent,
    fields,
    separator,
  };
};

// 格式化日期（兼容旧代码）
export { formatDate } from './time';
