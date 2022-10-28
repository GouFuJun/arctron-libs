import gulp from 'gulp'
import path from 'path'
import fse from 'fs-extra'
import chalk from 'chalk'
import { rollup } from 'rollup'
import {
  Extractor,
  ExtractorConfig,
} from '@microsoft/api-extractor'
import conventionalChangelog from 'conventional-changelog'
import rollupConfig from './rollup.config.js'
const { series } = gulp;


const log = {
  progress: (text) => {
    console.log(chalk.green(text))
  },
  error: (text) => {
    console.log(chalk.red(text))
  },
}

const paths = {
  root: path.join('./'),
  lib: path.join('./lib'),
}

// 删除 lib 文件
const clearLibFile = async cb => {
  fse.removeSync(paths.lib)
  log.progress('Deleted lib file')
  cb()
}

// rollup 打包
const buildByRollup = async cb => {
  const inputOptions = {
    input: rollupConfig.input,
    external: rollupConfig.external,
    plugins: rollupConfig.plugins,
  }
  const outOptions = rollupConfig.output
  let bundle

  try {
    bundle = await rollup(inputOptions)

    // 写入需要遍历输出配置
    if (Array.isArray(outOptions)) {
      outOptions.forEach(async outOption => {
        await bundle.write(outOption)
      })
    }
  } catch (e) {
    if (e instanceof Error) {
      log.error(e.message)
    }
  }

  if (bundle !== null) {
    // closes the bundle
    await bundle.close()
    cb()
    log.progress('Rollup built successfully')
  }
}

// api-extractor 整理 .d.ts 文件
const apiExtractorGenerate = async cb => {
  const apiExtractorJsonPath = path.join(
    './api-extractor.json',
  )
  // 判断是否存在 index.d.ts 文件，这里必须先等会儿，rollup 的 bundle write 是结束了，
  // 但是 ts 的 typings 编译还没结束
  const isExist = await new Promise(resolve => {
    let intervalTimes = 5
    let exitFlag = false
    const timer = setInterval(async () => {
      exitFlag = await fse.pathExists('./lib/arctron/index.d.ts')
      intervalTimes--
      if (exitFlag || intervalTimes === 0) {
        clearInterval(timer)
        resolve(exitFlag)
      }
    }, 100)
  })

  if (!isExist) {
    log.error('API Extractor not find index.d.ts')
    return
  }
  // 加载并解析 api-extractor.json 文件
  const extractorConfig =
    ExtractorConfig.loadFileAndPrepare(apiExtractorJsonPath)

  // 调用 API
  const extractorResult = Extractor.invoke(extractorConfig, {
    localBuild: true,
    // 在输出中显示信息
    showVerboseMessages: true,
  })
  
  if (extractorResult.succeeded) {
    // 删除多余的 .d.ts 文件
    const libFiles = await fse.readdir(paths.lib)
    libFiles.forEach(async file => {
      if (!file.includes('index.d.ts') && !file.endsWith('.js')) {
        await fse.remove(path.join(paths.lib, file))
      }
    })
    log.progress('API Extractor completed successfully')
    cb()
  } else {
    log.error(
      `API Extractor completed with ${extractorResult.errorCount} errors` +
        ` and ${extractorResult.warningCount} warnings`,
    )
  }
}


// 构建过程
// 1. 删除 lib 文件夹
// 2. rollup 打包
// 3. api-extractor 生成统一的声明文件, 删除多余的声明文件
// 4. 完成
export const build = series(
  clearLibFile,
  buildByRollup,
  apiExtractorGenerate,
)

// 自定义生成 changelog
export const changelog = async cb => {
  const changelogPath = path.join(paths.root, 'CHANGELOG.md')
  // 对命令 conventional-changelog -p angular -i CHANGELOG.md -w -r 0
  const changelogPipe = await conventionalChangelog({
    preset: 'angular',
    releaseCount: 0,
  })
  changelogPipe.setEncoding('utf8')

  const resultArray = ['# vue3 hooks库更新日志\n\n']
  changelogPipe.on('data', chunk => {
    // 原来的 commits 路径是进入提交列表
    chunk = chunk.replace(/\/commits\//g, '/commit/')
    resultArray.push(chunk)
  })
  changelogPipe.on('end', async () => {
    await fse.createWriteStream(changelogPath).write(resultArray.join(''))
    cb()
  })
}