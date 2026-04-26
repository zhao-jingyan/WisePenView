// commitlint.config.js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 可以在这里自定义规则
    'type-enum': [
      2,
      'always',
      [
        'feat', // 新功能 (Feature)
        'fix', // 修复 Bug
        'docs', // 仅修改文档 (Documentation)
        'style', // 代码格式修改，不影响逻辑 (空格, 缩进, 分号等)
        'refactor', // 代码重构 (既不修复 Bug 也不添加新功能)
        'perf', // 性能优化
        'test', // 添加或修改测试用例
        'chore', // 构建过程或辅助工具的变动 (如修改 .gitignore, package.json)
      ],
    ],
  },
};
