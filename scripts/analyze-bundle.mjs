#!/usr/bin/env node

/**
 * 构建产物分析脚本
 * 分析打包后的文件大小和依赖关系
 */

import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const distPath = join(__dirname, '../apps/web/dist')

async function getFileSize(filePath) {
  const stats = await stat(filePath)
  return stats.size
}

async function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

async function analyzeDirectory(dirPath, prefix = '') {
  const files = await readdir(dirPath, { withFileTypes: true })
  let totalSize = 0
  const results = []

  for (const file of files) {
    const filePath = join(dirPath, file.name)
    
    if (file.isDirectory()) {
      const { size, items } = await analyzeDirectory(filePath, prefix + '  ')
      totalSize += size
      results.push({
        name: file.name + '/',
        size,
        type: 'directory',
        items
      })
    } else {
      const size = await getFileSize(filePath)
      totalSize += size
      results.push({
        name: file.name,
        size,
        type: 'file'
      })
    }
  }

  return { size: totalSize, items: results }
}

async function printResults(items, prefix = '') {
  // 按大小排序
  items.sort((a, b) => b.size - a.size)

  for (const item of items) {
    const sizeStr = await formatBytes(item.size)
    console.log(`${prefix}${item.name.padEnd(40)} ${sizeStr}`)
    
    if (item.type === 'directory' && item.items) {
      await printResults(item.items, prefix + '  ')
    }
  }
}

async function main() {
  console.log('📊 分析构建产物...\n')
  
  try {
    const { size, items } = await analyzeDirectory(distPath)
    const totalSize = await formatBytes(size)
    
    console.log(`总大小: ${totalSize}\n`)
    console.log('文件列表:\n')
    await printResults(items)
    
    console.log('\n✅ 分析完成!')
  } catch (error) {
    console.error('❌ 分析失败:', error.message)
    process.exit(1)
  }
}

main()

