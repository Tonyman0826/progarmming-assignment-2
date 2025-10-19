import * as fs from 'fs'
import * as fsPromises from 'fs/promises'
import * as path from 'path'
import { splitBill, BillInput, BillOutput } from './core'

/**
 * 主程式入口點
 * @param args 命令列參數陣列
 */
export function main(args: string[]): void {
  try {
    const options = parseCommandLineArgs(args)
    
    if (fs.existsSync(options.input) && fs.statSync(options.input).isDirectory()) {
      // 批次處理模式
      processBatch(options)
    } else {
      // 單一檔案處理模式
      processSingleFile(options)
    }
  } catch (error) {
    console.error('錯誤:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

/**
 * 解析命令列參數
 */
function parseCommandLineArgs(args: string[]): {
  input: string
  output: string
  format: 'json' | 'text'
} {
  const options = {
    input: '',
    output: '',
    format: 'json' as 'json' | 'text'
  }

  for (let i = 2; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--input=')) {
      options.input = arg.slice(8)
    } else if (arg.startsWith('--output=')) {
      options.output = arg.slice(9)
    } else if (arg.startsWith('--format=')) {
      options.format = arg.slice(9) as 'json' | 'text'
    }
  }

  if (!options.input || !options.output) {
    throw new Error('必須提供 --input 和 --output 參數')
  }

  return options
}

/**
 * 處理單一檔案
 */
function processSingleFile(options: { input: string; output: string; format: 'json' | 'text' }): void {
  // 讀取輸入檔案
  const inputData = fs.readFileSync(options.input, 'utf8')
  const billInput: BillInput = JSON.parse(inputData)
  
  // 計算分帳結果
  const result = splitBill(billInput)
  
  // 寫入輸出檔案
  if (options.format === 'text') {
    const textOutput = formatAsText(result)
    fs.writeFileSync(options.output, textOutput, 'utf8')
  } else {
    fs.writeFileSync(options.output, JSON.stringify(result, null, 2), 'utf8')
  }
  
  console.log(`處理完成！結果已輸出至: ${options.output}`)
}

/**
 * 批次處理
 */
function processBatch(options: { input: string; output: string; format: 'json' | 'text' }): void {
  const files = fs.readdirSync(options.input)
  
  // 確保輸出目錄存在
  if (!fs.existsSync(options.output)) {
    fs.mkdirSync(options.output, { recursive: true })
  }
  
  files.forEach(file => {
    if (path.extname(file).toLowerCase() === '.json') {
      try {
        const inputPath = path.join(options.input, file)
        const outputFileName = path.basename(file, '.json') + '-result' + (options.format === 'text' ? '.txt' : '.json')
        const outputPath = path.join(options.output, outputFileName)
        
        processSingleFile({
          input: inputPath,
          output: outputPath,
          format: options.format
        })
      } catch (error) {
        console.error(`處理檔案 ${file} 時發生錯誤:`, error)
      }
    }
  })
}

/**
 * 格式化為文字輸出
 */
function formatAsText(result: BillOutput): string {
  let text = `===== 聚餐分帳結果 =====\n`
  text += `日期：${result.date}\n`
  text += `地點：${result.location}\n\n`
  text += `小結：$${result.subTotal.toFixed(1)}\n\n`
  text += `小費：$${result.tip.toFixed(1)}\n\n`
  text += `總金額：$${result.totalAmount.toFixed(1)}\n\n`
  text += `分帳結果：\n`
  
  result.items.forEach((item, index) => {
    text += `${index + 1}. ${item.name} 應付：$${item.amount.toFixed(1)}\n`
  })
  
  return text
}